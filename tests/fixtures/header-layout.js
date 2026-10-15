import { renderHeader } from '../../src/renderer/js/components/header.js';
import { renderSidebar } from '../../src/renderer/js/components/sidebar.js';
import { navigate } from '../../src/renderer/js/router.js';
import { initWindowControlsOverlay } from '../../src/renderer/js/utils/window-controls.js';

const fixture = document.getElementById('fixture');
initWindowControlsOverlay();
window.headerClicks = [];
navigate('advisor');
window.renderHeaderFixture = ({ userName, light, sideOpen }) => {
  document.body.classList.toggle('light', light);
  fixture.innerHTML = `<div class="app">${renderSidebar(sideOpen)}<main class="main">${renderHeader({ user_name: userName, dark_mode: !light })}<div class="content">Header acceptance fixture</div></main></div>`;
};
fixture.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (button?.closest('.header-right')) window.headerClicks.push(button.dataset.action || button.dataset.nav);
});
window.headerFixtureReady = true;
