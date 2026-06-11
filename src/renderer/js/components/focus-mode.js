import { icon } from '../icons.js';
import { h } from '../helpers.js';
import { getFocusStepsForAction } from '../utils/focus-steps.js';
import { buildActionBecause } from '../utils/action-reasoning.js';

export function renderFocusMode(action, personalizationProfile = {}, options = {}) {
  const rationale = action.rationale || action.description || '';
  const steps = getFocusStepsForAction(action, personalizationProfile);
  const completionFeedback = options.completionFeedback || null;
  const nextAction = options.nextAction || null;
  const because = options.because || buildActionBecause(action, options.financials || {});

  return `
    <div class="focus-mode">
      <div class="focus-mode-eyebrow">Focus Mode</div>
      <div style="display:flex;align-items:center;gap:10px">
        <div class="focus-mode-title">${h(action.title || 'Recommended action')}</div>
        <span class="priority-pill priority-${(action.priority || 'medium').toLowerCase()}">${action.priority || 'Medium'}</span>
      </div>
      <div class="focus-mode-subtitle">One clear next step</div>

      ${because ? `
      <div class="focus-mode-reason">
        <div class="focus-mode-reason-label">Because</div>
        <div>${h(because.replace(/^Because\s+/i, ''))}</div>
      </div>
      ` : ''}

      ${completionFeedback ? `
      <div class="focus-mode-complete">
        <div class="focus-mode-complete-title">${icon('check-circle', 16)} ${h(completionFeedback.message)}</div>
        ${completionFeedback.detail ? `<div class="focus-mode-complete-detail">${h(completionFeedback.detail)}</div>` : ''}
        ${nextAction ? `
          <button class="btn btn-primary btn-sm" data-action="open-focus-mode" data-id="${h(nextAction.id)}">
            ${icon('target', 12)} Focus next: ${h(nextAction.title || 'Next action')}
          </button>
        ` : ''}
      </div>
      ` : ''}

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
        <div style="font-size:12px;font-weight:700;color:var(--text);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">Next steps</div>
        <div class="focus-mode-steps">
          ${steps.map((step, i) => `
            <div class="focus-mode-step">
              <div class="focus-mode-step-index">${i + 1}</div>
              <div style="font-size:13px;line-height:1.5;padding-top:2px">${h(step)}</div>
            </div>
          `).join('')}
        </div>
      </div>

      ${!completionFeedback ? `
      <div class="focus-mode-actions">
        <button class="btn btn-primary" data-action="complete-next-best-action" data-id="${h(action.id)}">${icon('check', 14)} Mark done</button>
        <button class="btn btn-secondary" data-action="dismiss-next-best-action" data-id="${h(action.id)}">${icon('x', 14)} Dismiss</button>
        <button class="btn btn-ghost" data-action="snooze-next-best-action" data-id="${h(action.id)}">${icon('clock', 14)} Snooze 7d</button>
      </div>
      ` : ''}
      <button class="btn btn-ghost btn-sm" data-action="close-modal" style="margin-top:8px">${icon('arrow-left', 12)} Back to dashboard</button>
    </div>`;
}
