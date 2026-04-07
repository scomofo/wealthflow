# Proactive System + Priority Fixes Handoff

## Purpose
This phase upgrades WealthFlow from:
- reactive (user opens app → sees insights)

To:
- **proactive (system surfaces timely nudges and guidance automatically)**

This handoff also includes **priority fixes to the personalization engine** identified in review.

---

# Product Goal

Move from:
> “Here’s what you should do”

To:
> “Hey — this needs your attention right now”

The system should feel:
- timely
- helpful
- calm (not spammy)
- trustworthy

---

# Included Priority Fixes (DO FIRST)

## 1. Add Time Decay to Signals (CRITICAL)

### Problem
All signals currently have equal weight forever.

### Fix
Apply recency weighting when computing profile:

```js
function applyTimeDecay(count, lastUpdated) {
  const ageDays = (Date.now() - new Date(lastUpdated).getTime()) / (1000 * 60 * 60 * 24);

  if (ageDays < 7) return count * 1.0;
  if (ageDays < 30) return count * 0.7;
  return count * 0.4;
}
```

Apply when building completion/dismiss counts.

---

## 2. Differentiate Dismiss vs Snooze

### Problem
Dismiss is currently treated as dislike.

### Fix
- dismiss → mild negative bias
- snooze → neutral (or slight positive)

```js
if (eventType === 'dismiss') {
  penalty = -3;
}

if (eventType === 'snooze') {
  penalty = 0;
}
```

---

## 3. Add Critical Override (MUST)

### Problem
Personalization can suppress important actions.

### Fix

```js
if (action.priority === 'urgent') {
  return action;
}
```

Ensure urgent actions bypass personalization adjustments.

---

## 4. Add Visibility Floor

### Problem
Feedback loops can hide entire categories.

### Fix

```js
delta = Math.max(delta, -5);
```

Or enforce minimum rank presence for important categories.

---

## 5. Improve Summary Emphasis Logic

### Problem
Summary only uses behavior.

### Fix
Combine:
- behavior (primary focus)
- financial state

Example:

```js
if (highDebt && lowCashflow) return 'debt_reduction';
if (strongCashflow && lowSavings) return 'savings_growth';
```

---

# Proactive System Overview

## What this adds

The system can:
- surface nudges without manual refresh
- highlight time-sensitive actions
- reinforce good behavior

---

# Types of Proactive Events

## 1. Time-based nudges
- bills due soon
- end-of-month check-in

## 2. Behavior-based nudges
- user hasn’t completed actions recently
- repeated snoozing

## 3. Opportunity nudges
- unused contribution room
- surplus cash flow detected

## 4. Risk nudges
- overspending detected
- debt increasing

---

# UX Surface Options

## V1 (recommended)

### A. Inline dashboard banner

```html
<div class="card proactive-banner">
  You’re overspending this month — tightening groceries could improve cash flow by $180
</div>
```

### B. Priority badge in actions

- highlight “why now”

---

## V2 (later)
- notifications
- email nudges
- mobile push

---

# New Engine

## Create

```text
src/main/proactive-engine.js
```

## Responsibilities

- evaluate triggers
- generate nudges
- rank urgency
- return active messages

## API

```js
class ProactiveEngine {
  evaluate(state, profile) {}
  getActiveNudges() {}
}
```

---

# Nudge Object

```json
{
  "id": "...",
  "type": "risk",
  "message": "You’re overspending this month — tightening groceries could improve cash flow",
  "priority": "high",
  "related_action_id": "...",
  "expires_at": "..."
}
```

---

# Trigger Examples

## Overspending

```js
if (categorySpend > threshold) {
  createNudge('risk', 'You’re overspending...');
}
```

## Inactivity

```js
if (noActionsCompletedIn7Days) {
  createNudge('behavior', 'You haven’t taken action recently');
}
```

## Opportunity

```js
if (availableContributionRoom > threshold) {
  createNudge('opportunity', 'You have unused TFSA room');
}
```

---

# Dashboard Integration

## Insert

In `dashboard.js`, above snapshot or below hero:

```js
renderProactiveBanner(nudges)
```

## Rules

- max 1–2 visible at once
- do not overwhelm

---

# Styling

```css
.proactive-banner {
  padding: 14px 16px;
  border: 1px solid var(--border);
  background: rgba(255,255,255,0.03);
  font-size: 13px;
}
```

---

# Behavior Rules

- show only relevant nudges
- auto-expire stale ones
- do not repeat same message excessively

---

# Build Order

## Phase A — Fix personalization
1. time decay
2. dismiss vs snooze
3. urgent override
4. visibility floor
5. summary logic improvement

## Phase B — Build proactive engine
- create file
- implement triggers

## Phase C — UI integration
- banner
- limited display

## Phase D — refine logic
- reduce noise
- improve timing

---

# Acceptance Criteria

## Personalization fixes
- recent behavior matters more than old
- urgent actions always visible
- dismiss does not overly suppress

## Proactive system
- relevant nudges appear
- no spam
- nudges align with financial state and actions

---

# Definition of Done

The system feels:
- timely
- helpful
- not intrusive

User feels:
- guided without needing to search
- informed at the right moments

---

# Product Reminder

WealthFlow should not wait for the user.

It should surface the right insight at the right moment — calmly and clearly.
