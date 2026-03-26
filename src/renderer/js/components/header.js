import { icon } from '../icons.js';
import { getCurrentLabel } from '../router.js';
import { h } from '../helpers.js';

export function renderHeader(settings) {
  const initial = (settings.user_name || 'U')[0].toUpperCase();
  return `<header class="header">
    <h1>${getCurrentLabel()}</h1>
    <div class="header-right">
      <button class="icon-btn" data-action="toggle-theme" aria-label="Toggle theme">${icon(settings.dark_mode ? 'sun' : 'moon', 14)}</button>
      <button class="icon-btn" data-nav="settings" aria-label="Settings">${icon('settings', 14)}</button>
      <div class="avatar">
        <div class="avatar-circle">${h(initial)}</div>
        <span style="font-size:12px;font-weight:600">${h(settings.user_name)}</span>
      </div>
    </div>
  </header>`;
}
