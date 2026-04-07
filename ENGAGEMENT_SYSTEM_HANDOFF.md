# Engagement System + Refinements Handoff

## Purpose
This phase builds on the proactive system and personalization engine to introduce **behavior reinforcement and habit formation**.

The goal is NOT gamification.
The goal is:
> **consistent, confident financial action over time**

---

# Product Goal

Move from:
- user occasionally takes action

To:
- **user regularly completes meaningful financial actions**

---

# Core Principles

## 1. Reinforce, don’t gamify
No points, no flashy streaks, no dopamine spam.

## 2. Progress should feel real
Feedback should reflect meaningful actions.

## 3. Stay calm and intelligent
Tone must match WealthFlow’s system:
- calm
- confident
- non-judgmental

---

# Included Refinements (from prior reviews)

## Proactive system refinements

### 1. Deduplication (MUST)

Add hash-based ID for nudges:
```js
const hash = crypto.createHash('md5').update(message).digest('hex');
```

- reuse ID if same message
- avoid repeating same nudge every render

---

### 2. Cooldown system

Add per-type cooldowns:
```js
if (recentlyShown('overspending', 3)) return;
```

---

### 3. Personalization integration

Use profile:
- boost relevant nudges
- suppress low-value ones

---

### 4. Add related action linkage

Each nudge should include:
```json
{
  "related_action_category": "debt"
}
```

Clicking nudge should:
- open relevant action
- or launch focus mode

---

### 5. Improve “why now” messaging

Upgrade from:
- "You’re overspending"

To:
- "You’re already 15% over budget this month — tightening now could improve cash flow"

---

## Personalization refinements

### 1. Add time decay

Recent behavior weighs more than old behavior.

### 2. Dismiss vs snooze differentiation

- dismiss → mild penalty
- snooze → neutral

### 3. Urgent override

Urgent actions bypass personalization.

### 4. Visibility floor

Avoid hiding categories entirely.

---

# Engagement System Overview

## What this adds

- progress feedback
- momentum tracking
- subtle habit reinforcement

---

# Core Features

## 1. Weekly Progress Signal (HIGH PRIORITY)

### Purpose
Reinforce progress without gamification.

### Example

"You completed 3 meaningful actions this week"

---

## Implementation

### Compute

```js
completedLast7Days = count(actions where completed_at > now - 7 days)
```

### Render (dashboard)

```html
<div class="card progress-strip">
  You completed 3 meaningful actions this week
</div>
```

---

## 2. Momentum State (VERY HIGH VALUE)

### Purpose
Reflect current engagement state

### States

- building momentum → 2–4 actions
- strong momentum → 5+ actions
- low activity → 0–1 actions

---

### Example copy

- "You’re building momentum — keep going"
- "You’ve been consistent this week"
- "Take one small step to get back on track"

---

## 3. Action Completion Feedback Upgrade

Enhance existing toast:

From:
- "Nice — progress made"

To occasionally:
- "Nice — that’s 3 actions this week"

(only every few completions)

---

## 4. Focus Mode Completion Reinforcement

When user completes action in Focus Mode:

Add brief inline state:

"Nice — that moves you forward"

Delay close slightly (150–250ms)

---

## 5. Streaks (OPTIONAL — KEEP SUBTLE)

DO NOT show obvious streak counters.

Instead:
- implicit reinforcement
- occasional messaging

Example:

"You’ve taken action consistently this week"

---

## 6. Nudge Reinforcement Loop

If user completes action tied to nudge:

- reduce similar nudges
- reinforce success in summary

---

# Data Model

## Add fields

### actions table

```sql
completed_at TEXT
```

---

## Optional signals

- weekly_completion_count
- last_action_timestamp

---

# New Helpers

## Create

```text
src/main/engagement-engine.js
```

## Responsibilities

- compute weekly progress
- determine momentum state
- provide messaging

---

## API

```js
class EngagementEngine {
  getWeeklyCompletionCount() {}
  getMomentumState() {}
  getProgressMessage() {}
}
```

---

# UI Integration

## Dashboard

Insert below snapshot or near momentum strip:

```js
renderProgressStrip()
```

---

## Focus Mode

- show completion reinforcement

---

## Toast system

- enhance existing messages

---

# Build Order

## Phase A — Fix systems

1. proactive deduplication
2. cooldowns
3. personalization fixes

---

## Phase B — Add engagement engine

- weekly count
- momentum state

---

## Phase C — UI

- progress strip
- improved toasts

---

## Phase D — refine messaging

- reduce noise
- ensure tone consistency

---

# Acceptance Criteria

## Engagement system

- user sees weekly progress
- messaging feels calm and useful
- no gamification feel

## System integration

- nudges reduce after completion
- personalization aligns with behavior

---

# Definition of Done

The system should feel:
- encouraging
- intelligent
- non-intrusive

User should feel:
- progress is real
- actions matter
- system supports them

---

# Product Reminder

WealthFlow should build behavior, not just insight.

Engagement should feel like:
> quiet momentum, not loud motivation
