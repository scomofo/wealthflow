# AI Summary Layer — Handoff

## Purpose
The AI Summary is the **intelligence layer** that ties everything together.

You already have:
- Dashboard → awareness
- Next Best Actions → prioritization
- Focus Mode → execution

AI Summary adds:
> **context + narrative + clarity**

It answers:
- What actually matters right now?
- Why do these actions exist?
- What should I focus on this month?

---

# Product Goal
Move from:
- list of actions

To:
- **clear financial narrative + direction**

---

# Where It Lives

## Placement
Directly under the dashboard hero (above snapshot bar OR between hero and snapshot).

## Why
- high visibility
- sets context before user scans data
- anchors interpretation of actions

---

# Core UX

A small card that reads like:

> This month, your biggest gains come from tightening grocery spending and prioritizing debt repayment.

- Improving groceries by $180 increases your monthly flexibility
- Redirecting that toward debt reduces interest drag

Keep it short. No paragraphs.

---

# Structure

## Component
Create:
```text
src/renderer/js/components/ai-summary.js
```

## API
```js
renderAISummary(summary)
```

---

# Data Model

```json
{
  "headline": "This month, your biggest gains come from tightening grocery spending and prioritizing debt repayment.",
  "bullets": [
    "Reducing groceries by $180 improves monthly cash flow",
    "Applying that to debt reduces interest drag"
  ],
  "confidence": "high"
}
```

---

# Generation Strategy (IMPORTANT)

## Rule-first, AI-second

### Inputs:
- nextBestActions (top 2–3)
- financial snapshot (cashflow, debt, savings)
- recent behavior (optional)

### Logic:

1. Extract top 2 actions
2. Combine themes
3. Generate short narrative

### Example:

If actions are:
- reduce groceries
- pay down credit card

Summary:
- connect spending → debt → outcome

---

# Rendering

## Layout

```html
<div class="card ai-summary">
  <div class="ai-summary-headline">...</div>
  <ul class="ai-summary-bullets">
    <li>...</li>
    <li>...</li>
  </ul>
</div>
```

## CSS

```css
.ai-summary {
  padding: 18px;
  background: rgba(255,255,255,0.02);
  border: 1px solid var(--border);
}

.ai-summary-headline {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
  margin-bottom: 8px;
}

.ai-summary-bullets {
  padding-left: 16px;
  font-size: 12px;
  color: var(--sub);
}
```

---

# Phase 3 Refinements to Include

## 1. Snapshot Strip (confirm)
- ensure dividers applied
- reads as one unit

## 2. NBA Layout Extraction
- ensure `.nba-row`, `.nba-main`, `.nba-copy` used

## 3. Action Card Softening
- confirm calmer background layer applied

## 4. Delete Button Tone
- muted default, red on hover

## 5. Snooze Copy
- standardized: `Action snoozed for 7 days`

---

# Focus Mode Refinements to Include

## 1. Header context
Add:
- `Focus Mode` eyebrow
- structured header block

## 2. Section hierarchy
- make “Next steps” visually primary

## 3. Priority indicator
- add subtle pill near title

## 4. Close affordance
- explicit X or back control

## 5. Step clarity
- first step should be immediately actionable

---

# Build Order

## Step 0 — Complete refinements
- Phase 3 polish items
- Focus Mode improvements

## Step 1 — Build AI Summary generator
- simple rule-based function

## Step 2 — Build component
- `ai-summary.js`

## Step 3 — Insert into dashboard
- under hero

## Step 4 — Tune copy
- short
- calm
- no fluff

---

# Acceptance Criteria

- appears on dashboard
- reads in <3 seconds
- aligns with top actions
- improves understanding of priorities
- feels intelligent but not verbose

---

# Definition of Done

User opens app and immediately understands:
- what matters
- why it matters
- what to do

---

# Product Reminder

WealthFlow is not a dashboard.
It is a **decision engine**.

AI Summary is the layer that makes that intelligence visible.
