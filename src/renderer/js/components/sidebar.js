import { icon } from '../icons.js';
import { NAV_GROUPS, getSection, getGroupForSection } from '../router.js';

let expandedGroup = null;

export function setExpandedGroup(groupId) {
  expandedGroup = groupId;
}

export function renderSidebar(sideOpen) {
  const section = getSection();

  // Auto-expand the group containing the active page on first render
  if (expandedGroup === null) {
    expandedGroup = getGroupForSection(section);
  }

  var html = '<aside class="side ' + (sideOpen ? '' : 'collapsed') + '">';

  html += '<div class="side-head">';
  html += '<div class="side-logo">W</div>';
  if (sideOpen) {
    html += '<div><div class="side-title">WealthFlow</div><div class="side-sub">Canadian Finance</div></div>';
  }
  html += '</div>';

  html += '<nav role="navigation">';

  if (!sideOpen) {
    // Collapsed: show only group icons
    for (var i = 0; i < NAV_GROUPS.length; i++) {
      var g = NAV_GROUPS[i];
      var isActive = getGroupForSection(section) === g.id;
      html += '<button class="nav-group-icon ' + (isActive ? 'active' : '') + '"'
        + ' data-action="expand-group" data-group="' + g.id + '"'
        + ' aria-label="' + g.label + '">'
        + icon(g.icon, 18)
        + '</button>';
    }
  } else {
    // Expanded: show collapsible groups
    for (var j = 0; j < NAV_GROUPS.length; j++) {
      var grp = NAV_GROUPS[j];
      var isExpanded = expandedGroup === grp.id;
      var isGrpActive = getGroupForSection(section) === grp.id;

      html += '<div class="nav-group ' + (isExpanded ? 'expanded' : '') + '">';

      html += '<button class="nav-group-header ' + (isGrpActive ? 'active' : '') + '"'
        + ' data-action="toggle-group" data-group="' + grp.id + '">'
        + icon(grp.icon, 14)
        + ' <span>' + grp.label + '</span>'
        + ' <span class="nav-group-chevron">' + icon('chevron-down', 12) + '</span>'
        + '</button>';

      html += '<div class="nav-group-items">';
      for (var k = 0; k < grp.items.length; k++) {
        var item = grp.items[k];
        var id = item[0];
        var label = item[1];
        var ic = item[2];
        var isCurrentPage = section === id;
        html += '<button class="nav-btn ' + (isCurrentPage ? 'active' : '') + '"'
          + ' data-nav="' + id + '"'
          + ' aria-label="' + label + '"'
          + (isCurrentPage ? ' aria-current="page"' : '') + '>'
          + icon(ic, 14)
          + ' <span>' + label + '</span>'
          + '</button>';
      }
      html += '</div>';

      html += '</div>';
    }
  }

  html += '</nav>';

  html += '<div class="side-footer">';
  var isSettings = section === 'settings';
  html += '<button class="nav-btn ' + (isSettings ? 'active' : '') + '"'
    + ' data-nav="settings"'
    + ' aria-label="Settings"'
    + (isSettings ? ' aria-current="page"' : '') + '>'
    + icon('settings', 16)
    + (sideOpen ? ' <span>Settings</span>' : '')
    + '</button>';
  html += '<button class="side-toggle" data-action="toggle-side" aria-label="Toggle sidebar">'
    + icon('menu', 16)
    + '</button>';
  html += '</div>';

  html += '</aside>';

  return html;
}
