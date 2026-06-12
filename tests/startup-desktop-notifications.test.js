/* global __dirname */

const fs = require('fs');
const path = require('path');

function readRepoFile(...parts) {
  return fs.readFileSync(path.join(__dirname, '..', ...parts), 'utf8');
}

describe('startup proactive desktop notifications wiring', () => {
  test('renderer startup calls proactive desktop notification API instead of bills-only notification', () => {
    const appSource = readRepoFile('src', 'renderer', 'js', 'app.js');

    expect(appSource).toContain('sendProactiveDesktopNotification');
    expect(appSource).not.toContain(
      'getBillsDueSoon(state.settings?.bill_notify_days || 3)'
    );
    expect(appSource).not.toContain("showNotification('Bills Due Soon'");
  });

  test('preload exposes proactive desktop notification IPC method', () => {
    const preloadSource = readRepoFile('src', 'main', 'preload.js');

    expect(preloadSource).toContain('sendProactiveDesktopNotification');
    expect(preloadSource).toContain(
      "ipcRenderer.invoke('notifications:send-proactive-desktop')"
    );
  });

  test('main IPC registers proactive desktop notification handler', () => {
    const ipcSource = readRepoFile('src', 'main', 'ipc-handlers.js');

    expect(ipcSource).toContain("require('./desktop-notification-engine')");
    expect(ipcSource).toContain(
      "safeHandle('notifications:send-proactive-desktop'"
    );
  });
});
