import { icon } from '../icons.js';
import { h } from '../helpers.js';

const FALLBACK_MESSAGE = 'Your finances are steady right now — no major changes need attention.';
const NEW_USER_MESSAGE = 'Add your financial details to see what matters most';

export function renderAISummary(summary, options = {}) {
  if (!summary || !summary.headline) {
    const msg = options.isNewUser ? NEW_USER_MESSAGE : FALLBACK_MESSAGE;
    return `
    <div class="card ai-summary dashboard-section">
      <div class="ai-summary-header">
        ${icon('sparkles', 14, 'var(--accent)')}
        <span class="ai-summary-label">AI Summary</span>
      </div>
      <div class="ai-summary-headline">${h(msg)}</div>
    </div>`;
  }

  const confidenceColor = summary.confidence === 'high' ? 'var(--green)'
    : summary.confidence === 'medium' ? 'var(--accent)' : 'var(--sub)';

  const confidenceLabel = summary.confidence === 'high' ? 'High confidence'
    : summary.confidence === 'medium' ? 'Medium confidence' : 'Low confidence';

  return `
    <div class="card ai-summary dashboard-section">
      <div class="ai-summary-header">
        ${icon('sparkles', 14, 'var(--accent)')}
        <span class="ai-summary-label">AI Summary</span>
        <span class="priority-pill ai-summary-confidence" style="background:${confidenceColor}18;color:${confidenceColor}">${confidenceLabel}</span>
      </div>
      <div style="font-size:10px;color:var(--muted);margin-bottom:8px">Based on your top actions</div>
      <div class="ai-summary-headline">${h(summary.headline)}</div>
      ${summary.bullets && summary.bullets.length > 0 ? `
        <ul class="ai-summary-bullets">
          ${summary.bullets.map(b => '<li>' + h(b) + '</li>').join('')}
        </ul>
      ` : ''}
      ${summary.nextFocus ? `<div class="ai-summary-next">${h(summary.nextFocus)}</div>` : ''}
    </div>`;
}
