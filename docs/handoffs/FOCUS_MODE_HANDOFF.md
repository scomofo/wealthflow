# Focus Mode Handoff

## Purpose
Focus Mode is the next-level execution layer for WealthFlow.

The dashboard already tells the user what matters.
Focus Mode should help the user **act on one important action without distraction**.

This handoff also includes the remaining refinement items from the Phase 3 review so the dashboard and Focus Mode feel like one cohesive system.

---

# Product Goal
Move from:
- seeing actions

To:
- completing actions with confidence

Focus Mode should turn a top-priority action into a short, guided execution surface.

---

# Core User Experience
From the dashboard, the user clicks a CTA such as:
- `Focus on this`
- `View details`

WealthFlow opens a focused panel or modal that shows:
1. the action title
2. why it matters
3. expected impact
4. the exact next step(s)
5. completion / dismiss / snooze controls

This should feel calm, clear, and high-confidence.

---

# Why This Matters
The dashboard now has:
- strong hero
- premium snapshot bar
- next best actions
- saved actions
- momentum feedback

The next product leap is not another dashboard widget.
It is an execution layer that helps users turn recommendations into completed actions.

Focus Mode is that layer.

---

# Phase 3 Review Refinements to Include First
These should be completed before or during Focus Mode work so the visual system stays coherent.

## Refinement 1 — Snapshot strip should feel even more unified
Current implementation is strong and correct, including use of `F.totalDebt`, but the strip can still read as four blocks.

### Required CSS refinement
Ensure snapshot cells use internal separation clearly:
```css
.snapshot-cell + .snapshot-cell {
  border-left: 1px solid var(--border);
  padding-left: 14px;
}
```

If already present, confirm it looks good at desktop widths.
If needed, soften the divider color slightly using a softer border token.

### Mobile rule
At smaller widths, remove the left border and stack cleanly.

---

## Refinement 2 — Extract a few more repeated layout wrappers from Next Best Actions
Current implementation is much better, but still has repeated inline flex wrappers.

### Add classes such as:
```css
.nba-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.nba-main {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;
  flex: 1;
}

.nba-copy {
  min-width: 0;
  flex: 1;
}
```

### Update component
Use these in `src/renderer/js/components/next-best-actions-panel.js` instead of repeating inline layout styles.

Goal:
- cleaner component markup
- easier future polish
- more consistent spacing

---

## Refinement 3 — Calm action card backgrounds slightly
If the action area feels a bit too active, soften card fill.

### Optional refinement
Use a softer background layer for action cards, such as:
```css
.action-card {
  background: rgba(255,255,255,0.02);
}
```

Do not add too much contrast.
Keep the interface restrained and trustworthy.

---

## Refinement 4 — Soften delete treatment in saved action list
Current delete control can feel slightly louder than needed.

### Recommended change
Make delete muted by default and only more obviously destructive on hover.

Example:
```css
.saved-action-delete {
  color: var(--sub);
}

.saved-action-delete:hover {
  color: var(--red);
}
```

Goal:
- reduce visual competition
- keep destructive affordance clear but secondary

---

## Refinement 5 — Standardize snooze wording
Pick one and use it consistently:
- `Snoozed for 7 days`
- `Action snoozed for 7 days`

Recommended:
- `Action snoozed for 7 days`

Reason:
- slightly clearer
- aligns with other action toasts

---

# Focus Mode Scope

## In scope
- Focus Mode entry point from dashboard next-best-actions
- focused modal or panel UI
- action detail presentation
- step guidance
- completion / dismiss / snooze actions
- optional save-to-plan shortcut for relevant actions

## Out of scope
- automatic task execution
- multi-step wizard engine
- notifications/reminders system
- mobile-specific redesign

---

# Recommended UX Approach

## First release
Use a modal or right-side panel.

### Why
- faster to implement
- minimal routing complexity
- easy to launch from dashboard cards
- easy to close and return to dashboard context

## Preferred CTA
On each next-best-action card, add:
- `Focus on this`

This can sit alongside or just before `Mark done` depending on visual balance.

---

# Focus Mode UI Structure

## New component
Create:
```text
src/renderer/js/components/focus-mode.js
```

## Suggested API
```js
renderFocusMode(action, options = {})
```

## Layout sections

### 1. Header
- title: `Focus Mode`
- optional subtitle: `One clear next step`
- close button

### 2. Action title
Large, readable, prominent.

### 3. Why this matters
Use rationale or description.

### 4. Impact
Show expected impact if present.
Examples:
- `Improves monthly cash flow by $180`
- `Reduces high-interest debt drag`

### 5. Suggested next step(s)
Render a short checklist.

Initial strategy:
- derive from action category and source data if available
- if specific steps do not exist, provide one simple next step

### 6. Controls
- Mark done
- Dismiss
- Snooze 7 days
- optional: Save to plan

---

# Focus Mode Data Model

Use existing action object shape where possible.

Recommended minimum inputs:
```json
{
  "id": "...",
  "title": "Reduce Food/Groceries spending by $180 this month",
  "rationale": "Overspending in this category is reducing your monthly cash flow.",
  "impact_text": "Improving this category by $180 would increase monthly free cash flow by the same amount.",
  "priority": "high",
  "category": "budget",
  "source_type": "rule",
  "source_payload": { ... }
}
```

---

# Step Generation Strategy

## V1 approach
Rule-based step generation based on category.

### Budget action
Example steps:
1. Review the category total for this month
2. Identify one purchase pattern to reduce this week
3. Re-check progress after your next transaction import

### Debt action
1. Confirm your current balance and APR
2. Decide on an extra payment amount for this month
3. Apply it to the highest-interest balance first

### Contribution room action
1. Review your available room
2. Decide on a contribution amount
3. Log or make the contribution

### Bill due action
1. Confirm the bill amount
2. Pay or schedule payment today
3. Mark complete once scheduled

## Rule
Keep steps to 2–3 max.
Do not create long procedural flows.

---

# Files to Modify

## New
```text
src/renderer/js/components/focus-mode.js
```

## Existing
```text
src/renderer/js/components/next-best-actions-panel.js
src/renderer/js/handlers/shared.js
src/renderer/styles/main.css
src/renderer/js/app.js
```

If modal rendering already supports custom content, reuse that path.

---

# Implementation Details

## 1. Add Focus CTA to next-best-actions-panel
In each action card, add a new button:
- `Focus on this`

Recommended style:
- `btn btn-ghost btn-sm`
- keep it visually below `Mark done`, or before it if layout works better

### Example
```html
<button class="btn btn-ghost btn-sm" data-action="open-focus-mode" data-id="...">
  Focus on this
</button>
```

---

## 2. Add app state for Focus Mode
In `app.js` mutable app state, add:
```js
focusModeAction: null,
```

This can be stored in the existing `appState` object.

---

## 3. Add handler in shared action handlers
In `src/renderer/js/handlers/shared.js`, add:
- `open-focus-mode`
- `close-focus-mode`
- optional `save-focus-action`

### open-focus-mode behavior
1. find the action by id from `state.nextBestActions`
2. store it in appState
3. open a custom modal or side panel using existing modal mechanism

### close-focus-mode behavior
- clear focus mode state
- rerender

---

## 4. Render Focus Mode surface
Use a custom modal body rendered from `renderFocusMode(action)`.

### Recommendation
Reuse your existing `_custom` modal path if available.
That keeps integration fast.

---

## 5. Add Focus Mode styling
Add classes such as:
```css
.focus-mode {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.focus-mode-title {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.4px;
}

.focus-mode-subtitle {
  font-size: 12px;
  color: var(--sub);
}

.focus-mode-section {
  padding: 14px 16px;
  border: 1px solid var(--border);
  background: var(--input);
  border-radius: 6px;
}

.focus-mode-steps {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.focus-mode-step {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.focus-mode-step-index {
  width: 22px;
  height: 22px;
  border-radius: 999px;
  background: var(--abg);
  color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
}

.focus-mode-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
```

Goal:
- calm
- premium
- deliberate
- distraction-free

---

# Focus Mode Copy Guidance

## Title
- `Focus Mode`

## Subtitle
- `One clear next step`

## Section labels
- `Why this matters`
- `Expected impact`
- `Next steps`

## Tone
- calm
- competent
- helpful

Avoid:
- hype
- urgency language unless priority is truly urgent
- overexplaining

---

# Optional Save-to-Plan Flow
For actions not already in the saved action list, optionally add:
- `Save to plan`

This is useful if Focus Mode becomes the bridge from next-best-actions to persistent execution.

Not required for V1 if it slows delivery.

---

# Build Order

## Step 0 — Complete the Phase 3 refinements listed above
1. snapshot strip divider check
2. extract repeated NBA wrappers
3. soften action card fills if needed
4. soften delete button default state
5. standardize snooze toast copy

## Step 1 — Add Focus Mode component
- create `focus-mode.js`
- build layout and sections

## Step 2 — Add CTA to next-best-actions-panel
- `Focus on this`

## Step 3 — Add shared handlers
- open / close Focus Mode

## Step 4 — Wire modal rendering
- reuse custom modal path if possible

## Step 5 — Polish copy and spacing
- keep it clean and calm

---

# Acceptance Criteria

## Refinement acceptance
- next-best-actions markup uses more shared layout classes
- snapshot strip reads as one system
- delete control in saved actions feels quieter
- snooze language is consistent

## Focus Mode acceptance
- user can open Focus Mode from a next-best-action card
- Focus Mode clearly explains why the action matters
- Focus Mode shows 2–3 next steps max
- user can complete, dismiss, or snooze from Focus Mode
- modal/panel feels calm and uncluttered

---

# Definition of Done
Focus Mode is complete when WealthFlow no longer just surfaces the right action, but also helps the user complete it with clarity and confidence.

The user should feel:
- focused
- guided
- capable

Not:
- overwhelmed
- distracted
- buried in dashboard complexity

---

# Product Reminder
WealthFlow is a financial command center.

Focus Mode is the execution layer that turns recommendations into completed action.
