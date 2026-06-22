# WealthFlow Dashboard UI V2 — Build Handoff

## Objective
Redesign the dashboard into a **decision-first financial command center**.

The current dashboard already shows summary stats, budget alerts, insights, recent transactions, goals, and challenges. This phase should reorganize and upgrade the experience so the first screen answers:
- What matters right now?
- What should I do next?
- Am I improving or slipping?

This is a UI and product-structure upgrade, not just a visual refresh.

---

## Product Outcome
After this build, the dashboard should feel like:
- a command center
- a personal financial home screen
- an action-first surface

It should feel **less like a widget wall** and **more like a prioritized operating panel**.

---

## Core UX Hierarchy

### 1. Next Best Actions (hero section)
This is the most important area on the page.

### 2. Financial Snapshot Bar
Compact, high-signal metrics.

### 3. Monthly / Trend Insights
Only meaningful insights, not generic charts.

### 4. Saved Action List / Plan
Persistent, execution-oriented action tracking.

### 5. Secondary content
Recent transactions, goals, profile CTA, challenges.

---

## Design Principles

### Action-first
The dashboard should prioritize actions over passive information.

### Above-the-fold clarity
The user should understand their current financial state without scrolling.

### Fewer, stronger sections
Reduce clutter. Prefer 4 strong sections over 8 weak widgets.

### Explainability
Every major recommendation should include a why.

### Progressive disclosure
Show a concise summary first. Let the user drill down as needed.

---

# Existing Dashboard Assessment

Current `dashboard.js` already includes:
- profile CTA
- widget customization
- welcome card
- summary stat grid
- budget alerts
- spending insights
- recent transactions
- savings goals
- challenges

### Main issues
- action surfaces are not primary
- equal visual weight across too many sections
- dashboard still behaves like a widget board
- no strong top-of-page command center structure
- no dedicated saved plan / action execution area

---

# Target Layout (V2)

## Top-to-bottom section order

### Section A — Hero: Next Best Actions
### Section B — Snapshot Bar
### Section C — Trends / Insight Cards
### Section D — Saved Action Plan
### Section E — Secondary grid (transactions, goals, profile/challenges)

---

# File Changes

## New files
```text
src/renderer/js/components/next-best-actions-panel.js
src/renderer/js/components/financial-snapshot-bar.js
src/renderer/js/components/dashboard-insight-cards.js
src/renderer/js/components/dashboard-action-list.js
```

## Existing files to modify
```text
src/renderer/js/pages/dashboard.js
src/renderer/js/app.js
src/renderer/js/state.js
src/renderer/styles/main.css
src/renderer/styles/theme.css
```

If your CSS is organized differently, place the new styles with the current renderer style system.

---

# Section A — Next Best Actions Hero

## Component
```text
src/renderer/js/components/next-best-actions-panel.js
```

## Purpose
Render the dashboard’s top 1–3 highest-priority actions using the Next Best Actions system.

## Props
Suggested signature:
```js
renderNextBestActionsPanel(actions, options = {})
```

Where `actions` are already filtered to open + unsnoozed top actions.

## UI requirements
- title: `Next Best Actions`
- subtitle: `Your highest-impact financial moves right now`
- refresh button
- cards for top actions

### Each card shows
- title
- rationale or description
- priority badge
- optional impact text
- actions:
  - Mark done
  - Dismiss
  - Snooze 7 days

### If no actions
Show friendly empty state:
- `You're in good shape right now — no urgent actions found.`
- button: `Refresh actions`

## Display rules
- show max 3 actions in hero section
- if more exist, link to view all in the saved action list section

## Visual treatment
This section should be visually dominant:
- larger spacing
- stronger background treatment or border emphasis
- top placement on dashboard

Do not make it feel alarming unless actions are truly urgent.

---

# Section B — Financial Snapshot Bar

## Component
```text
src/renderer/js/components/financial-snapshot-bar.js
```

## Purpose
Replace the current summary grid + welcome emphasis with a tighter high-signal status strip.

## Props
```js
renderFinancialSnapshotBar(state, financials)
```

## Required metrics
- Net Worth
- Cash Flow / Savings Rate
- Total Debt
- Total Investments or Saved Total

### Recommended labels
- `Net Worth`
- `Savings Rate`
- `Debt`
- `Invested`

### Optional trend indicators
If lightweight comparisons exist or can be estimated:
- up/down indicator for net worth history
- savings rate health note

If not available, do not fake trend percentages.

## UI requirements
Render as a horizontal responsive strip of compact cards.

### Example values
- `Net Worth  $42,300`
- `Savings Rate  18.4%`
- `Debt  $12,400`
- `Invested  $21,800`

### Additional microcopy
Small status line below or beside the bar:
- `You are cash-flow positive this month`
- or `Your expenses are outpacing income`

That message should be rule-based from existing financial summary.

---

# Section C — Dashboard Insight Cards

## Component
```text
src/renderer/js/components/dashboard-insight-cards.js
```

## Purpose
Show 1–2 meaningful insights, not generic filler.

## Props
```js
renderDashboardInsightCards(state, financials)
```

## Candidate insights to show
Use only the strongest 2.

### Insight types
1. Overspending insight
2. Debt reduction / debt concern insight
3. Savings momentum insight
4. Goal progress insight
5. Registered account opportunity insight

## Example cards
- `Food/Groceries is your largest budget pressure this month`
- `Your debt load is still your biggest drag on monthly progress`
- `Your savings rate is above 20% — strong work`
- `Your Vacation Fund is behind pace for its deadline`

## Rules
- if an insight duplicates a Next Best Action too heavily, reduce redundancy
- insight cards should explain context, not replace actions

## UI treatment
Use concise cards with:
- title
- one-line supporting explanation
- optional CTA (e.g. `View budgets`, `Run monthly plan`, `Review debt`)

---

# Section D — Saved Action Plan

## Component
```text
src/renderer/js/components/dashboard-action-list.js
```

## Purpose
Show persistent saved actions from:
- AI workflow recommendations
- Next Best Actions if later unified

This is the dashboard execution layer.

## Props
```js
renderDashboardActionList(actions)
```

## UI requirements
- title: `Your Plan`
- subtitle: `Saved actions you're working through`
- list of pending actions
- status treatment for done actions if you choose to show recent completions

### Each row shows
- title
- source/workflow label if helpful
- priority
- optional impact text
- buttons:
  - Mark done
  - Delete

## Empty state
- `No saved actions yet`
- optional helper text: `Save actions from AI workflows or Next Best Actions to build your plan.`

## Display rules
- show pending first
- optionally show up to 5
- link to full planning/action view later if one exists

---

# Section E — Secondary Grid

## Keep, but de-emphasize
Secondary grid should contain only the most useful supporting content.

## Suggested cards
### 1. Recent Transactions
Keep

### 2. Savings Goals
Keep

### 3. Profile / Progress card
Combine profile CTA and/or challenges instead of giving challenges a full equal-weight column

## De-emphasize or reduce
- full-width welcome card as a hero
- challenges as major dashboard real estate
- widget customization as a prominent top-row affordance

Widget customization can remain, but move it to a small utility action in the section header or settings menu.

---

# Dashboard Structure in Code

## Modify `src/renderer/js/pages/dashboard.js`

### Refactor approach
Break render logic into imported components.

### Replace current structure with something like:
```js
return `
  ${showProfileBanner ? renderProfileBanner(...) : ''}
  ${renderNextBestActionsPanel(topActions, { loading: ..., stale: ... })}
  ${renderFinancialSnapshotBar(state, F)}
  ${renderDashboardInsightCards(state, F)}
  ${renderDashboardActionList(savedActions)}
  <div class="dashboard-secondary-grid">
    ${renderRecentTransactionsCard(state)}
    ${renderSavingsGoalsCard(state)}
    ${renderProgressCard(state, F)}
  </div>
`;
```

Do not keep all logic inline if avoidable.

---

# State Layer Changes

## Modify `src/renderer/js/state.js`
Ensure dashboard has easy access to:
- `nextBestActions`
- `recommendedActions`
- any staleness metadata for action refresh

## Add selectors/helpers if helpful
- `getOpenNextBestActions(limit = 3)`
- `getPendingRecommendedActions(limit = 5)`
- `getDashboardInsights()` (optional helper)

This can live in state or be computed inside dashboard.js, but avoid spreading this logic across multiple components if it grows.

---

# App Event Wiring

## Modify `src/renderer/js/app.js`
Add support for dashboard UI actions:
- `generate-next-best-actions`
- `complete-next-best-action`
- `dismiss-next-best-action`
- `snooze-next-best-action`
- `save-ai-action` if surfaced here
- `complete-ai-action`
- `delete-ai-action`
- `run-monthly-planner-workflow`

### Suggested loading state variables
Add temporary UI state for:
- dashboard actions refreshing
- monthly planner generating

These can start as local app-level UI variables until Phase 3 state cleanup.

---

# Styling Requirements

## Modify `main.css` / theme styles
Add classes such as:
```css
.dashboard-shell
.dashboard-hero
.dashboard-section
.snapshot-bar
.snapshot-pill
.next-actions-panel
.next-action-card
.priority-badge
.insight-cards
.saved-plan-list
.dashboard-secondary-grid
```

## Responsive behavior
### Desktop
- hero full width
- snapshot bar 4 across
- insights 2 across
- secondary grid 3 columns

### Tablet
- snapshot wraps to 2x2
- hero still full width
- secondary grid 2 columns

### Mobile / narrow desktop
- all major sections stack
- action buttons wrap cleanly

---

# Priority Badge System

## Suggested tokens
- urgent: stronger red tint / border
- high: accent/orange emphasis
- medium: neutral accent
- low: muted gray

Priority must be visible but not visually exhausting.

---

# Microcopy Guidance

## Hero section
- `Next Best Actions`
- `Your highest-impact financial moves right now`

## Snapshot helper copy
- `You are cash-flow positive this month`
- `Your savings rate is below your target zone`
- `Debt is currently your largest financial drag`

## Saved plan copy
- `Your Plan`
- `Saved actions you're working through`

Use direct, calm language. Do not sound alarmist.

---

# Suggested Interaction Patterns

## Mark done
- action visually transitions to completed state or disappears from top 3
- show toast: `Nice — action marked complete`

## Dismiss
- remove from hero immediately
- show toast: `Action dismissed`

## Snooze
- remove from hero until snooze date
- default quick action: 7 days

## Refresh actions
- button state changes to loading
- after refresh, panel rerenders with latest actions

---

# MVP Build Scope

If you want the tightest first pass, implement only:
1. Hero Next Best Actions panel
2. Snapshot Bar
3. Saved Action List
4. Secondary grid with Recent Transactions + Goals + Profile card

Ship that before adding deeper insights.

---

# Stretch Enhancements

## Stretch 1 — AI summary card
Add a concise summary card:
- `This month, your biggest gains come from reducing overspending and tackling high-interest debt.`

This should come after the dashboard structure is stable.

## Stretch 2 — Momentum feedback
Show a subtle recent wins strip:
- `Net worth snapshot recorded`
- `2 actions completed this week`

## Stretch 3 — Focus mode
Add a small CTA to isolate just the top action and steps.

---

# Acceptance Criteria

## Functional
- dashboard shows Next Best Actions at top
- dashboard shows snapshot bar
- dashboard shows saved action list
- dashboard supports complete/dismiss/snooze interactions
- secondary content still works without visual overload

## UX
- top of dashboard clearly communicates status + actions
- dashboard feels more like a command center than a widget wall
- action surfaces are visually dominant
- user can understand what matters in under 5 seconds

## Technical
- existing dashboard data still renders correctly
- no regression in transactions/goals/profile CTA
- new components are reusable and not tightly coupled to inline dashboard code

---

# Suggested Build Order
1. build `next-best-actions-panel.js`
2. build `financial-snapshot-bar.js`
3. build `dashboard-action-list.js`
4. refactor `dashboard.js` layout
5. wire app actions + loading state
6. add `dashboard-insight-cards.js`
7. polish styling + responsive behavior

---

# Definition of Done
Dashboard UI V2 is complete when WealthFlow opens to an action-first home screen where users immediately see what matters, what to do next, and what progress they are making — without the dashboard feeling crowded or passive.
