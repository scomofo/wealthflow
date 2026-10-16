const {
  SYNC_RECOVERY_STATES,
  buildSyncRecoveryView,
  allowedSyncRecoveryActions,
} = require('../src/renderer/js/sync-recovery.js');

describe('sync recovery view model', () => {
  test('conflict requires explicit resolution and inspection', () => {
    const view = buildSyncRecoveryView({
      state: SYNC_RECOVERY_STATES.CONFLICT,
      previousAvailable: true,
    });

    expect(view.title).toBe('Both copies changed');
    expect(view.summary).toMatch(/will not choose a winner automatically/i);
    expect(allowedSyncRecoveryActions(view)).toEqual([
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
    expect(allowedSyncRecoveryActions(view)).toEqual(['sync-inspect']);
  });

  test('absent sync state renders no view model', () => {
    expect(buildSyncRecoveryView(null)).toBeNull();
  });
});
