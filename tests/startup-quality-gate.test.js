const fs = require('fs');
const path = require('path');

function readRepoFile(...parts) {
  return fs.readFileSync(path.join(__dirname, '..', ...parts), 'utf8');
}

describe('startup performance quality gate', () => {
  test('renders useful UI before background intelligence refresh', () => {
    const source = readRepoFile('src', 'renderer', 'js', 'app.js');
    const firstRender = source.indexOf("await render();\n  logPerformance('startup:first-useful-render'");
    const maintenance = source.indexOf('await Promise.allSettled([');
    const intelligence = source.indexOf("await State.refreshCommandCenterIntelligence('manual')");

    expect(firstRender).toBeGreaterThan(-1);
    expect(maintenance).toBeGreaterThan(firstRender);
    expect(intelligence).toBeGreaterThan(maintenance);
    expect(source).toContain('renderStartupShell();');
  });

  test('prevents stale async renders and awaits chart initialization', () => {
    const source = readRepoFile('src', 'renderer', 'js', 'app.js');
    expect(source).toContain('const renderToken = ++_renderSequence;');
    expect(source).toContain('if (renderToken !== _renderSequence) return;');
    expect(source).toContain('await initCharts(state, F)');
    expect(source).toContain("logPerformance(`render:${section}`");
  });
});

describe('baseline accessibility quality gate', () => {
  test('provides skip navigation, route focus, dialog trapping, and AI semantics', () => {
    const app = readRepoFile('src', 'renderer', 'js', 'app.js');
    const panel = readRepoFile('src', 'renderer', 'js', 'components', 'ai-panel.js');
    const css = readRepoFile('src', 'renderer', 'styles', 'main.css');

    expect(app).toContain('class="skip-link" href="#page"');
    expect(app).toContain('id="page" tabindex="-1"');
    expect(app).toContain('trapModalTab(e)');
    expect(app).toContain('aria-controls="ai-advisor-panel"');
    expect(panel).toContain('id="ai-advisor-panel" role="complementary"');
    expect(panel).toContain('aria-live="polite"');
    expect(css).toContain('.skip-link:focus');
  });

  test('sidebar exposes navigation and disclosure state', () => {
    const sidebar = readRepoFile('src', 'renderer', 'js', 'components', 'sidebar.js');
    expect(sidebar).toContain('aria-label="Primary navigation"');
    expect(sidebar).toContain('aria-expanded=');
    expect(sidebar).toContain('aria-controls="nav-group-');
    expect(sidebar).toContain("sideOpen ? 'Collapse sidebar' : 'Expand sidebar'");
  });
});


describe('next-best-action read consistency', () => {
  test('normal list IPC uses the engine ranking instead of raw database order', () => {
    const ipc = readRepoFile('src', 'main', 'ipc-handlers.js');
    expect(ipc).toContain("safeHandle('actions:list-next-best', () => nbaEngine.listOpenActions())");
    expect(ipc).not.toContain("safeHandle('actions:list-next-best', () => database.listNextBestActions('open'))");
  });
});
