import { icon } from '../icons.js';
import { h } from '../helpers.js';

export function renderDashboardActionList(actions = []) {
  const items = (actions || []).slice(0, 5);

  return `
    <div class="card">
      <div style="display:flex;justify-content:space-between;margin-bottom:12px">
        <span style="font-weight:600;font-size:14px">Your Plan</span>
      </div>
      ${items.length === 0 ? `
        <div class="empty">No saved actions yet</div>
      ` : items.map(a => `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
          <div style="flex:1">
            <div style="font-size:12px;font-weight:600">${h(a.title)}</div>
            ${a.impact_text ? `<div style="font-size:10px;color:var(--sub)">${h(a.impact_text)}</div>` : ''}
          </div>
          <button class="btn btn-ghost btn-sm" data-action="complete-ai-action" data-id="${h(a.id)}">${icon('check', 12)}</button>
          <button class="btn btn-ghost btn-sm" data-action="delete-ai-action" data-id="${h(a.id)}">${icon('trash', 12)}</button>
        </div>
      `).join('')}
    </div>`;
}
