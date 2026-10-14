// Native Electron component acceptance: real header/sidebar modules and CSS,
// isolated from financial data and the production single-instance lock.
const { app, BrowserWindow } = require('electron');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'wealthflow-header-profile-'));
const output = process.env.HEADER_QA_OUTPUT || fs.mkdtempSync(path.join(os.tmpdir(), 'wealthflow-header-qa-'));
app.setPath('userData', profile);
app.disableHardwareAcceleration();
fs.mkdirSync(output, { recursive: true });
const deadline = setTimeout(() => { console.error('Header acceptance timed out'); app.exit(1); }, 60000);
let win;

async function waitFor(expression) {
  const end = Date.now() + 10000;
  while (Date.now() < end) {
    if (await win.webContents.executeJavaScript(expression)) return;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error('Timed out waiting for: ' + expression);
}

app.whenReady().then(async () => {
  win = new BrowserWindow({
    width: 1400, height: 900, minWidth: 1024, minHeight: 700,
    titleBarStyle: 'hidden', titleBarOverlay: { height: 36, color: '#0b0c11', symbolColor: '#76757a' },
    webPreferences: { contextIsolation: true, nodeIntegration: false, backgroundThrottling: false },
  });
  await win.loadFile(path.join(__dirname, '../tests/fixtures/header-layout.html'));
  await waitFor('window.headerFixtureReady === true');
  if (process.env.HEADER_QA_CSS) {
    const baseline = fs.readFileSync(process.env.HEADER_QA_CSS, 'utf8');
    await win.webContents.executeJavaScript(`document.getElementById('main-styles').remove(); const style = document.createElement('style'); style.textContent = ${JSON.stringify(baseline)}; document.head.append(style);`);
  }
  const longName = 'A very long profile name '.repeat(12);
  const cases = [
    { name: 'minimum-dark', width: 1024, height: 700, zoom: 1, light: false, sideOpen: true, userName: 'Scott Morley' },
    { name: 'desktop-light', width: 1400, height: 900, zoom: 1, light: true, sideOpen: true, userName: 'Scott Morley' },
    { name: 'minimum-long-name', width: 1024, height: 700, zoom: 1, light: true, sideOpen: true, userName: longName },
    { name: 'zoom-in-collapsed', width: 1024, height: 700, zoom: 1.25, light: false, sideOpen: false, userName: longName },
    { name: 'zoom-out-expanded', width: 1400, height: 900, zoom: 0.8, light: false, sideOpen: true, userName: longName },
  ];
  if (process.platform === 'win32') cases.push({ ...cases[1], name: 'maximized', maximize: true });
  const results = [];
  for (const scenario of cases) {
    if (win.isMaximized()) win.unmaximize();
    win.setSize(scenario.width, scenario.height);
    if (scenario.maximize) win.maximize();
    win.webContents.setZoomFactor(scenario.zoom);
    await win.webContents.executeJavaScript(`window.renderHeaderFixture(${JSON.stringify(scenario)})`);
    // BrowserWindow sizing and overlay geometry reach the renderer
    // asynchronously. Wait for the requested viewport before measuring it.
    const width = win.getContentSize()[0] / scenario.zoom;
    await waitFor(`Math.abs(innerWidth - ${width}) <= 1 && navigator.windowControlsOverlay.getTitlebarAreaRect().right < innerWidth`);
    await new Promise(resolve => setTimeout(resolve, 50));
    await win.webContents.executeJavaScript('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
    const geometry = await win.webContents.executeJavaScript(`(() => {
      const rect = selector => document.querySelector(selector).getBoundingClientRect().toJSON();
      return {
        viewport: innerWidth, overlay: navigator.windowControlsOverlay?.getTitlebarAreaRect().toJSON(),
        visible: navigator.windowControlsOverlay?.visible,
        actions: rect('.header-right'), title: rect('.header h1'), avatar: rect('.avatar'),
        theme: rect('.header-right [data-action="toggle-theme"]'), settings: rect('.header-right [data-nav="settings"]'),
        nameWidth: rect('.avatar-name').width,
        hitTargets: [...document.querySelectorAll('.header-right button')].map(button => {
          const box = button.getBoundingClientRect();
          return document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)?.closest('button') === button;
        }),
      };
    })()`);
    assert.equal(geometry.visible, true, scenario.name + ': native overlay must be active');
    assert.ok(geometry.overlay.width > 0 && geometry.overlay.height > 0, scenario.name + ': overlay rectangle is available');
    assert.ok(geometry.actions.right <= geometry.overlay.right - 23, scenario.name + ': app controls overlap native caption buttons');
    assert.ok(geometry.theme.right <= geometry.settings.left, scenario.name + ': theme/settings overlap');
    assert.ok(geometry.settings.right <= geometry.avatar.left, scenario.name + ': settings/profile overlap');
    assert.ok(geometry.title.right <= geometry.actions.left - 11, scenario.name + ': heading/actions overlap');
    assert.ok(geometry.nameWidth <= 160.5, scenario.name + ': long profile name is unbounded');
    assert.deepEqual(geometry.hitTargets, [true, true], scenario.name + ': button hit targets are blocked');
    // Native input is available on the Windows CI desktop. Linux's headless
    // surface is used for rectangle/hit-test acceptance only.
    if (process.platform === 'win32' && scenario.zoom === 1) {
      win.focus();
      for (const [control, expected] of [['theme', 'toggle-theme'], ['settings', 'settings']]) {
        const box = geometry[control];
        const point = { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2), button: 'left', clickCount: 1 };
        win.webContents.sendInputEvent({ type: 'mouseMove', x: point.x, y: point.y });
        await win.webContents.executeJavaScript('new Promise(requestAnimationFrame)');
        win.webContents.sendInputEvent({ type: 'mouseDown', ...point });
        win.webContents.sendInputEvent({ type: 'mouseUp', ...point });
        await waitFor(`window.headerClicks.at(-1) === ${JSON.stringify(expected)}`);
      }
    }
    const screenshot = await win.webContents.capturePage();
    fs.writeFileSync(path.join(output, scenario.name + '.png'), screenshot.toPNG());
    results.push({ scenario: scenario.name, zoom: scenario.zoom, geometry });
    console.log('PASS ' + scenario.name);
  }
  if (process.platform === 'win32') {
    const entered = new Promise(resolve => win.once('enter-full-screen', resolve));
    win.setFullScreen(true);
    await entered;
    const width = win.getContentSize()[0] / win.webContents.getZoomFactor();
    await waitFor(`Math.abs(innerWidth - ${width}) <= 1`);
    await new Promise(resolve => setTimeout(resolve, 100));
    await win.webContents.executeJavaScript('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
    const fullscreen = await win.webContents.executeJavaScript(`(() => {
      const overlay = navigator.windowControlsOverlay;
      const area = overlay.getTitlebarAreaRect();
      return { viewport:innerWidth, right:document.querySelector('.header-right').getBoundingClientRect().right,
        overlay:area.toJSON(), visible:overlay.visible, inset:document.documentElement.classList.contains('has-window-controls-overlay') };
    })()`);
    const active = fullscreen.visible && fullscreen.overlay.width > 0 && fullscreen.overlay.height > 0;
    assert.equal(fullscreen.inset, active, 'fullscreen: caption inset must follow the reported native area');
    const edge = active ? fullscreen.overlay.right : fullscreen.viewport;
    assert.ok(Math.abs(edge - fullscreen.right - 24) <= 1, 'fullscreen: header does not follow native caption geometry');
    fs.writeFileSync(path.join(output, 'fullscreen.png'), (await win.webContents.capturePage()).toPNG());
    results.push({ scenario: 'fullscreen', geometry: fullscreen });
    console.log('PASS fullscreen');
  }
  fs.writeFileSync(path.join(output, 'geometry.json'), JSON.stringify(results, null, 2));
  clearTimeout(deadline);
  win.destroy();
  app.quit();
}).catch(error => {
  console.error(error.stack || error);
  clearTimeout(deadline);
  if (win && !win.isDestroyed()) win.destroy();
  app.exit(1);
});
app.on('will-quit', () => {
  try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 50 }); }
  catch { /* Windows can retain Chromium profile handles until process exit. */ }
});
