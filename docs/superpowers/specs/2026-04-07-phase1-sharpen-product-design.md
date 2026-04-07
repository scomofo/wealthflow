# Phase 1 Design Spec: Sharpen the Product

**Goal:** Turn WealthFlow from a feature-rich tracker into a decision-first monthly financial command center.

**Scope:** Navigation restructure, dashboard redesign, page consolidation, page removals. No AI workflow changes, no architecture refactor, no new DB tables.

---

## 1. Navigation Restructure

### Current State
18 flat nav items in a sidebar list. No grouping, no hierarchy.

### New Structure
4 collapsible groups with Settings pinned at the sidebar bottom.

| Group | Sidebar Icon | Pages |
|-------|-------------|-------|
| **Home** | `home` | Dashboard, Financial Profile, My Home |
| **Money** | `wallet` | Transactions, Budget, Bills (calendar merged), Debts |
| **Growth** | `trending-up` | Investments, Registered Accounts, Savings Goals |
| **Plan** | `calculator` | Tax Calculator, Tax Season, Planning, Analytics |
| *(pinned)* | `settings` | Settings |

### Sidebar Behavior
- Group headers are clickable — expand/collapse child items
- Active page's group auto-expands on navigation
- Collapsed sidebar mode: show 4 group icons + settings icon. Clicking a group icon expands the sidebar and that group.
- Only one group expanded at a time (accordion behavior)

### Routes Removed
- `community` — page deleted
- `education` — page deleted
- `achievements` — page deleted, logic folded into dashboard
- `calendar` — page deleted, content merged into bills page

### Files Changed
- `router.js` — replace flat `NAV_ITEMS` with grouped structure
- `sidebar.js` — render collapsible groups instead of flat buttons
- `app.js` — remove imports for deleted pages, remove unused action handlers

---

## 2. Dashboard Redesign

### Core Concept
The dashboard IS the monthly review. It answers: "What happened this month, and what should I do next?"

### Layout (top to bottom)

#### 2a. Month Header
- Current month/year ("April 2026")
- Month-over-month delta indicators for key metrics

#### 2b. Stat Row
4 cards in a grid:
- Net Worth (with delta vs last month)
- Income this month
- Expenses this month
- Savings Rate (with delta)

#### 2c. Next Best Actions
Dynamic list of detected financial actions.
- First 3 visible by default
- "Show N more" button expands the rest
- Each action: icon, description text, priority color (high=red, medium=amber, low=blue), link to relevant page

**Action Detection Engine** — a pure function in a new module (`src/renderer/js/utils/next-actions.js`) that takes state + financials and returns a sorted array of actions:

| Check | Condition | Priority | Link |
|-------|-----------|----------|------|
| Budget alert | Category >80% spent with >7 days remaining | high | budget |
| Budget blown | Category >100% spent | high | budget |
| Contribution room | TFSA/RRSP/FHSA room > $1,000 | medium | registered |
| High-interest debt | Any debt with APR > 10% | high | debts |
| Bills due soon | Bill due within 7 days | high | bills |
| Bills overdue | Bill past due date | high | bills |
| Goal behind pace | Monthly savings rate needed exceeds current rate | medium | savings |
| No budget set | Zero budgets configured | low | budget |
| No financial profile | Profile not completed | low | advisor |
| Low emergency fund | Savings < 3x monthly expenses | medium | savings |

Actions sorted by: high first, then medium, then low. Within same priority, most urgent first.

#### 2d. Monthly Snapshot
Compact horizontal spending bars for top 5 budget categories (by spend amount). Each bar shows: category name, spent/budget ratio, dollar amount. Links to budget page.

#### 2e. Achievements Strip
Single horizontal row:
- Current level + XP progress bar
- Earned badge icons (from the existing 8 badge definitions computed against `state.counts`)
- Compact — no challenge logging, no standalone page

#### 2f. Quick Links Row
3 action buttons:
- Import Transactions (opens file dialog)
- Generate AI Report (triggers monthly report generation)
- View Analytics (navigates to analytics page)

### What's Removed from Current Dashboard
- Configurable widget system (`dashboard_widgets` setting no longer used)
- Challenges section
- The `config-widgets` / `save-widgets` actions in app.js

---

## 3. Calendar Merge into Bills Page

### Current State
- `calendar.js` — standalone page with monthly grid, bill markers, overdue/upcoming sidebar
- Bills are managed through modal add/edit, mark-paid, and recurring detection

### New State
Bills page absorbs calendar content. Single page under Money group with route `bills`.

### Bills Page Layout
- **Upcoming & Overdue** — list at top (from calendar sidebar)
- **Monthly Calendar Grid** — bill marker dots, same rendering as current calendar.js
- **Recurring Detection** — "Detect Recurring" button and modal stay
- **All bill actions** — mark-paid, add/edit/delete bill, all stay as-is

### Implementation
- Calendar rendering code moves from `calendar.js` into `bills.js` (or a shared function imported by bills)
- Route `calendar` removed; existing `calendar` references in nav redirect to `bills`
- `calendar.js` file deleted

---

## 4. Achievements Fold into Dashboard

### Current State
Standalone `achievements.js` page with 8 badge definitions, XP/level display, challenge list.

### New State
- Badge/XP rendering becomes a compact function used by `dashboard.js` (the achievements strip in section 2e)
- 8 badge definitions (computed from `state.counts`) preserved
- XP awarding (`addXP()` calls throughout app.js) unchanged
- **Challenges feature cut** — `log-challenge` action removed. "Next Best Actions" replaces the behavioral nudge purpose.

### Implementation
- Extract badge computation logic from `achievements.js` into a small utility or inline in dashboard
- Delete `achievements.js`
- Remove challenge-related action handlers from app.js

---

## 5. Page Removals

| Page | File Deleted | Route Removed | Data Tables |
|------|-------------|---------------|-------------|
| Community | `community.js` | `community` | `community_posts` table stays (no migration) |
| Education | `education.js` | `education` | `education` table stays |
| Achievements | `achievements.js` | `achievements` | `challenges` table stays |
| Calendar | `calendar.js` | `calendar` | No dedicated table |

### Cleanup
- Remove deleted page imports from `app.js`
- Remove related action handlers from app.js click delegation (e.g., `add-community-post`, `toggle-education-complete`)
- Remove `communityPosts` and `education` from `state.js` `loadAll()` Promise.all (save startup time)
- Remove corresponding nav items from router

---

## 6. Explicit Non-Goals

- **No AI workflow changes** — Phase 2 scope. Next Best Actions is pure data logic, not AI.
- **No architecture refactor** — app.js stays monolithic. Phase 3 scope.
- **No new database tables** — actions computed on the fly from existing state.
- **No changes to existing page internals** — Transactions, Budget, Debts, Investments, Registered Accounts, Tax Calculator, Tax Season, Planning, Analytics, Financial Profile, Residence, Settings keep current rendering and logic.
- **AI chat panel** — stays as-is, toggleable from any page.
- **No destructive DB migrations** — unused tables left in place.

---

## Affected Files Summary

### New Files
- `src/renderer/js/utils/next-actions.js` — action detection engine

### Modified Files
- `src/renderer/js/router.js` — grouped nav structure
- `src/renderer/js/components/sidebar.js` — collapsible group rendering
- `src/renderer/js/app.js` — remove dead imports/handlers, wire new dashboard
- `src/renderer/js/pages/dashboard.js` — full rewrite as monthly command center
- `src/renderer/js/pages/bills.js` — new file replacing current bills page, absorbs calendar rendering
- `src/renderer/js/state.js` — remove communityPosts/education from loadAll()
- `src/renderer/styles/main.css` — sidebar group styles, dashboard layout styles

### Deleted Files
- `src/renderer/js/pages/community.js`
- `src/renderer/js/pages/education.js`
- `src/renderer/js/pages/achievements.js`
- `src/renderer/js/pages/calendar.js`

---

## Success Criteria

- App opens to a dashboard that immediately shows "what happened this month" and "what to do next"
- Navigation has 4 clear groups, collapsible, with no more than 4 items per group
- Calendar/bills consolidated into single page
- Community, Education, Achievements pages gone (achievements folded into dashboard)
- No regressions to existing page functionality
- All existing routes that were kept still work
