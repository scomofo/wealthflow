import { icon } from '../icons.js';

export function stat(label, value, change, ic, color) {
  const up = change >= 0;
  return `<div class="card">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div class="stat-icon" style="background:${color}18">${icon(ic, 18, color)}</div>
      <div style="display:flex;align-items:center;gap:4px;font-size:12px;font-weight:500;color:var(--${up ? 'green' : 'red'})">
        ${icon(up ? 'arrow-up-right' : 'arrow-down-right', 14)} ${Math.abs(change)}%
      </div>
    </div>
    <div style="margin-top:12px">
      <div class="stat-label">${label}</div>
      <div class="stat-val">${value}</div>
    </div>
  </div>`;
}
