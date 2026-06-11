import { icon } from '../icons.js';
import { h } from '../helpers.js';

const META = {
  strong: { iconName: 'check-circle', tone: 'strong', label: 'Strong momentum' },
  building: { iconName: 'trending-up', tone: 'building', label: 'Building momentum' },
  low: { iconName: 'activity', tone: 'low', label: 'Action momentum' },
};

export function renderProgressStrip(progress) {
  if (!progress || !progress.message) return '';

  const state = progress.state || progress.momentum?.state || 'low';
  const meta = META[state] || META.low;
  const count = Number(progress.count ?? progress.momentum?.count ?? 0);

  return `
    <section class="card progress-strip progress-strip-${meta.tone}">
      <div class="progress-strip-icon">${icon(meta.iconName, 16)}</div>
      <div class="progress-strip-copy">
        <div class="progress-strip-label">${h(meta.label)}</div>
        <div class="progress-strip-message">${h(progress.message)}</div>
        ${progress.helperText ? `<div class="progress-strip-helper">${h(progress.helperText)}</div>` : ''}
      </div>
      <div class="progress-strip-count">
        <span>${count}</span>
        <small>this week</small>
      </div>
    </section>`;
}
