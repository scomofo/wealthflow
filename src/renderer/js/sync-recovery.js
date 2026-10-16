export const SYNC_RECOVERY_STATES = Object.freeze({
  SAME: 'same',
  LOCAL_NEWER: 'local-newer',
  REMOTE_NEWER: 'remote-newer',
  CONFLICT: 'conflict',
});

export function buildSyncRecoveryView(status) {
  if (!status || typeof status !== 'object') return null;
  const state = status.state;
  const common = {
    lastLocal: status.lastLocal || null,
    lastRemote: status.lastRemote || null,
    canInspect: true,
    canRestorePrevious: Boolean(status.previousAvailable),
  };

  if (state === SYNC_RECOVERY_STATES.SAME) {
    return {
      ...common,
      state,
      tone: 'ok',
      title: 'Up to date',
      summary: 'This computer and the cloud copy match.',
      primaryAction: null,
    };
  }
  if (state === SYNC_RECOVERY_STATES.LOCAL_NEWER) {
    return {
      ...common,
      state,
      tone: 'info',
      title: 'This computer has newer changes',
      summary: 'Review the pending upload before replacing the cloud copy.',
      primaryAction: { id: 'sync-upload-reviewed', label: 'Review and upload' },
    };
  }
  if (state === SYNC_RECOVERY_STATES.REMOTE_NEWER) {
    return {
      ...common,
      state,
      tone: 'info',
      title: 'Cloud copy has newer changes',
      summary: 'Inspect the cloud snapshot before replacing data on this computer.',
      primaryAction: { id: 'sync-download-reviewed', label: 'Inspect before restoring' },
    };
  }
  if (state === SYNC_RECOVERY_STATES.CONFLICT) {
    return {
      ...common,
      state,
      tone: 'warning',
      title: 'Both copies changed',
      summary: 'WealthFlow will not choose a winner automatically. Inspect both snapshots and explicitly choose what to keep.',
      primaryAction: { id: 'sync-resolve-conflict', label: 'Resolve conflict' },
    };
  }
  throw new Error(`Unknown sync recovery state: ${state}`);
}

export function allowedSyncRecoveryActions(view) {
  if (!view) return [];
  const actions = ['sync-inspect'];
  if (view.primaryAction) actions.unshift(view.primaryAction.id);
  if (view.canRestorePrevious) actions.push('sync-restore-previous');
  return actions;
}
