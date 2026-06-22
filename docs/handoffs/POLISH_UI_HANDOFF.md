# WealthFlow UI Polish Pass — Build Handoff

## Objective
Apply a focused UI polish pass to the new dashboard and action surfaces so WealthFlow feels more premium, more readable, and more trustworthy.

This is **not** a redesign.
This is a refinement pass on spacing, hierarchy, typography, button treatment, card surfaces, and action-state clarity.

---

## Goals
After this pass, the dashboard should feel:
- calmer
- more intentional
- less cramped
- more premium
- easier to scan in under 5 seconds

---

## Primary Areas to Polish
1. Next Best Actions hero
2. Snapshot bar
3. Saved action list
4. Dashboard section spacing
5. Priority badges
6. Button treatment
7. Secondary cards (transactions, goals, profile/challenges)

---

# 1. Global Visual Rules

## Spacing
Increase whitespace around major dashboard sections.

### Recommended rhythm
- section gap: `18px`
- card internal padding: `18px–22px`
- title/subtitle spacing: `4px–6px`
- action button row top margin: `10px–12px`

## Typography hierarchy
Use fewer font sizes, but make hierarchy more obvious.

### Suggested hierarchy
- dashboard hero title: `18px`, weight `700`
- section titles: `14px`, weight `600`
- card titles: `13px–14px`, weight `700`
- body/supporting text: `12px`
- metadata / subtext: `10px–11px`

## Corner treatment
Stay consistent with the current product language.
Do not suddenly introduce overly round cards.
Prefer existing 4–6px radii.

---

# 2. Next Best Actions Hero Polish

## File
```text
src/renderer/js/components/next-best-actions-panel.js
```

## Changes to make

### A. Stronger section shell
Wrap the section in a more deliberate hero container:
- slightly richer background than standard cards
- subtle gradient or accent tint
- slightly thicker border emphasis

### B. Better title block
Use a clearer title stack:
- `Next Best Actions`
- subtext below, lower contrast

### C. Improve action card hierarchy
Each action card should have:
- stronger title contrast
- quieter rationale text
- optional impact line separated visually
- button row with consistent spacing and smaller visual weight

### D. Improve priority badge styling
Badges should feel cleaner and more intentional.

Use:
- pill shape
- uppercase label
- slightly tighter padding
- softer background tint

### E. Reduce noise
Do not show too many visual accents in one card.
Use emphasis on:
- title
- priority badge
- primary button only

### Recommended refinements
- hero section padding: `22px`
- action card padding: `16px 18px`
- badge font-size: `10px`
- button row gap: `8px`

---

# 3. Financial Snapshot Bar Polish

## File
```text
src/renderer/js/components/financial-snapshot-bar.js
```

## Changes to make

### A. Compact but premium
The snapshot bar should feel like a status strip, not four random cards.

### B. Better metric separation
Add subtle dividers or stronger layout separation between metric blocks.

### C. Improve labels
Labels should be low contrast and uppercase/small caps style, consistent with the rest of the UI.

### D. Improve cashflow status line
The line below the metrics should read like system guidance:
- `You are cash-flow positive this month`
- `Your expenses are currently outpacing income`

Use calm status color, not alarmist red unless severe.

### E. Fix data reference
Make sure debt uses the correct field from computed financials:
- `F.totalDebt`
not `F.debt`

### Suggested layout treatment
- 4 metric cells
- subtle internal separators
- one full-width microcopy line below

---

# 4. Saved Action List Polish

## File
```text
src/renderer/js/components/dashboard-action-list.js
```

## Changes to make

### A. Add subtitle
Under `Your Plan`, add:
- `Saved actions you're working through`

### B. Improve row structure
Each row should feel less like a raw list and more like a lightweight checklist item.

Suggested row structure:
- title
- optional impact/source line
- right-aligned compact actions

### C. Add subtle state cues
For example:
- priority badge if available
- muted source label like `TFSA Workflow` or `Monthly Planner`

### D. Improve empty state
Use clearer helper text:
- `No saved actions yet`
- `Save actions from AI workflows or Next Best Actions to build your plan.`

---

# 5. Dashboard Layout Polish

## File
```text
src/renderer/js/pages/dashboard.js
```

## Changes to make

### A. Use section wrappers
Wrap major blocks in semantic layout spacing containers:
- hero
- snapshot
- insights
- plan
- secondary grid

### B. Reduce visual competition
The current widget customization button should not visually compete with the dashboard hero.

Move it into a smaller utility row or reduce emphasis:
- smaller size
- lighter border
- less top-of-page prominence

### C. Demote secondary sections
Transactions and goals should remain useful, but visually quieter than the action system.

### D. Combine profile/challenges card more cleanly
If profile CTA is shown, do not let challenges visually compete.
Use one support card, not two competing priorities.

---

# 6. CSS Polish Pass

## File
```text
src/renderer/styles/main.css
```

## Add / refine classes

### Recommended additions
```css
.dashboard-section {
  margin-top: 18px;
}

.dashboard-hero {
  background: linear-gradient(150deg, var(--abg), transparent 70%);
  border: 1px solid rgba(196,147,90,.18);
}

.dashboard-subtitle {
  font-size: 11px;
  color: var(--sub);
  line-height: 1.5;
}

.snapshot-bar {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  align-items: stretch;
}

.snapshot-cell {
  flex: 1;
  min-width: 140px;
}

.snapshot-cell + .snapshot-cell {
  border-left: 1px solid var(--border);
  padding-left: 14px;
}

.priority-pill {
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .5px;
  text-transform: uppercase;
}

.action-card {
  padding: 16px 18px;
}

.action-meta {
  font-size: 11px;
  color: var(--sub);
}

.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.secondary-card-title {
  font-size: 14px;
  font-weight: 600;
}
```

### Responsive tweak
On smaller widths, remove left borders in snapshot cells and switch to top borders or stacked layout.

Example:
```css
@media (max-width: 768px) {
  .snapshot-cell + .snapshot-cell {
    border-left: none;
    padding-left: 0;
  }
}
```

---

# 7. Button Polish

## Current issue
Buttons can visually overpower content if every row uses the same emphasis.

## Rule
Per action row:
- primary action = one filled button
- secondary actions = ghost/secondary

## Recommendation
Use:
- `btn-primary btn-sm` for `Mark done`
- `btn-secondary btn-sm` for `Dismiss`
- `btn-ghost btn-sm` for `Snooze`

Do not make every action button loud.

---

# 8. Microcopy Polish

Use tighter, calmer copy.

## Good examples
- `Your highest-impact financial moves right now`
- `Saved actions you're working through`
- `You are cash-flow positive this month`
- `No urgent actions found`

## Avoid
- hype-y marketing language
- alarmist phrasing
- long paragraphs in dashboard cards

---

# 9. Specific Fixes to Current Generated Components

## `financial-snapshot-bar.js`
### Fix
Change:
```js
fmt(F.debt || 0)
```
To:
```js
fmt(F.totalDebt || 0)
```

## `dashboard-action-list.js`
### Improve
Add:
- subtitle under title
- optional source label from `workflow_type`
- empty state helper text

## `next-best-actions-panel.js`
### Improve
Replace some inline styles with reusable classes once stable.
Right now it is fine to keep inline styles, but move repeated patterns into CSS in the next cleanup pass.

---

# 10. Recommended Build Sequence
1. fix snapshot bar debt field
2. polish hero spacing + badge treatment
3. polish saved action list empty state + subtitle
4. reduce widget button prominence
5. refine CSS classes for action cards / snapshot strip
6. tune responsive layout

---

# 11. Acceptance Criteria

## UX
- dashboard feels calmer and easier to scan
- hero section feels clearly primary
- snapshot bar feels premium, not cluttered
- saved actions feel like a checklist, not raw rows
- secondary content supports, not competes

## Visual
- spacing is more consistent
- typography hierarchy is clearer
- priority badges are cleaner
- buttons feel intentional

## Technical
- no functional regressions
- all new polish remains compatible with current component structure

---

# Definition of Done
The polish pass is complete when the dashboard looks and feels like a focused financial command center rather than a collection of useful but visually competing widgets.
