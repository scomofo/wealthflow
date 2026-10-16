import { buildSyncTrustView } from '../sync-trust.js';

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

export function renderSyncTrustPanel(status) {
  const view = buildSyncTrustView(status);
  if (!view) return '';
  const deviceRows = view.devices.map(device => `
    <li style="display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-top:1px solid var(--border)">
      <span><strong>${escapeHtml(device.name)}</strong>${device.isLocal ? ' · this computer' : ''}${device.stale ? ' · stale' : ''}</span>
      <span style="color:var(--sub)">${escapeHtml(device.lastSyncAt || 'Never synced')}</span>
    </li>`).join('');
  return `
    <div class="card" data-sync-trust>
      <div style="font-weight:600;font-size:14px">Cloud sync trust & privacy</div>
      <div style="font-size:11px;color:var(--sub);line-height:1.5;margin-top:6px">
        ${view.enabled ? 'Sync is configured.' : 'Sync is not active yet.'}
        ${view.endpointHost ? ` Encrypted packages are sent to <strong>${escapeHtml(view.endpointHost)}</strong>.` : ''}
      </div>
      <dl style="display:grid;grid-template-columns:auto 1fr;gap:6px 12px;margin-top:12px;font-size:11px">
        <dt>Encryption</dt><dd>${escapeHtml(view.encryption)}</dd>
        <dt>Last success</dt><dd>${escapeHtml(view.lastSuccessAt || 'Never')}</dd>
        <dt>Pending upload</dt><dd>${view.pending ? 'Yes' : 'No'}</dd>
        <dt>Conflict</dt><dd>${view.conflict ? 'Needs explicit resolution' : 'No unresolved conflict'}</dd>
      </dl>
      <details style="margin-top:12px"><summary>What syncs</summary><ul>${view.syncedItems.map(item=>`<li>${escapeHtml(item)}</li>`).join('')}</ul></details>
      <details style="margin-top:8px"><summary>What stays on this device</summary><ul>${view.localOnlyItems.map(item=>`<li>${escapeHtml(item)}</li>`).join('')}</ul></details>
      ${deviceRows ? `<div style="margin-top:12px;font-size:11px"><strong>Devices</strong><ul style="list-style:none;padding:0;margin:6px 0 0">${deviceRows}</ul></div>` : ''}
      <p style="font-size:10px;color:var(--sub);line-height:1.5;margin-top:10px">Manual JSON backup remains an independent recovery path. Divergent financial histories are never silently merged.</p>
    </div>`;
}
