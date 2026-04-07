import { icon } from '../icons.js';
import { h } from '../helpers.js';

function getStepsForAction(action) {
  const cat = (action.category || '').toLowerCase();
  switch (cat) {
    case 'budget':
      return [
        'Review your spending in this category for the current month',
        'Identify one purchase pattern you can reduce this week',
        'Re-check progress after your next transaction import',
      ];
    case 'debt':
      return [
        'Confirm your current balance and APR',
        'Decide on an extra payment amount for this month',
        'Apply it to the highest-interest balance first',
      ];
    case 'investing':
      return [
        'Review your available contribution room',
        'Decide on a contribution amount',
        'Log or make the contribution',
      ];
    case 'bills':
      return [
        'Confirm the bill amount and due date',
        'Pay or schedule the payment today',
        'Mark complete once paid or scheduled',
      ];
    case 'cashflow':
      return [
        'Review your current savings balance',
        'Set up a recurring transfer to build your buffer',
        'Track progress monthly',
      ];
    default:
      return [
        'Review the details for this action',
        'Take the recommended step today',
        'Mark complete when done',
      ];
  }
}

export function renderFocusMode(action) {
  const rationale = action.rationale || action.description || '';
  const steps = getStepsForAction(action);

  return `
    <div class="focus-mode">
      <div class="focus-mode-title">${h(action.title || 'Recommended action')}</div>
      <div class="focus-mode-subtitle">One clear next step</div>

      ${rationale ? `
      <div class="focus-mode-section">
        <div style="font-size:11px;color:var(--sub);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">Why this matters</div>
        <div style="font-size:13px;line-height:1.6">${h(rationale)}</div>
      </div>
      ` : ''}

      ${action.impact_text ? `
      <div class="focus-mode-section">
        <div style="font-size:11px;color:var(--sub);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">Expected impact</div>
        <div style="font-size:13px;line-height:1.6">${h(action.impact_text)}</div>
      </div>
      ` : ''}

      <div class="focus-mode-section">
        <div style="font-size:11px;color:var(--sub);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">Next steps</div>
        <div class="focus-mode-steps">
          ${steps.map((step, i) => `
            <div class="focus-mode-step">
              <div class="focus-mode-step-index">${i + 1}</div>
              <div style="font-size:13px;line-height:1.5;padding-top:2px">${h(step)}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="focus-mode-actions">
        <button class="btn btn-primary" data-action="complete-next-best-action" data-id="${h(action.id)}">${icon('check', 14)} Mark done</button>
        <button class="btn btn-secondary" data-action="dismiss-next-best-action" data-id="${h(action.id)}">${icon('x', 14)} Dismiss</button>
        <button class="btn btn-ghost" data-action="snooze-next-best-action" data-id="${h(action.id)}">${icon('clock', 14)} Snooze 7d</button>
      </div>
    </div>`;
}
