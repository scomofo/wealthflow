# Onboarding Flow Handoff

## Purpose
Onboarding is the bridge between:
- a powerful system
- and a user who has no context

The goal is NOT to explain everything.
The goal is:
> **get the user to their first “aha” moment in under 60 seconds**

---

# Product Goal

User should quickly understand:
- what this app does
- what to do next
- why it matters

---

# Core Principle

## Show → don’t explain

Avoid:
- long text
- tutorials
- feature explanations

Instead:
- guide through action
- reveal value quickly

---

# Onboarding Flow Structure

## Step 1 — Positioning Screen (5–7 seconds)

### UI

Title:
> WealthFlow helps you decide what to do with your money

Subtitle:
> Not just track it

CTA:
> Get started

---

## Step 2 — Quick Financial Setup (2–3 min max)

### Collect only essentials

- Monthly income
- Major expenses (or estimate)
- Debt (optional but recommended)
- Savings (optional)

### UX rules
- single screen or short stepper
- allow skipping
- no friction

---

## Step 3 — Instant Value Generation

Immediately after input:

Show:
> “Here are your top priorities right now”

Display:
- 2–3 Next Best Actions

---

## Step 4 — Guided First Action (CRITICAL)

Highlight ONE action:

> “Start here”

Add CTA:
> Focus on this

---

## Step 5 — Focus Mode Intro

Small helper text:
> Focus Mode helps you complete this step

No modal tutorial — just contextual hint

---

## Step 6 — First Completion Feedback

When user completes first action:

Show:
> Nice — you’ve taken your first step

Optional:
> That improves your financial position immediately

---

# Empty State Design (MANDATORY)

## No data state

### AI Summary
> Add your financial details to see what matters most

### Next Best Actions
> Add income and expenses to generate personalized actions

### Snapshot
> Complete setup to view your financial snapshot

---

# First Session Aha Strategy

Even with minimal data:

Generate fallback actions:

- Track your top 3 spending categories this week
- Review your largest recurring expense

---

# Trust Signals

Add small text in onboarding:

- Your data stays private
- Built for Canadian users
- Guidance, not financial advice

---

# Implementation Plan

## New files

src/renderer/js/pages/onboarding.js
src/renderer/js/components/onboarding-stepper.js

---

## State

Add flag:

```js
hasCompletedOnboarding: boolean
```

---

## Routing

If not onboarded:
- show onboarding
Else:
- show dashboard

---

# Build Order

1. Positioning screen
2. Input form (minimal)
3. Generate basic actions
4. Highlight first action
5. Add completion feedback

---

# Acceptance Criteria

- user understands product in <60 seconds
- user sees actionable output immediately
- user completes at least one action in first session

---

# Definition of Done

User opens app and thinks:
> “Oh — this tells me what to do”

Not:
> “What is this?”

---

# Product Reminder

Onboarding is not setup.

It is the moment the product proves itself.
