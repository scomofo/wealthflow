# Phase 1: Sharpen the Product — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure WealthFlow from an 18-page flat nav into a 4-group decision-first app with a monthly command center dashboard.

**Architecture:** Grouped sidebar navigation with collapsible sections. Dashboard rewritten as a monthly review hub with a computed "Next Best Actions" engine. Calendar merged into bills page. Community, Education, Achievements pages removed (achievements folded into dashboard strip).

**Tech Stack:** Vanilla JavaScript (ES modules), Electron renderer process, Chart.js, existing sql.js database.

---

## File Structure

### New Files
- `src/renderer/js/utils/next-actions.js` — Pure function: takes state + financials, returns prioritized action list
- `src/renderer/js/pages/bills.js` — New bills page that absorbs calendar grid + bill management
- `tests/next-actions.test.js` — Tests for the action detection engine

### Modified Files
- `src/renderer/js/router.js` — Replace flat NAV_ITEMS with grouped NAV_GROUPS
- `src/renderer/js/components/sidebar.js` — Render collapsible group navigation
- `src/renderer/js/app.js` — Remove dead imports/handlers/render branches, wire new pages
- `src/renderer/js/pages/dashboard.js` — Full rewrite as monthly command center
- `src/renderer/js/state.js` — Remove communityPosts/education from loadAll()
- `src/renderer/styles/main.css` — Sidebar group styles

### Deleted Files
- `src/renderer/js/pages/community.js`
- `src/renderer/js/pages/education.js`
- `src/renderer/js/pages/achievements.js`
- `src/renderer/js/pages/calendar.js`

---

## Task 1: Next Best Actions Engine

**Files:**
- Create: `src/renderer/js/utils/next-actions.js`
- Create: `tests/next-actions.test.js`

- [ ] **Step 1: Write the test file**

Create `tests/next-actions.test.js`:

```js
const { computeNextActions } = require('../src/renderer/js/utils/next-actions.js');

describe('computeNextActions', () => {
  const baseState = {
    budgets: [],
    goals: [],
    debts: [],
    bills: [],
    investments: [],
    contributionRoom: [],
    settings: { profile_completed: true },
  };
  const baseFinancials = {
    catSpending: {},
    expenses: 2000,
    income: 4000,
    savingsRate: 50,
    netWorth: 10000,
  };

  test('returns empty array when no issues detected', () => {
    const actions = computeNextActions(baseState, baseFinancials);
    expect(actions).toEqual([]);
  });

  test('detects budget over 80%', () => {
    const state = {
      ...baseState,
      budgets: [{ id: '1', category: 'Food', amount: 500 }],
    };
    const financials = { ...baseFinancials, catSpending: { Food: 420 } };
    const actions = computeNextActions(state, financials);
    expect(actions.length).toBe(1);
    expect(actions[0].priority).toBe('high');
    expect(actions[0].link).toBe('budget');
    expect(actions[0].text).toContain('Food');
  });

  test('detects budget blown over 100%', () => {
    const state = {
      ...baseState,
      budgets: [{ id: '1', category: 'Food', amount: 500 }],
    };
    const financials = { ...baseFinancials, catSpending: { Food: 550 } };
    const actions = computeNextActions(state, financials);
    expect(actions.length).toBe(1);
    expect(actions[0].priority).toBe('high');
    expect(actions[0].text).toContain('over budget');
  });

  test('detects high-interest debt', () => {
    const state = {
      ...baseState,
      debts: [{ id: '1', name: 'Credit Card', balance: 5000, rate: 19.99, min_payment: 100 }],
    };
    const actions = computeNextActions(state, baseFinancials);
    expect(actions.some(a => a.link === 'debts' && a.priority === 'high')).toBe(true);
  });

  test('detects unused TFSA room', () => {
    const state = {
      ...baseState,
      contributionRoom: [{ account_type: 'tfsa', known_room: 15000 }],
    };
    const actions = computeNextActions(state, baseFinancials);
    expect(actions.some(a => a.link === 'registered')).toBe(true);
  });

  test('detects overdue bills', () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const state = {
      ...baseState,
      bills: [{ id: '1', title: 'Rent', amount: 1500, next_due_date: yesterday, type: 'bill' }],
    };
    const actions = computeNextActions(state, baseFinancials);
    expect(actions.some(a => a.priority === 'high' && a.link === 'bills')).toBe(true);
  });

  test('detects bills due within 7 days', () => {
    const nextWeek = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
    const state = {
      ...baseState,
      bills: [{ id: '1', title: 'Internet', amount: 80, next_due_date: nextWeek, type: 'bill' }],
    };
    const actions = computeNextActions(state, baseFinancials);
    expect(actions.some(a => a.link === 'bills')).toBe(true);
  });

  test('detects missing financial profile', () => {
    const state = { ...baseState, settings: { profile_completed: false } };
    const actions = computeNextActions(state, baseFinancials);
    expect(actions.some(a => a.link === 'advisor' && a.priority === 'low')).toBe(true);
  });

  test('detects no budgets configured', () => {
    const state = { ...baseState, budgets: [] };
    const actions = computeNextActions(state, baseFinancials);
    expect(actions.some(a => a.link === 'budget' && a.priority === 'low')).toBe(true);
  });

  test('detects goal behind pace', () => {
    const deadline = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
    const state = {
      ...baseState,
      goals: [{ id: '1', name: 'Vacation', target: 5000, current: 500, deadline }],
    };
    const financials = { ...baseFinancials, savingsRate: 10 };
    const actions = computeNextActions(state, financials);
    expect(actions.some(a => a.link === 'savings')).toBe(true);
  });

  test('sorts by priority: high before medium before low', () => {
    const state = {
      ...baseState,
      debts: [{ id: '1', name: 'CC', balance: 5000, rate: 20, min_payment: 100 }],
      contributionRoom: [{ account_type: 'tfsa', known_room: 15000 }],
      settings: { profile_completed: false },
    };
    const actions = computeNextActions(state, baseFinancials);
    const priorities = actions.map(a => a.priority);
    const order = { high: 0, medium: 1, low: 2 };
    for (let i = 1; i < priorities.length; i++) {
      expect(order[priorities[i]]).toBeGreaterThanOrEqual(order[priorities[i - 1]]);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "c:/Users/Scott Morley/Dev/wealthflow" && npx jest tests/next-actions.test.js --no-cache`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

Create `src/renderer/js/utils/next-actions.js`:

```js
// Next Best Actions engine
// Pure function: takes app state + computed financials, returns prioritized action list

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

export function computeNextActions(state, financials) {
  const actions = [];
  const today = new Date().toISOString().slice(0, 10);

  // Budget alerts
  for (const b of state.budgets) {
    const spent = financials.catSpending[b.category] || 0;
    if (b.amount <= 0) continue;
    const pct = (spent / b.amount) * 100;
    if (pct > 100) {
      actions.push({
        icon: 'alert-triangle',
        text: b.category + ' is ' + Math.round(pct) + '% over budget (' + fmtC(spent) + ' / ' + fmtC(b.amount) + ')',
        priority: 'high',
        link: 'budget',
      });
    } else if (pct > 80) {
      actions.push({
        icon: 'alert-triangle',
        text: b.category + ' is at ' + Math.round(pct) + '% of budget (' + fmtC(spent) + ' / ' + fmtC(b.amount) + ')',
        priority: 'high',
        link: 'budget',
      });
    }
  }

  // High-interest debt
  for (const d of state.debts) {
    if (d.rate > 10 && d.balance > 0) {
      actions.push({
        icon: 'credit-card',
        text: d.name + ' has ' + d.rate + '% APR \u2014 consider accelerating payoff',
        priority: 'high',
        link: 'debts',
      });
    }
  }

  // Overdue bills
  for (const b of state.bills) {
    const dueDate = b.next_due_date || b.date;
    if (!dueDate) continue;
    if (dueDate < today) {
      actions.push({
        icon: 'alert-triangle',
        text: b.title + ' is overdue (was due ' + dueDate + ')',
        priority: 'high',
        link: 'bills',
      });
    } else {
      const daysUntil = Math.ceil((new Date(dueDate + 'T00:00:00') - new Date(today + 'T00:00:00')) / 86400000);
      if (daysUntil <= 7) {
        actions.push({
          icon: 'clock',
          text: b.title + ' due in ' + daysUntil + ' day' + (daysUntil !== 1 ? 's' : '') + ' (' + fmtC(b.amount) + ')',
          priority: 'high',
          link: 'bills',
        });
      }
    }
  }

  // Contribution room
  for (const cr of state.contributionRoom) {
    if (cr.known_room > 1000) {
      const label = cr.account_type.toUpperCase();
      actions.push({
        icon: 'piggy-bank',
        text: 'You have ' + fmtC(cr.known_room) + ' in unused ' + label + ' room',
        priority: 'medium',
        link: 'registered',
      });
    }
  }

  // Goals behind pace
  for (const g of state.goals) {
    if (!g.deadline || g.target <= 0) continue;
    const remaining = g.target - (g.current || 0);
    if (remaining <= 0) continue;
    const daysLeft = Math.ceil((new Date(g.deadline + 'T00:00:00') - new Date(today + 'T00:00:00')) / 86400000);
    if (daysLeft <= 0) {
      actions.push({
        icon: 'target',
        text: g.name + ' deadline has passed \u2014 ' + fmtC(remaining) + ' still needed',
        priority: 'high',
        link: 'savings',
      });
    } else {
      const monthlyNeeded = remaining / (daysLeft / 30);
      const monthlySavings = (financials.income || 0) * (financials.savingsRate / 100);
      if (monthlyNeeded > monthlySavings * 0.5) {
        actions.push({
          icon: 'target',
          text: g.name + ' needs ~' + fmtC(monthlyNeeded) + '/mo to hit ' + fmtC(g.target) + ' by ' + g.deadline,
          priority: 'medium',
          link: 'savings',
        });
      }
    }
  }

  // Low emergency fund
  const monthlyExpenses = financials.expenses || 0;
  const totalSavings = (state.goals || []).reduce((sum, g) => sum + (g.current || 0), 0);
  if (monthlyExpenses > 0 && totalSavings < monthlyExpenses * 3) {
    actions.push({
      icon: 'shield',
      text: 'Emergency fund is below 3 months of expenses',
      priority: 'medium',
      link: 'savings',
    });
  }

  // No budgets
  if (state.budgets.length === 0) {
    actions.push({
      icon: 'lightbulb',
      text: 'Set up monthly budgets to track spending',
      priority: 'low',
      link: 'budget',
    });
  }

  // Missing financial profile
  if (!state.settings?.profile_completed) {
    actions.push({
      icon: 'clipboard-list',
      text: 'Complete your Financial Profile for personalized advice',
      priority: 'low',
      link: 'advisor',
    });
  }

  // Sort: high > medium > low
  actions.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

  return actions;
}

function fmtC(amount) {
  return '$' + Math.abs(amount).toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// CommonJS export for Jest compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { computeNextActions };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd "c:/Users/Scott Morley/Dev/wealthflow" && npx jest tests/next-actions.test.js --no-cache`
Expected: All 10 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/renderer/js/utils/next-actions.js tests/next-actions.test.js
git commit -m "feat: add Next Best Actions detection engine with tests"
```

---

## Task 2: Grouped Router

**Files:**
- Modify: `src/renderer/js/router.js`

- [ ] **Step 1: Rewrite router.js with grouped navigation**

Replace the entire contents of `src/renderer/js/router.js`:

```js
// Grouped navigation router
let currentSection = 'dashboard';
let onNavigate = null;

export const NAV_GROUPS = [
  {
    id: 'home',
    label: 'Home',
    icon: 'home',
    items: [
      ['dashboard', 'Dashboard', 'home'],
      ['advisor', 'Financial Profile', 'clipboard-list'],
      ['residence', 'My Home', 'home'],
    ],
  },
  {
    id: 'money',
    label: 'Money',
    icon: 'wallet',
    items: [
      ['transactions', 'Transactions', 'receipt'],
      ['budget', 'Budget', 'lightbulb'],
      ['bills', 'Bills', 'calendar'],
      ['debts', 'Debts', 'credit-card'],
    ],
  },
  {
    id: 'growth',
    label: 'Growth',
    icon: 'trending-up',
    items: [
      ['investments', 'Investments', 'trending-up'],
      ['registered', 'Registered Accts', 'piggy-bank'],
      ['savings', 'Savings Goals', 'target'],
    ],
  },
  {
    id: 'plan',
    label: 'Plan',
    icon: 'calculator',
    items: [
      ['tax-calc', 'Tax Calculator', 'wallet'],
      ['tax-season', 'Tax Season', 'file-text'],
      ['planning', 'Planning', 'calculator'],
      ['analytics', 'Analytics', 'bar-chart-3'],
    ],
  },
];

// Flat list for lookups (settings pinned separately)
export const ALL_ROUTES = [
  ...NAV_GROUPS.flatMap(g => g.items),
  ['settings', 'Settings', 'settings'],
];

export function getSection() { return currentSection; }

export function navigate(section) {
  currentSection = section;
  if (onNavigate) onNavigate(section);
}

export function setOnNavigate(fn) { onNavigate = fn; }

export function getCurrentLabel() {
  const item = ALL_ROUTES.find(n => n[0] === currentSection);
  return item ? item[1] : 'Dashboard';
}

export function getGroupForSection(section) {
  for (const g of NAV_GROUPS) {
    if (g.items.some(item => item[0] === section)) return g.id;
  }
  return null;
}
```

- [ ] **Step 2: Verify no import errors**

Run: `cd "c:/Users/Scott Morley/Dev/wealthflow" && npx eslint src/renderer/js/router.js`
Expected: No errors (warnings OK)

- [ ] **Step 3: Commit**

```bash
git add src/renderer/js/router.js
git commit -m "feat: replace flat NAV_ITEMS with grouped NAV_GROUPS router"
```

---

## Task 3: Collapsible Sidebar

**Files:**
- Modify: `src/renderer/js/components/sidebar.js`
- Modify: `src/renderer/styles/main.css`

- [ ] **Step 1: Rewrite sidebar.js with collapsible groups**

Replace the entire contents of `src/renderer/js/components/sidebar.js`:

```js
import { icon } from '../icons.js';
import { NAV_GROUPS, getSection, getGroupForSection } from '../router.js';

let expandedGroup = null;

export function setExpandedGroup(groupId) { expandedGroup = groupId; }

export function renderSidebar(sideOpen) {
  const section = getSection();
  // Auto-expand the group containing the active page
  const activeGroup = getGroupForSection(section);
  if (activeGroup && expandedGroup === null) expandedGroup = activeGroup;

  const groupsHtml = NAV_GROUPS.map(g => {
    const isExpanded = expandedGroup === g.id;
    const hasActive = g.items.some(item => item[0] === section);

    if (!sideOpen) {
      // Collapsed mode: show only group icon
      return '<button class="nav-group-icon ' + (hasActive ? 'active' : '') + '" data-action="expand-group" data-group="' + g.id + '" title="' + g.label + '">'
        + icon(g.icon, 18)
        + '</button>';
    }

    const itemsHtml = isExpanded ? g.items.map(([id, label, ic]) =>
      '<button class="nav-btn ' + (section === id ? 'active' : '') + '" data-nav="' + id + '" aria-label="' + label + '"' + (section === id ? ' aria-current="page"' : '') + '>'
        + icon(ic, 14) + ' <span>' + label + '</span>'
        + '</button>'
    ).join('') : '';

    return '<div class="nav-group ' + (isExpanded ? 'expanded' : '') + '">'
      + '<button class="nav-group-header ' + (hasActive ? 'active' : '') + '" data-action="toggle-group" data-group="' + g.id + '">'
        + icon(g.icon, 16)
        + ' <span>' + g.label + '</span>'
        + ' <span class="nav-group-chevron">' + icon('chevron-down', 12) + '</span>'
      + '</button>'
      + '<div class="nav-group-items">' + itemsHtml + '</div>'
    + '</div>';
  }).join('');

  const settingsBtn = sideOpen
    ? '<button class="nav-btn ' + (section === 'settings' ? 'active' : '') + '" data-nav="settings" aria-label="Settings"' + (section === 'settings' ? ' aria-current="page"' : '') + '>'
        + icon('settings', 14) + ' <span>Settings</span></button>'
    : '<button class="nav-btn ' + (section === 'settings' ? 'active' : '') + '" data-nav="settings" title="Settings">'
        + icon('settings', 18) + '</button>';

  return '<aside class="side ' + (sideOpen ? '' : 'collapsed') + '">'
    + '<div class="side-head">'
      + '<div class="side-logo">W</div>'
      + (sideOpen ? '<div><div class="side-title">WealthFlow</div><div class="side-sub">Canadian Finance</div></div>' : '')
    + '</div>'
    + '<nav role="navigation">' + groupsHtml + '</nav>'
    + '<div class="side-footer">'
      + settingsBtn
      + '<button class="side-toggle" data-action="toggle-side" aria-label="Toggle sidebar">' + icon('menu', 16) + '</button>'
    + '</div>'
  + '</aside>';
}
```

- [ ] **Step 2: Add sidebar group styles to main.css**

Append after the existing `.side-toggle` styles (after line 76 in main.css). Find the line with the closing brace of `.side-toggle` and add after it:

```css
/* Sidebar group navigation */
.nav-group { margin-bottom: 2px; }
.nav-group-header {
  display: flex; align-items: center; gap: 10px; width: 100%; padding: 9px 12px;
  background: none; border: none; color: var(--sub); font-size: 12px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.8px; cursor: pointer; text-align: left;
  transition: color 0.15s;
}
.nav-group-header:hover { color: var(--text); }
.nav-group-header.active { color: var(--accent); }
.nav-group-chevron { margin-left: auto; transition: transform 0.2s; }
.nav-group.expanded .nav-group-chevron { transform: rotate(180deg); }
.nav-group-items { overflow: hidden; max-height: 0; transition: max-height 0.2s ease; }
.nav-group.expanded .nav-group-items { max-height: 200px; }
.nav-group-items .nav-btn { padding-left: 38px; font-size: 12px; }
.nav-group-icon {
  display: flex; align-items: center; justify-content: center; width: 100%; padding: 10px 0;
  background: none; border: none; color: var(--sub); cursor: pointer; transition: color 0.15s;
}
.nav-group-icon:hover { color: var(--text); }
.nav-group-icon.active { color: var(--accent); }
.side-footer {
  border-top: 1px solid var(--border); padding: 6px 5px;
  display: flex; flex-direction: column; gap: 2px;
}
```

- [ ] **Step 3: Verify lint passes**

Run: `cd "c:/Users/Scott Morley/Dev/wealthflow" && npx eslint src/renderer/js/components/sidebar.js`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/renderer/js/components/sidebar.js src/renderer/styles/main.css
git commit -m "feat: collapsible grouped sidebar navigation"
```

---

## Task 4: Wire Sidebar Actions in app.js

**Files:**
- Modify: `src/renderer/js/app.js`

- [ ] **Step 1: Update the sidebar import**

In `src/renderer/js/app.js`, change the sidebar import (line 7):

From:
```js
import { renderSidebar } from './components/sidebar.js';
```
To:
```js
import { renderSidebar, setExpandedGroup } from './components/sidebar.js';
```

- [ ] **Step 2: Add toggle-group and expand-group action handlers**

In the click event handler switch statement inside `bindEvents()`, add these two cases after the existing `toggle-side` case:

```js
      case 'toggle-group': {
        const groupId = btn.dataset.group;
        const currentEl = document.querySelector('.nav-group.expanded .nav-group-header');
        const currentExpanded = currentEl?.dataset.group;
        setExpandedGroup(currentExpanded === groupId ? null : groupId);
        render();
        break;
      }
      case 'expand-group': {
        sideOpen = true;
        setExpandedGroup(btn.dataset.group);
        render();
        break;
      }
```

- [ ] **Step 3: Verify lint passes**

Run: `cd "c:/Users/Scott Morley/Dev/wealthflow" && npx eslint src/renderer/js/app.js`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/renderer/js/app.js
git commit -m "feat: wire toggle-group and expand-group sidebar actions"
```

---

## Task 5: Bills Page (Calendar Merge)

**Files:**
- Create: `src/renderer/js/pages/bills.js`
- Delete: `src/renderer/js/pages/calendar.js`

- [ ] **Step 1: Create bills.js**

Create `src/renderer/js/pages/bills.js` with the exact same content as `calendar.js` but with the export renamed from `renderCalendar` to `renderBills`. The full file content is the same as the current `src/renderer/js/pages/calendar.js` (168 lines), with only line 4 changed:

From: `export function renderCalendar(state) {`
To: `export function renderBills(state) {`

Copy `calendar.js` to `bills.js` and make that one-line change.

- [ ] **Step 2: Delete calendar.js**

```bash
rm src/renderer/js/pages/calendar.js
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/js/pages/bills.js
git rm src/renderer/js/pages/calendar.js
git commit -m "feat: create bills page absorbing calendar, delete calendar.js"
```

---

## Task 6: Dashboard Rewrite

**Files:**
- Modify: `src/renderer/js/pages/dashboard.js`

- [ ] **Step 1: Rewrite dashboard.js as monthly command center**

Replace the entire contents of `src/renderer/js/pages/dashboard.js`. The new dashboard has these sections:
1. Month header with welcome message
2. 4-stat grid (Net Worth, Income, Expenses, Savings Rate)
3. Next Best Actions card (dynamic list, first 3 visible, "show more" expands)
4. Monthly Spending Snapshot (top 5 categories with progress bars)
5. Achievements strip (level, XP bar, earned badge icons)
6. Quick links row (Import, AI Report, Analytics)

Key imports needed:
```js
import { icon } from '../icons.js';
import { fmt, h } from '../helpers.js';
import { stat } from '../components/stat-card.js';
import { progress } from '../components/progress-bar.js';
import { computeNextActions } from '../utils/next-actions.js';
```

Module state:
```js
let showAllActions = false;
export function setShowAllActions(val) { showAllActions = val; }
```

The render function signature stays `export function renderDashboard(state, F)`.

Badge definitions (moved from achievements.js):
```js
const badges = [
  { n: 'First Steps', i: '\ud83d\ude80', c: c.transactions >= 1 },
  { n: 'Budget Master', i: '\ud83d\udcca', c: c.budgets >= 3 },
  { n: 'Goal Setter', i: '\ud83c\udfaf', c: c.goals >= 1 },
  { n: 'Debt Aware', i: '\ud83d\udcaa', c: c.debts >= 1 },
  { n: 'Investor', i: '\ud83d\udcc8', c: c.investments >= 1 },
  { n: 'Level 5', i: '\u2b50', c: s.level >= 5 },
  { n: 'Data Rich', i: '\ud83d\udcda', c: c.transactions >= 10 },
  { n: 'Diversified', i: '\ud83c\udf10', c: c.investments >= 3 },
];
```

Next Best Actions rendering pattern: each action gets an icon, text, priority-colored dot, and a "View" button that uses `data-nav` to navigate to the relevant page. The `show-all-actions` data-action is handled by app.js.

Priority colors: `high` = `var(--red)`, `medium` = `var(--orange, #f59e0b)`, `low` = `var(--blue, #6366f1)`.

The spending snapshot uses `state.budgets` to find matching budget for each category and renders a progress bar. Categories without budgets get a plain gray bar.

Quick links use existing data-action values: `import-csv`, `generate-monthly-report`, and `data-nav="analytics"`.

- [ ] **Step 2: Verify lint passes**

Run: `cd "c:/Users/Scott Morley/Dev/wealthflow" && npx eslint src/renderer/js/pages/dashboard.js`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/renderer/js/pages/dashboard.js
git commit -m "feat: rewrite dashboard as monthly command center with Next Best Actions"
```

---

## Task 7: Remove Dead Pages and Clean Up app.js and state.js

**Files:**
- Delete: `src/renderer/js/pages/community.js`
- Delete: `src/renderer/js/pages/education.js`
- Delete: `src/renderer/js/pages/achievements.js`
- Modify: `src/renderer/js/app.js`
- Modify: `src/renderer/js/state.js`

- [ ] **Step 1: Delete the page files**

```bash
rm src/renderer/js/pages/community.js
rm src/renderer/js/pages/education.js
rm src/renderer/js/pages/achievements.js
```

- [ ] **Step 2: Remove dead imports from app.js**

Remove these four import lines from the top of `src/renderer/js/app.js`:

```js
import { renderCalendar } from './pages/calendar.js';
import { renderEducation } from './pages/education.js';
import { renderCommunity } from './pages/community.js';
import { renderAchievements } from './pages/achievements.js';
```

Add these two imports (if not already added in Task 4):

```js
import { renderBills } from './pages/bills.js';
import { setShowAllActions } from './pages/dashboard.js';
```

- [ ] **Step 3: Update the render() section switch**

In the `render()` function (around lines 229-259), make these changes:

Replace `else if (section === 'calendar')` with `else if (section === 'bills')` and use `renderBills` instead of `renderCalendar`.

Remove these three lines entirely:
```js
else if (section === 'education') page.innerHTML = renderPageSafe(renderEducation, state);
else if (section === 'community') page.innerHTML = renderPageSafe(renderCommunity, state);
else if (section === 'achievements') page.innerHTML = renderPageSafe(renderAchievements, state);
```

- [ ] **Step 4: Remove dead action handlers**

Remove these action handler cases from the click switch in `bindEvents()`:
- `case 'add-community-post':` block (around line 842)
- `case 'toggle-education-complete':` block (around line 869)
- `case 'log-challenge':` block (around line 827)
- `case 'config-widgets':` block (around line 668)
- `case 'save-widgets':` block (around line 695)

Add this new action handler:
```js
      case 'show-all-actions': {
        setShowAllActions(true);
        render();
        break;
      }
```

- [ ] **Step 5: Update state.js**

In `src/renderer/js/state.js`, remove `communityPosts: []` and `education: []` from the initial state object (lines 13-14).

Update `loadAll()` to remove the `api.getCommunityPosts()` and `api.getEducation()` calls from the Promise.all, and remove `communityPosts: community, education,` from the Object.assign.

The new loadAll():
```js
export async function loadAll() {
  const [settings, transactions, budgets, goals, debts, investments, bills, challenges, counts,
         contributionRoom, contributions, respBeneficiaries, gics, residence] = await Promise.all([
    api.getSettings(),
    api.getTransactions(),
    api.getBudgets(),
    api.getGoals(),
    api.getDebts(),
    api.getInvestments(),
    api.getBills(),
    api.getChallenges(),
    api.getCounts(),
    api.getContributionRoom(),
    api.getContributions(),
    api.getRESPBeneficiaries(),
    api.getGICs(),
    api.getPrincipalResidence(),
  ]);
  Object.assign(state, {
    settings, transactions, budgets, goals, debts, investments, bills, challenges, counts,
    contributionRoom, contributions, respBeneficiaries, gics, residence,
  });
  return state;
}
```

Also remove the `addCommunityPost` and `updateEducation` export functions from state.js since those pages no longer exist.

- [ ] **Step 6: Verify lint passes**

Run: `cd "c:/Users/Scott Morley/Dev/wealthflow" && npx eslint src/renderer/js/app.js src/renderer/js/state.js`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git rm src/renderer/js/pages/community.js src/renderer/js/pages/education.js src/renderer/js/pages/achievements.js
git add src/renderer/js/app.js src/renderer/js/state.js
git commit -m "feat: remove community/education/achievements pages, clean up app.js and state.js"
```

---

## Task 8: Smoke Test and Final Verification

**Files:** None (verification only)

- [ ] **Step 1: Run all tests**

Run: `cd "c:/Users/Scott Morley/Dev/wealthflow" && npx jest --no-cache`
Expected: All tests pass including the new `next-actions.test.js`

- [ ] **Step 2: Run lint on all changed files**

Run: `cd "c:/Users/Scott Morley/Dev/wealthflow" && npx eslint src/renderer/js/router.js src/renderer/js/components/sidebar.js src/renderer/js/app.js src/renderer/js/state.js src/renderer/js/pages/dashboard.js src/renderer/js/pages/bills.js src/renderer/js/utils/next-actions.js`
Expected: No errors

- [ ] **Step 3: Verify the app launches**

Run: `cd "c:/Users/Scott Morley/Dev/wealthflow" && npx electron .`
Expected: App window opens. Sidebar shows 4 collapsible groups (Home, Money, Growth, Plan) with Settings pinned at bottom. Dashboard shows month header, 4 stat cards, Next Best Actions, spending snapshot, achievements strip, and quick links. Clicking a group expands/collapses it. Navigating to Bills (under Money) shows the calendar grid + bill list. No community/education/achievements routes in the sidebar.

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address smoke test issues from Phase 1 restructure"
```
