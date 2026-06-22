# Phase 3 — Visual System Refinement Handoff

## Purpose
Phase 3 upgrades WealthFlow from a polished interface into a **cohesive visual system**.

Phase 1 added perceived quality.
Phase 2 added responsiveness and behavioral feedback.
Phase 3 should make the product feel:
- calmer
- more premium
- more unified
- easier to scan

This handoff also includes the remaining Phase 2 cleanup items that should be completed before or during Phase 3.

---

# Current State Summary

## Phase 1
Implemented and passing:
- card elevation
- button press feedback
- priority badge system
- dashboard utility classes

## Phase 2
Implemented and mostly passing:
- action completion toasts
- removal animations in handlers
- momentum strip on dashboard
- auto-refresh of next best actions on init

## Remaining Phase 2 cleanup items
These should be addressed first because they affect interaction consistency.

### Cleanup 1 — Standardize removal animation class
Current implementation uses two class names in handlers:
- `fade-out`
- `action-removing`

Goal:
- choose one class name only
- define it once in CSS
- use it everywhere for saved actions and next best actions

#### Recommended standard
Use:
```css
.fade-out {
  opacity: 0;
  transform: translateY(-4px);
  transition: opacity 0.18s ease, transform 0.18s ease;
}
```

Then update handlers so all action removals use:
```js
card.classList.add('fade-out')
```

### Cleanup 2 — Verify completion status for momentum strip
Dashboard currently checks completed recommended actions via status filtering.
Confirm the actual persisted value used by the state/DB layer.

Possible values to verify:
- `completed`
- `done`

Goal:
- make dashboard momentum strip use the exact status your data layer stores
- prevent undercounting or never-showing completions

### Cleanup 3 — Toast consistency
Keep these exact tones unless product direction changes:
- complete next-best action → `Nice — progress made`
- complete saved action → `Plan item completed`
- dismiss → `Action dismissed`
- snooze → `Action snoozed for 7 days` or `Snoozed for 7 days`

Pick one snooze copy and standardize it.

---

# Phase 3 Goals

## Goal 1 — Unify visual language
Reduce inline one-off styling and move repeated visual patterns into reusable CSS classes.

## Goal 2 — Improve hierarchy
Make the dashboard feel intentionally structured rather than assembled from components.

## Goal 3 — Calm the interface
Use softer emphasis, better spacing, and more deliberate contrast.

## Goal 4 — Improve scannability
Users should understand what matters in under 5 seconds.

---

# Phase 3 Scope

## In scope
- snapshot bar polish
- hero/action card refinement
- saved action list refinement
- dashboard section spacing and hierarchy
- secondary card demotion
- soft color layer pass
- CSS extraction from repeated inline styles

## Out of scope
- large architecture refactors
- new workflows
- major information architecture changes
- full design system rewrite

---

# 1. Snapshot Bar Refinement

## Files
- `src/renderer/js/components/financial-snapshot-bar.js`
- `src/renderer/styles/main.css`

## Objective
Make the snapshot bar feel like one premium status strip rather than four independent stat blocks.

## Requirements

### A. Confirm data correctness
Ensure debt uses the correct field consistently:
- use `F.totalDebt`
- not `F.debt`

Confirm other values are aligned with the computed financials shape.

### B. Improve internal structure
Use shared classes instead of mostly inline layout.

Recommended structure:
```html
<div class="card snapshot-bar">
  <div class="snapshot-cell">...</div>
  <div class="snapshot-cell">...</div>
  <div class="snapshot-cell">...</div>
  <div class="snapshot-cell">...</div>
  <div class="snapshot-status">You are cash-flow positive this month</div>
</div>
```

### C. Add subtle separators
Use internal borders or spacing to make the strip easier to scan.

### D. Improve labels
Keep labels low-contrast, uppercase, and consistent with dashboard stat typography.

### E. Add calmer status line
The status line below the metrics should be system guidance, not alert copy.
Examples:
- `You are cash-flow positive this month`
- `Your expenses are currently outpacing income`

---

# 2. Hero and Next Best Actions Refinement

## Files
- `src/renderer/js/components/next-best-actions-panel.js`
- `src/renderer/js/pages/dashboard.js`
- `src/renderer/styles/main.css`

## Objective
Make the hero and next-best-actions surface feel like the unmistakable center of the product.

## Requirements

### A. Reduce inline styling
Move repeated patterns into reusable classes where practical.
Examples:
- hero title row
- hero subtitle
- action icon shell
- rationale text
- impact line

### B. Refine card hierarchy
Each action card should clearly separate:
- title
- rationale
- impact
- actions
- priority

### C. Keep max 3 visible actions
Do not increase density.
Use stronger hierarchy, not more content.

### D. Calmer hover behavior
Cards should feel responsive, but not flashy.
Current hover behavior is good; keep it subtle.

### E. Improve empty state polish
Empty state should feel premium and reassuring, not empty.
Recommended empty copy:
- `You’re in good shape right now — no urgent actions found.`
- keep refresh CTA

---

# 3. Saved Action List Refinement

## Files
- `src/renderer/js/components/dashboard-action-list.js`
- `src/renderer/styles/main.css`

## Objective
Make saved actions feel like a lightweight execution checklist.

## Requirements

### A. Add subtitle
Under `Your Plan`, add:
- `Saved actions you're working through`

### B. Improve row structure
Each row should show:
- title
- optional impact text
- optional source/workflow label
- right-aligned compact controls

### C. Improve empty state
Recommended empty state:
- `No saved actions yet`
- `Save actions from AI workflows or Next Best Actions to build your plan.`

### D. Keep it lightweight
This should not feel like a management table.
It should feel like a practical working list.

---

# 4. Dashboard Hierarchy and Spacing Pass

## Files
- `src/renderer/js/pages/dashboard.js`
- `src/renderer/styles/main.css`

## Objective
Make dashboard sections feel intentionally ordered and visually balanced.

## Requirements

### A. Use section wrappers consistently
Use shared layout classes for:
- hero
- snapshot
- next best actions
- AI recommendations
- saved actions
- secondary sections

### B. Section rhythm
Recommended vertical rhythm:
- primary section gap: `18px`
- card internal padding: `18px–22px`
- title/subtitle spacing: `4px–6px`

### C. Reduce visual competition
The dashboard hero and next-best-actions area should dominate.
Other sections should support.

### D. Momentum strip placement
Keep it visually subordinate to the hero and action surfaces.
It should read as supportive feedback, not a second hero.

---

# 5. Secondary Surface Demotion

## Files
- `src/renderer/js/pages/dashboard.js`
- any secondary dashboard components used there

## Objective
Ensure supporting sections do not compete with core decision surfaces.

## Priority order should remain:
1. Hero / monthly context
2. Snapshot bar
3. Next Best Actions
4. AI recommendations + saved actions
5. Monthly spending snapshot / insight cards
6. Momentum strip
7. Utility cards / quick links

## Requirements

### A. Transactions, goals, and other utility cards
Keep them visually quieter than the hero and action system.

### B. Avoid equal-weight treatment
Not every card should feel equally important.

### C. Use calmer styling on quick-link cards
The bottom quick actions should feel useful, not like core strategy surfaces.

---

# 6. Soft Color Layer Pass

## Files
- `src/renderer/styles/theme.css`
- `src/renderer/styles/main.css`

## Objective
Add subtle depth and improve visual cohesion without changing the core brand.

## Recommended additions
In `theme.css`, consider introducing:
```css
--bg-elevated: #1a1d22;
--bg-soft: rgba(255,255,255,0.02);
--border-soft: rgba(255,255,255,0.06);
--accent-soft: rgba(212,168,67,0.12);
```

In `main.css`, use these selectively for:
- premium panels
- hero surfaces
- supporting cards
- subtle hover fills

## Rule
Do not create high contrast or glossy surfaces.
The product should still feel restrained and trustworthy.

---

# 7. CSS Extraction / Cleanup

## Objective
Reduce repeated inline styling in dashboard surfaces where the same patterns recur.

## Good candidates for extraction
- hero title block
- hero subtitle text
- action icon containers
- impact line styling
- saved action row layout
- dashboard utility row layout

## Do not overdo it
Only extract repeated patterns.
Do not turn every one-off into a CSS class.

---

# 8. Recommended Build Order

## Step 0 — Phase 2 cleanup first
1. standardize removal animation class
2. verify completion status for momentum strip
3. standardize snooze toast copy

## Step 1 — Snapshot bar polish
- correctness first
- then spacing and structure

## Step 2 — Hero / next-best-actions refinement
- reduce inline style repetition
- improve hierarchy

## Step 3 — Saved action list refinement
- subtitle
- source labels
- empty state

## Step 4 — Dashboard spacing / hierarchy pass
- section wrappers
- reduce competition

## Step 5 — Soft color layer pass
- introduce if needed after hierarchy is stable

## Step 6 — CSS cleanup
- extract repeated patterns once stable

---

# 9. Acceptance Criteria

## Phase 2 cleanup acceptance
- one removal animation class only
- removal animation visibly works
- dashboard momentum strip reflects real completed actions
- action toasts are consistent in tone

## Phase 3 acceptance
- snapshot bar feels like one premium strip
- hero and next-best-actions clearly dominate the dashboard
- saved actions feel like a checklist, not a raw list
- secondary sections support rather than compete
- repeated visual patterns are cleaner and more reusable
- dashboard feels calmer and easier to scan

---

# 10. Definition of Done
Phase 3 is complete when WealthFlow’s dashboard feels like a cohesive financial command center rather than a collection of smart components.

The user should feel:
- guided
- calm
- informed
- in control

Not:
- overloaded
- rushed
- visually fatigued

---

# Product Reminder
WealthFlow is not a reporting interface.
It is a **decision-first financial command center**.

Every visual refinement should support this principle:
> show what matters, tell the user what to do, and make progress feel clear
