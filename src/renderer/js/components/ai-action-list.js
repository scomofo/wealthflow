import { icon } from '../icons.js';
import { h } from '../helpers.js';

const WORKFLOW_LABELS = {
  tfsa_rrsp_optimizer: 'TFSA vs RRSP Optimizer',
  debt_vs_investing: 'Debt vs Investing',
  monthly_action_planner: 'Monthly Action Plan',
};

const PRIORITY_COLORS = {
  high: 'var(--red)',
  medium: 'var(--orange, #f59e0b)',
  low: 'var(--blue, #6366f1)',
};

export function renderActionList(actions) {
  const allActions = (actions || []).filter(a => !a.deleted_at);
  const pending = allActions.filter(a => a.status !== 'completed');
  const completed = allActions.filter(a => a.status === 'completed').slice(-5);

  let bodyHtml = '';

  if (pending.length === 0 && completed.length === 0) {
    bodyHtml = `<div style="color:var(--sub);font-size:13px;padding:12px 0">No saved recommendations yet.</div>`;
  } else {
    if (pending.length > 0) {
      bodyHtml += pending.map(a => {
        const priority = a.priority || 'medium';
        const pColor = PRIORITY_COLORS[priority] || PRIORITY_COLORS.medium;
        const workflowLabel = WORKFLOW_LABELS[a.workflow_type] || a.workflow_type || '';
        return `
        <div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border)">
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${h(a.title || '')}</div>
            <div style="font-size:10px;color:var(--sub);margin-top:1px">${h(workflowLabel)}</div>
          </div>
          <span style="font-size:10px;font-weight:600;padding:2px 6px;border-radius:8px;background:${pColor}22;color:${pColor};white-space:nowrap;flex-shrink:0">${h(priority)}</span>
          <button class="btn btn-sm btn-secondary" style="padding:3px 8px;font-size:10.5px;flex-shrink:0"
            data-action="complete-action" data-id="${h(a.id)}">
            ${icon('check', 12)}
          </button>
          <button class="btn btn-sm btn-ghost" style="padding:3px 8px;font-size:10.5px;flex-shrink:0;color:var(--red)"
            data-action="delete-action" data-id="${h(a.id)}">
            ${icon('trash-2', 12)}
          </button>
        </div>`;
      }).join('');
    }

    if (completed.length > 0) {
      bodyHtml += `<div style="font-size:11px;color:var(--sub);text-transform:uppercase;letter-spacing:0.5px;margin-top:10px;margin-bottom:6px">Recently Completed</div>`;
      bodyHtml += completed.map(a => `
        <div style="display:flex;align-items:center;gap:8px;padding:5px 0;opacity:0.55">
          ${icon('check-circle', 14, 'var(--green)')}
          <span style="font-size:12.5px;text-decoration:line-through;color:var(--sub)">${h(a.title || '')}</span>
        </div>`).join('');
    }
  }

  return `
    <div class="card" style="margin-top:14px">
      <div style="font-weight:700;font-size:14px;margin-bottom:10px">Saved Recommendations</div>
      ${bodyHtml}
    </div>`;
}
