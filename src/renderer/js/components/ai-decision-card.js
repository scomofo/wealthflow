import { icon } from '../icons.js';
import { h } from '../helpers.js';

const WORKFLOW_LABELS = {
  tfsa_rrsp_optimizer: 'TFSA vs RRSP Optimizer',
  debt_vs_investing: 'Debt vs Investing',
  monthly_action_planner: 'Monthly Action Plan',
  affordability_check: 'Can I Afford This?',
};

const CONFIDENCE_COLORS = {
  high: 'var(--green)',
  medium: 'var(--orange, #f59e0b)',
  low: 'var(--red)',
};

const PRIORITY_COLORS = {
  high: 'var(--red)',
  medium: 'var(--orange, #f59e0b)',
  low: 'var(--blue, #6366f1)',
};

export function renderDecisionCard(result) {
  if (!result) return '';

  const label = WORKFLOW_LABELS[result.workflow_type] || result.workflow_type || 'AI Recommendation';
  const confidence = result.confidence || 'medium';
  const confidenceColor = CONFIDENCE_COLORS[confidence] || CONFIDENCE_COLORS.medium;
  const borderColor = result._fallback ? 'var(--orange, #f59e0b)' : 'var(--accent)';

  // Header
  const headerHtml = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <div style="font-weight:700;font-size:14px">${h(label)}</div>
      <span style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:10px;background:${confidenceColor}22;color:${confidenceColor};text-transform:capitalize">${h(confidence)} confidence</span>
    </div>`;

  // Summary
  const summaryHtml = result.summary
    ? `<div style="font-weight:700;font-size:14px;margin-bottom:10px">${h(result.summary)}</div>`
    : '';

  // Primary recommendation
  const primaryHtml = result.recommendation?.primary_action
    ? `<div style="background:var(--accent)14;border-left:3px solid var(--accent);padding:10px 12px;border-radius:0 6px 6px 0;margin-bottom:10px;font-size:13px">${h(result.recommendation.primary_action)}</div>`
    : '';

  // Why section
  let whyHtml = '';
  if (result.why && result.why.length > 0) {
    whyHtml = `
      <div style="margin-bottom:10px">
        <div style="font-weight:600;font-size:12px;color:var(--sub);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">Why</div>
        <ul style="margin:0;padding-left:18px">
          ${result.why.map(w => `<li style="font-size:12.5px;margin-bottom:3px">${h(w)}</li>`).join('')}
        </ul>
      </div>`;
  }

  // Tradeoffs section
  let tradeoffsHtml = '';
  if (result.tradeoffs && result.tradeoffs.length > 0) {
    tradeoffsHtml = `
      <div style="margin-bottom:10px">
        <div style="font-weight:600;font-size:12px;color:var(--sub);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">Tradeoffs</div>
        <ul style="margin:0;padding-left:18px">
          ${result.tradeoffs.map(t => `<li style="font-size:12.5px;margin-bottom:3px">${h(t)}</li>`).join('')}
        </ul>
      </div>`;
  }

  // Actions section
  const isMonthlyPlanner = result.workflow_type === 'monthly_action_planner';
  const actions = isMonthlyPlanner
    ? (result.top_actions || [])
    : (result.next_actions || []);

  let actionsHtml = '';
  if (actions.length > 0) {
    actionsHtml = `
      <div style="margin-bottom:10px">
        <div style="font-weight:600;font-size:12px;color:var(--sub);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">Actions</div>
        ${actions.map(a => {
          const priority = a.priority || 'medium';
          const pColor = PRIORITY_COLORS[priority] || PRIORITY_COLORS.medium;
          return `
          <div style="display:flex;align-items:flex-start;gap:8px;padding:7px 0;border-bottom:1px solid var(--border)">
            <div style="flex:1">
              <div style="font-size:12.5px;font-weight:500">${h(a.title || '')}</div>
              ${a.impact ? `<div style="font-size:11px;color:var(--sub);margin-top:2px">${h(a.impact)}</div>` : ''}
            </div>
            <span style="font-size:10px;font-weight:600;padding:2px 6px;border-radius:8px;background:${pColor}22;color:${pColor};white-space:nowrap;flex-shrink:0;margin-top:2px">${h(priority)}</span>
            <button class="btn btn-sm btn-secondary" style="padding:3px 8px;font-size:10.5px;flex-shrink:0"
              data-action="save-workflow-action"
              data-title="${h(a.title || '')}"
              data-type="${h(a.type || '')}"
              data-priority="${h(priority)}"
              data-workflow="${h(result.workflow_type || '')}"
              data-impact="${h(a.impact || '')}">
              ${icon('bookmark', 12)} Save
            </button>
          </div>`;
        }).join('')}
      </div>`;
  }

  // Footer
  const footerHtml = `
    <div style="display:flex;gap:8px;margin-top:10px">
      <button class="btn btn-primary" style="font-size:12px;padding:5px 12px" data-action="save-all-workflow-actions">
        ${icon('bookmark', 13)} Save All
      </button>
      <button class="btn btn-ghost" style="font-size:12px;padding:5px 12px" data-action="dismiss-workflow">
        Dismiss
      </button>
    </div>`;

  // Disclaimer
  const disclaimerHtml = result.disclaimer
    ? `<div style="font-size:10.5px;color:var(--sub);margin-top:10px;line-height:1.5">${h(result.disclaimer)}</div>`
    : '';

  return `
    <div style="border:1px solid ${borderColor};border-radius:10px;padding:14px 16px;background:var(--card,var(--bg2))">
      ${headerHtml}
      ${summaryHtml}
      ${primaryHtml}
      ${whyHtml}
      ${tradeoffsHtml}
      ${actionsHtml}
      ${footerHtml}
      ${disclaimerHtml}
    </div>`;
}
