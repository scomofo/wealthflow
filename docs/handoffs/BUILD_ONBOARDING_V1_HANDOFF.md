# Build Onboarding V1 Handoff

## Purpose
Build the first real onboarding experience for WealthFlow.

This is the missing layer between:
- a strong financial decision system
- and a new user who has no context

The goal is not to teach features.
The goal is to get the user to their first real value moment fast.

---

# Launch Goal
A new user should understand all of this in under 60 seconds:
- what WealthFlow is
- why it is different
- what they should do first
- what value they are getting

The user should think:
> This tells me what to do with my money

Not:
> What is this supposed to do?

---

# Product Principle
## Show, then explain only where needed
Avoid:
- feature tours
- long copy blocks
- dense setup forms
- tutorial modals

Prefer:
- one clear positioning screen
- minimal financial input
- immediate action generation
- one guided first action

---

# V1 Onboarding Flow

## Step 1 — Positioning screen
### Goal
Make the product promise instantly clear.

### Screen copy
**Title**
WealthFlow helps you decide what to do with your money

**Subtitle**
Not just track it

**Support copy**
Built for Canadians. Calm, practical financial guidance based on your situation.

**CTA**
Get started

### Optional trust row
- Built for Canadian users
- Guidance, not financial advice
- Your data stays private

Keep this compact.

---

## Step 2 — Minimal financial setup
### Goal
Collect just enough data to generate useful output.

### Required inputs
- Monthly income
- Estimated monthly expenses

### Optional inputs
- Total debt
- Savings / cash buffer
- Province

### UX rules
- single compact form or 2 short steps max
- allow skipping optional fields
- explain in one line why each section matters
- do not ask for more than 2–3 minutes of effort

### Input copy examples
**Monthly income**
Use your after-tax monthly take-home if possible

**Monthly expenses**
A rough estimate is fine

**Debt**
Optional, but helpful if you want stronger payoff guidance

**Savings**
Optional, but useful for emergency fund and contribution decisions

---

## Step 3 — Instant value screen
### Goal
Generate immediate output from the provided data.

### Show
- 2–3 next best actions
- simple summary line
- one highlighted first action

### Headline
Here are your top priorities right now

### Support line
We generated these from the information you just entered

### Important rule
Even with partial input, show meaningful output.
Do not block progress waiting for perfect data.

---

## Step 4 — Guided first action
### Goal
Create the first “aha” moment and reduce hesitation.

### UI treatment
One action should be visually emphasized with:
- label: Start here
- CTA: Focus on this

### Helper copy
Focus Mode helps you complete this step without distractions

This should be the first time the user sees Focus Mode explained.
Keep it contextual.

---

## Step 5 — First completion feedback
### Goal
Reinforce that the system works and progress is real.

### After first action completion
Show:
- Nice — you’ve taken your first step
- optional support line: That already improves your financial position

### Important
This moment matters more than any onboarding explanation.
It proves the product.

---

# Empty State Requirements
These are mandatory because first-run data is always incomplete.

## Dashboard AI Summary
Add fallback copy such as:
Your finances are steady right now — add a little more detail to sharpen your summary.

## Next Best Actions
Add fallback copy such as:
Add income and expenses to generate personalized next steps.

## Snapshot bar
Add fallback copy such as:
Complete setup to view your financial snapshot.

## Focus Mode
If action detail is thin, still show a simple guided step list.
Do not let Focus Mode feel empty.

---

# First-Session Fallback Actions
If the user provides minimal information, generate lightweight starter actions.

## Examples
- Track your top 3 spending categories this week
- Review your largest recurring expense
- Estimate your monthly debt payments
- Add your TFSA or RRSP contribution room for better recommendations

### Goal
Never leave the user without something actionable.

---

# Trust and Clarity Notes
These should be visible during onboarding or immediately after.

## Trust signals
- Built for Canadian users
- Guidance, not financial advice
- Your data stays private

## Clarity signals
- Based on your inputs
- You can refine this later
- A rough estimate is enough to get started

These reduce perfection anxiety and improve conversion.

---

# Files to Create
```text
src/renderer/js/pages/onboarding.js
src/renderer/js/components/onboarding-stepper.js
src/renderer/js/components/onboarding-empty-state.js
```

If you prefer to keep V1 smaller, the empty-state component can be deferred and handled inline.

---

# Files to Modify
```text
src/renderer/js/app.js
src/renderer/js/state.js
src/renderer/js/pages/dashboard.js
src/renderer/js/components/focus-mode.js
src/renderer/styles/main.css
src/renderer/styles/theme.css
```

Depending on how settings are stored, you may also need:
```text
src/main/database.js
src/main/ipc-handlers.js
```

---

# State and Routing Requirements

## Add onboarding state
Add at minimum:
```js
hasCompletedOnboarding: boolean
onboardingData: {
  monthlyIncome?: number,
  monthlyExpenses?: number,
  totalDebt?: number,
  savings?: number,
  province?: string
}
```

## Routing rule
In app bootstrap / routing logic:
- if user is not onboarded → show onboarding page
- if onboarded → show dashboard

If you already have an earlier onboarding wizard in the app, this V1 should either:
- replace it for launch
- or become the new streamlined first-run mode before the deeper setup

Do not force users into a long profile wizard before value is shown.

---

# Recommended Implementation Approach

## Option A — Best launch path
Create a very short onboarding page with 3 visible stages:
1. position
2. setup
3. result

This keeps the user in one flow and minimizes navigation complexity.

## Option B — Inline dashboard onboarding
Use a dashboard takeover for first run.
This is workable, but less clean.

Recommended choice:
- Option A for clarity

---

# Component Guidance

## onboarding.js
This page should manage the onboarding stages:
- intro
- setup
- results

Suggested API:
```js
renderOnboarding(state, onboardingStep)
```

## onboarding-stepper.js
Keep it simple and lightweight.
Possible steps:
- Start
- Setup
- Your priorities

Do not overbuild a wizard framework here.

---

# Data Handling Guidance

## Minimal data should be usable immediately
Use the onboarding data to seed or infer:
- approximate cash flow
- debt state
- basic action recommendations

If you don’t want to write directly into the full financial data model at first, you can:
- store onboarding data temporarily
- generate starter actions from it
- prompt the user later to complete full profile setup

This is acceptable for V1.

---

# Focus Mode Integration Notes
These are included from prior refinement reviews because onboarding and Focus Mode should work together.

## Required Focus Mode refinements
1. Add explicit header context
   - Focus Mode eyebrow
   - title
   - subtitle

2. Make “Next steps” visually primary
   - stronger section style than support sections

3. Add priority indicator near title
   - use existing priority-pill system

4. Add clear close/back affordance
   - do not rely only on modal chrome

5. Improve first-step wording
   - first step should be immediate and concrete
   - example: Open your transactions for this category

These changes matter because onboarding uses Focus Mode as the user’s first meaningful action tool.

---

# Dashboard Refinement Notes To Include
These are the most important dashboard-adjacent refinements to include alongside onboarding.

## 1. AI Summary fallback state
If no full summary exists yet, show a calm fallback instead of nothing.
Example:
Your finances are steady right now — add a little more detail to sharpen your summary.

## 2. AI Summary connection line
Add subtle context such as:
Based on your top actions

## 3. Confidence wording
Use:
- High confidence
- Medium confidence
- Low confidence

Not only:
- high
- medium
- low

## 4. Next Best Actions fallback state
Ensure new users see guidance, not emptiness.

## 5. Snapshot strip cohesion
Keep the strip reading as one system, not four disconnected stat boxes.

---

# Proactive + Personalization Notes To Include
These are not blockers for onboarding V1, but they should be respected if touched.

## Personalization safety rules
- recent behavior should matter more than old behavior
- urgent actions must bypass personalization suppression
- dismiss should not equal permanent dislike
- snooze should be neutral or near-neutral

## Proactive system safety rules
- dedupe repeated nudges
- add cooldowns
- limit visible nudges to 1–2
- keep tone calm, not alarmist

---

# Build Order

## Phase A — Core onboarding flow
1. create onboarding page
2. add positioning screen
3. add minimal setup form
4. add instant value results screen
5. add first action highlight + Focus Mode entry

## Phase B — First-run dashboard support
6. add empty states
7. add AI Summary fallback state
8. add trust microcopy where needed

## Phase C — Focus Mode alignment
9. apply Focus Mode refinements
10. ensure first action completion feedback feels meaningful

---

# Acceptance Criteria

## User understanding
- user understands product value in under 60 seconds
- user sees immediate output from their input
- user is shown one obvious first step

## User behavior
- user can enter minimal data quickly
- user can skip optional fields without breaking flow
- user can complete one meaningful action in first session

## Product quality
- empty states guide forward
- onboarding does not feel like a setup chore
- Focus Mode feels like part of the first-run experience, not a hidden advanced feature
- trust signals are visible but unobtrusive

---

# Definition of Done
Onboarding V1 is complete when a brand new user opens WealthFlow, understands the promise quickly, sees personalized priorities fast, and completes at least one meaningful step without confusion.

The first-session experience should feel:
- clear
- calm
- useful
- confidence-building

Not:
- abstract
- overwhelming
- overexplained

---

# Product Reminder
Onboarding is not just setup.
It is the moment WealthFlow proves its value.

The system is already strong.
This flow needs to make that strength obvious immediately.
