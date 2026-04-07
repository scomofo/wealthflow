import { icon } from '../icons.js';
import { h } from '../helpers.js';

function priorityMeta(priority) {
  switch ((priority || '').toLowerCase()) {
    case 'urgent': return { label: 'Urgent', color: 'var(--red)', bg: 'rgba(184,72,72,.08)' };
    case 'high': return { label: 'High', color: 'var(--orange)', bg: 'rgba(192,138,64,.10)' };
    case 'medium': return { label: 'Medium', color: 'var(--accent)', bg: 'var(--abg)' };
    default: return { label: 'Low', color: 'var(--sub)', bg: 'var(--input)' };
  }
}

export function renderNextBestActionsPanel(actions = [], options = {}) {
  const { loading = false, stale = false } = options;
  const visible = (actions || []).slice(0, 3);

  const header = `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px">
      <div>
        <div style="display:flex;align-items:center;gap:8px;font-weight:700;font-size:18px;letter-spacing:-.3px">
          ${icon('sparkles', 18, 'var(--accent)')} Next Best Actions
        </div>
        <div style="margin-top:4px;font-size:12px;color:var(--sub)">Your highest-impact financial moves right now</div>
      </div>
      <button class="btn btn-secondary btn-sm" data-action="generate-next-best-actions" ${loading ? 'disabled' : ''}>
        ${loading ? `${icon('loader', 13)} Refreshing...` : `${icon('refresh-cw', 13)} Refresh`}
      </button>
    </div>`;

  if (!visible.length) {
    return `<section class="card" style="padding:22px">
      ${header}
      <div class="empty" style="padding:26px 10px 18px">
        You’re in good shape right now — no urgent actions found.
        <div style="margin-top:10px">
          <button class="btn btn-primary btn-sm" data-action="generate-next-best-actions">${icon('refresh-cw', 12)} Refresh actions</button>
        </div>
      </div>
    </section>`;
  }

  const cards = visible.map(a => {
    const meta = priorityMeta(a.priority);
    const rationale = a.rationale || a.description || '';
    return `
      <div class="card action-card" style="margin-bottom:10px">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:8px">
          <div style="display:flex;align-items:flex-start;gap:10px;min-width:0;flex:1">
            <div style="width:34px;height:34px;border-radius:4px;background:var(--card);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;flex-shrink:0">
              ${icon(meta.label === 'Urgent' ? 'alert-triangle' : meta.label === 'High' ? 'arrow-up-right' : 'lightbulb', 15, meta.color)}
            </div>
            <div style="min-width:0;flex:1">
              <div style="font-size:14px;font-weight:700;line-height:1.4">${h(a.title || 'Recommended action')}</div>
              ${rationale ? `<div style="font-size:12px;color:var(--sub);line-height:1.55;margin-top:5px">${h(rationale)}</div>` : ''}
              ${a.impact_text ? `<div style="font-size:11px;color:var(--text);margin-top:7px"><span style="color:var(--sub)">Impact:</span> ${h(a.impact_text)}</div>` : ''}
            </div>
          </div>
          <span class="priority-pill priority-${(a.priority || 'low').toLowerCase()}">${meta.label}</span>
        </div>
        <div class="action-buttons">
          <button class="btn btn-primary btn-sm" data-action="complete-next-best-action" data-id="${h(a.id || '')}">${icon('check', 12)} Mark done</button>
          <button class="btn btn-secondary btn-sm" data-action="dismiss-next-best-action" data-id="${h(a.id || '')}">${icon('x', 12)} Dismiss</button>
          <button class="btn btn-ghost btn-sm" data-action="snooze-next-best-action" data-id="${h(a.id || '')}">${icon('clock', 12)} Snooze 7d</button>
        </div>
      </div>`;
  }).join('');

  return `<section class="card" style="padding:22px;background:linear-gradient(150deg,var(--abg),transparent)">
    ${header}
    ${stale ? `<div style="margin:-4px 0 10px;font-size:11px;color:var(--sub)">These actions may be out of date. Refresh for the latest recommendations.</div>` : ''}
    ${cards}
    ${actions.length > 3 ? `<div style="margin-top:8px;font-size:11px;color:var(--sub)">Showing top 3 of ${actions.length} open actions</div>` : ''}
  </section>`;
}
