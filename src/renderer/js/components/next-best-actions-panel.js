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
        <div class="nba-title">
          ${icon('sparkles', 18, 'var(--accent)')} Next Best Actions
        </div>
        <div class="nba-subtitle">Your highest-impact financial moves right now</div>
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
            <div class="nba-icon-shell">
              ${icon(meta.label === 'Urgent' ? 'alert-triangle' : meta.label === 'High' ? 'arrow-up-right' : 'lightbulb', 15, meta.color)}
            </div>
            <div style="min-width:0;flex:1">
              <div style="font-size:14px;font-weight:700;line-height:1.4">${h(a.title || 'Recommended action')}</div>
              ${rationale ? `<div class="nba-rationale">${h(rationale)}</div>` : ''}
              ${a.impact_text ? `<div class="nba-impact"><span class="nba-impact-label">Impact:</span> ${h(a.impact_text)}</div>` : ''}
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
