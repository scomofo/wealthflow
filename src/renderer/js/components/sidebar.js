import { icon } from '../icons.js';
import { NAV_ITEMS, getSection } from '../router.js';

export function renderSidebar(sideOpen) {
  const section = getSection();
  const navHtml = NAV_ITEMS.map(([id, label, ic]) =>
    `<button class="nav-btn ${section === id ? 'active' : ''}" data-nav="${id}" aria-label="${label}" ${section === id ? 'aria-current="page"' : ''}>${icon(ic, 16)} ${sideOpen ? `<span>${label}</span>` : ''}</button>`
  ).join('');

  return `<aside class="side ${sideOpen ? '' : 'collapsed'}">
    <div class="side-head">
      <div class="side-logo">W</div>
      ${sideOpen ? '<div><div class="side-title">WealthFlow</div><div class="side-sub">Canadian Finance</div></div>' : ''}
    </div>
    <nav role="navigation">${navHtml}</nav>
    <button class="side-toggle" data-action="toggle-side" aria-label="Toggle sidebar">${icon('menu', 16)}</button>
  </aside>`;
}
