import { h } from '../helpers.js';
import { icon } from '../icons.js';
import { buildSyncRecoveryView, allowedSyncRecoveryActions } from '../sync-recovery.js';

export function renderSyncRecoveryPanel(status) {
  const view = buildSyncRecoveryView(status);
  if (!view) return '';

  const actions = allowedSyncRecoveryActions(view);
  const toneColor = view.tone === 'warning' ? 'var(--amber)' : view.tone === 'ok' ? 'var(--green)' : 'var(--accent)';
  const when = (value) => value ? h(value) : 'Not available yet';

  return `
    <div class="card" data-sync-recovery-state="${h(view.state)}">
      <div style="font-weight:600;font-size:14px;margin-bottom:4px;display:flex;align-items:center;gap:6px">
        ${icon(view.tone === 'warning' ? 'alert-triangle' : view.tone === 'ok' ? 'check-circle' : 'refresh-cw', 16, toneColor)}
        Sync & recovery
      </div>
      <div style="font-size:12px;font-weight:600;color:${toneColor};margin-top:10px">${h(view.title)}</div>
      <div style="font-size:11px;color:var(--sub);line-height:1.5;margin-top:4px">${h(view.summary)}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px">
        <div style="border:1px solid var(--border);border-radius:8px;padding:9px">
          <div class="input-label">This computer</div>
          <div style="font-size:11px;color:var(--sub)">${when(view.lastLocal)}</div>
        </div>
        <div style="border:1px solid var(--border);border-radius:8px;padding:9px">
          <div class="input-label">Cloud copy</div>
          <div style="font-size:11px;color:var(--sub)">${when(view.lastRemote)}</div>
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
        ${view.primaryAction ? `<button class="btn btn-primary" data-action="${h(view.primaryAction.id)}">${h(view.primaryAction.label)}</button>` : ''}
        ${actions.includes('sync-inspect') ? '<button class="btn btn-secondary" data-action="sync-inspect">Inspect snapshots</button>' : ''}
        ${actions.includes('sync-restore-previous') ? '<button class="btn btn-secondary" data-action="sync-restore-previous">Restore previous version</button>' : ''}
      </div>
      <div style="font-size:10px;color:var(--sub);line-height:1.5;margin-top:10px">
        WealthFlow never silently merges or replaces divergent financial histories.
      </div>
    </div>`;
}
