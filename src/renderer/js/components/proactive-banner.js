import { icon } from '../icons.js';
import { h } from '../helpers.js';

const TYPE_ICONS = { risk: 'alert-triangle', time: 'clock', opportunity: 'lightbulb', behavior: 'activity' };
const TYPE_COLORS = { risk: 'var(--red)', time: 'var(--orange)', opportunity: 'var(--accent)', behavior: 'var(--sub)' };

export function renderProactiveBanner(nudges) {
  if (!nudges || nudges.length === 0) return '';

  return nudges.map(n => {
    const ic = TYPE_ICONS[n.type] || 'info';
    const color = TYPE_COLORS[n.type] || 'var(--sub)';
    return '<div class="card proactive-banner" style="display:flex;align-items:center;gap:12px;margin-bottom:10px">'
      + '<div style="flex-shrink:0">' + icon(ic, 16, color) + '</div>'
      + '<div style="font-size:13px;line-height:1.5;flex:1">' + h(n.message) + '</div>'
      + '</div>';
  }).join('');
}
