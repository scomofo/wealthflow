import { icon } from '../icons.js';

export function renderAISummary(summary) {
  if (!summary || !summary.headline) return '';

  const confidenceColor = summary.confidence === 'high' ? 'var(--green)'
    : summary.confidence === 'medium' ? 'var(--accent)' : 'var(--sub)';

  return `
    <div class="card ai-summary dashboard-section">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        ${icon('sparkles', 14, 'var(--accent)')}
        <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:var(--sub);font-weight:600">AI Summary</span>
        <span class="priority-pill" style="background:${confidenceColor}18;color:${confidenceColor};margin-left:auto">${summary.confidence || 'medium'}</span>
      </div>
      <div class="ai-summary-headline">${summary.headline}</div>
      ${summary.bullets && summary.bullets.length > 0 ? `
        <ul class="ai-summary-bullets">
          ${summary.bullets.map(b => '<li>' + b + '</li>').join('')}
        </ul>
      ` : ''}
    </div>`;
}
