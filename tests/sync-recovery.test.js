const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadRecoveryModule() {
  const sourcePath = path.join(__dirname, '../src/renderer/js/sync-recovery.js');
  let source = fs.readFileSync(sourcePath, 'utf8');
  source = source
    .replace(/export const /g, 'const ')
    .replace(/export function /g, 'function ');
  source += '\nmodule.exports = { SYNC_RECOVERY_STATES, buildSyncRecoveryView, allowedSyncRecoveryActions };';

  const module = { exports: {} };
  vm.runInNewContext(source, { module, exports: module.exports });
  return module.exports;
}

const {
  SYNC_RECOVERY_STATES,
  buildSyncRecoveryView,
  allowedSyncRecoveryActions,
} = loadRecoveryModule();

describe('sync recovery view model', () => {
  test('conflict requires explicit resolution and inspection', () => {
    const view = buildSyncRecoveryView({
      state: SYNC_RECOVERY_STATES.CONFLICT,
      previousAvailable: true,
    });

    expect(view.title).toBe('Both copies changed');
    expect(view.summary).toMatch(/will not choose a winner automatically/i);
    expect(Array.from(allowedSyncRecoveryActions(view))).toEqual([
      'sync-resolve-conflict',
      'sync-inspect',
      'sync-restore-previous',
    ]);
  });

  test('remote-newer requires inspection before restore', () => {
    const view = buildSyncRecoveryView({ state: SYNC_RECOVERY_STATES.REMOTE_NEWER });
    expect(view.primaryAction.id).toBe('sync-download-reviewed');
    expect(view.primaryAction.label).toMatch(/inspect/i);
  });

  test('local-newer makes upload a reviewed action', () => {
    const view = buildSyncRecoveryView({ state: SYNC_RECOVERY_STATES.LOCAL_NEWER });
    expect(view.primaryAction.id).toBe('sync-upload-reviewed');
    expect(view.primaryAction.label).toMatch(/review/i);
  });

  test('same state has no destructive primary action', () => {
    const view = buildSyncRecoveryView({ state: SYNC_RECOVERY_STATES.SAME });
    expect(view.primaryAction).toBeNull();
    expect(Array.from(allowedSyncRecoveryActions(view))).toEqual(['sync-inspect']);
  });

  test('absent sync state renders no view model', () => {
    expect(buildSyncRecoveryView(null)).toBeNull();
  });
});
