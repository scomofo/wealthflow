import { icon } from '../icons.js';
import { h } from '../helpers.js';

const WORKFLOW_LABELS = {
  tfsa_rrsp_optimizer: 'TFSA vs RRSP Optimizer',
  debt_vs_investing: 'Debt vs Investing',
  monthly_action_planner: 'Monthly Action Plan',
  affordability_check: 'Can I Afford This?',
};

export function renderDashboardActionList(actions = []) {
  const items = (actions || []).filter(a => !a.deleted_at && a.status !== 'completed').slice(0, 5);

  return `
    <div class="card">
      <div style="margin-bottom:12px">
        <div style="font-weight:600;font-size:14px">Your Plan</div>
        <div class="dashboard-subtitle">Saved actions you're working through</div>
      </div>
      ${items.length === 0 ? `
        <div class="empty">No saved actions yet.<br><span style="font-size:11px;color:var(--sub)">Save actions from AI workflows or Next Best Actions to build your plan.</span></div>
      ` : items.map(a => {
        const workflowLabel = WORKFLOW_LABELS[a.workflow_type] || a.workflow_type || '';
        return `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${h(a.title)}</div>
            <div class="action-meta">${a.impact_text ? h(a.impact_text) : ''}${workflowLabel ? ` · ${h(workflowLabel)}` : ''}</div>
          </div>
          <button class="btn btn-sm btn-secondary" style="padding:3px 8px;font-size:10.5px;flex-shrink:0" data-action="complete-action" data-id="${h(a.id)}">${icon('check', 12)}</button>
          <button class="btn btn-sm btn-ghost saved-action-delete" style="padding:3px 8px;font-size:10.5px;flex-shrink:0" data-action="delete-action" data-id="${h(a.id)}">${icon('trash-2', 12)}</button>
        </div>`;
      }).join('')}
    </div>`;
}
