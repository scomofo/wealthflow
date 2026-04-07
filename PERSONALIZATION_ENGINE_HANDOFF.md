# Personalization Engine Handoff

## Purpose
The Personalization Engine is the next major product layer for WealthFlow.

You already have:
- Dashboard → awareness
- Next Best Actions → prioritization
- Focus Mode → execution
- AI Summary → interpretation

Personalization adds:
> **adaptation over time**

It should make WealthFlow feel less like a smart static system and more like a financial command center that learns what matters most to this specific user.

---

# Product Goal
Move from:
- smart recommendations

To:
- **smart recommendations that adapt to the user’s behavior, financial profile, and priorities**

The user should increasingly feel:
- this app understands my situation
- this app emphasizes the right things for me
- this app is getting more useful over time

---

# Core Principles

## 1. Rule-first, adaptation-second
Do not jump straight to black-box AI personalization.
Start with transparent, deterministic signals.

## 2. Personalization should improve ranking and presentation first
Do not begin by inventing highly complex recommendation logic.
Start by improving:
- which actions rise to the top
- how they are framed
- what the summary emphasizes

## 3. Avoid creepy behavior
Do not make the user feel watched.
WealthFlow should feel attentive, not invasive.

## 4. Preserve trust
Any personalization should remain explainable.
If the app changes emphasis, it should still make intuitive sense.

---

# Included Refinements From Prior Reviews
These should be included as part of this handoff because they improve the foundation the personalization engine will build on.

## AI Summary refinements to include

### 1. Extract header styles from inline usage
In `src/renderer/js/components/ai-summary.js`, move repeated inline header styles into shared classes.

Add CSS such as:
```css
.ai-summary-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.ai-summary-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--sub);
  font-weight: 600;
}

.ai-summary-confidence {
  margin-left: auto;
}
```

Goal:
- reduce inline styling
- align with the rest of the dashboard visual system

### 2. Clarify confidence language
Current confidence signal is useful, but slightly ambiguous.

Recommended label:
- `High confidence`
- `Medium confidence`
- `Low confidence`

Alternative:
- keep the pill but add tooltip/explanatory copy later

### 3. Better connect AI Summary to actions
The summary should explicitly feel connected to the user’s top actions.

Add a small line such as:
- `Based on your top actions`

Or reinforce connection through wording and highlighted terms.

Goal:
- strengthen narrative → action continuity

### 4. Elevate AI Summary visually
Use a stronger but restrained treatment so it reads like the intelligence layer.

Suggested CSS:
```css
.ai-summary {
  background: linear-gradient(150deg, var(--abg), transparent 70%);
  border: 1px solid rgba(196,147,90,.18);
}
```

### 5. Tighten bullet spacing
Make bullets easier to scan quickly.

### 6. Add fallback state
Instead of returning nothing when no summary exists, show a low-noise fallback such as:
- `Your finances are steady right now — no major changes need attention.`

Goal:
- preserve the feeling of continuity and intelligence

---

## Focus Mode refinements to include

### 1. Add explicit header context
Focus Mode should begin with a real header block:
- `Focus Mode` eyebrow
- title
- subtitle

### 2. Make “Next steps” visually primary
Use a more prominent section style for the action steps.

### 3. Add priority indicator near title
Use the existing priority-pill system.

### 4. Add clear close/back affordance
Do not rely on modal chrome alone.
Make exit obvious.

### 5. Improve first-step actionability
Make the first step more immediate and behavior-driving.
Example:
- instead of `Review your spending...`
- use `Open your transactions for this category`

Goal:
- increase completion likelihood

---

# Personalization Engine Scope

## In scope
- personalization signals
- ranking adjustments for next best actions
- AI summary emphasis adjustments
- focus mode step framing adjustments
- lightweight user preference memory
- behavior-based weighting

## Out of scope
- invasive tracking
- fully autonomous financial advice
- machine learning infrastructure
- cloud model training
- opaque personalization that cannot be explained

---

# What Personalization Should Affect First

## 1. Next Best Actions ranking
The most important initial use.

The engine should adjust which actions rise higher based on:
- what the user has ignored repeatedly
- what the user completes consistently
- current financial profile priorities
- account types and Canadian context
- short-term vs long-term orientation

## 2. AI Summary emphasis
The summary should adapt which themes it emphasizes.

Examples:
- debt-heavy user → debt drag emphasized earlier
- savings-focused user → contribution room and savings momentum emphasized more
- user with repeated overspending → cashflow/control framing emphasized more

## 3. Focus Mode wording and steps
Focus Mode should choose slightly different step framing depending on:
- action category
- user behavior patterns
- profile completeness

## 4. Dashboard microcopy
Microcopy can adapt gently.

Examples:
- `Your biggest gain this month is debt reduction`
- `Your strongest opportunity right now is using available TFSA room`

---

# Personalization Signals

## New signal categories

### A. Completion behavior
Track:
- which action categories the user completes most
- which action categories are often dismissed
- which action categories are snoozed repeatedly

### B. Financial profile signals
Use existing state such as:
- province
- debt levels
- savings rate
- contribution room
- advisor profile fields
- registered account usage
- emergency fund state

### C. Goal orientation
If user goals skew toward:
- debt freedom
- home purchase
- retirement
- education savings

Then ranking and summary emphasis should shift accordingly.

### D. Interaction preference signals
Track lightweight preference indicators such as:
- whether user uses Focus Mode often
- whether user saves workflow actions to plan
- whether user refreshes actions often
- whether user tends to dismiss vs snooze

### E. Consistency signals
Examples:
- completed 4 debt-related actions in last 30 days
- ignored budget actions for 3 consecutive cycles

These are useful for ranking and phrasing.

---

# Data Model

## Recommended new persistence
Create a lightweight personalization signals table.

Suggested migration:
```text
src/main/migrations/011-personalization-signals.js
```

### SQL
```sql
CREATE TABLE IF NOT EXISTS personalization_signals (
  id TEXT PRIMARY KEY,
  signal_type TEXT NOT NULL,
  signal_key TEXT NOT NULL,
  signal_value TEXT,
  numeric_value REAL,
  source_entity_type TEXT,
  source_entity_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

## Example signal rows
- `completion_rate` / `debt_actions`
- `dismiss_rate` / `budget_actions`
- `focus_mode_usage` / `debt`
- `goal_priority` / `home_purchase`
- `profile_signal` / `high_debt_low_cashflow`

## Alternative lighter approach
If you want the first version even simpler, store an aggregated personalization object in settings.

Example:
```json
{
  "preferred_action_categories": ["debt", "cashflow"],
  "ignored_action_categories": ["budget"],
  "focus_mode_usage_count": 8,
  "summary_emphasis": "debt"
}
```

Recommended path:
- start simple in settings or a small signals table
- only expand once the ranking logic is stable

---

# New Engine

## Create
```text
src/main/personalization-engine.js
```

## Responsibilities
- read personalization signals
- compute weighting adjustments
- return normalized personalization profile
- expose helpers for ranking and summary emphasis

## Suggested API
```js
class PersonalizationEngine {
  constructor(database) {
    this.database = database;
  }

  async buildProfile() {}
  async recordInteraction(event) {}
  applyActionWeighting(actions, profile) {}
  chooseSummaryEmphasis(actions, profile, financials) {}
  adaptFocusModeSteps(action, profile) {}
}
```

---

# Personalization Profile Shape

Example output:
```json
{
  "primary_focus": "debt",
  "secondary_focus": "cashflow",
  "completion_bias": {
    "debt": 1.2,
    "budget": 0.9,
    "investing": 1.0
  },
  "dismiss_bias": {
    "budget": 1.3
  },
  "focus_mode_affinity": true,
  "summary_emphasis": "debt_reduction",
  "confidence": "medium"
}
```

This should be explainable and derived from simple rules.

---

# Ranking Adjustments for Next Best Actions

## Goal
Personalization should refine ranking, not replace the base engine.

## Formula
Use base score from Next Best Actions engine, then apply a bounded modifier.

Example:
```js
finalScore = baseScore + personalizationDelta
```

Where `personalizationDelta` is capped to prevent runaway ranking distortion.

## Example rules

### Rule 1 — repeated completion boost
If user consistently completes debt actions:
- debt action score +5 to +10

### Rule 2 — repeated dismiss penalty
If user repeatedly dismisses budget actions:
- budget action score -5
- but do not suppress critical/urgent actions entirely

### Rule 3 — strong profile priority boost
If user has high-interest debt and weak cashflow:
- debt and cashflow actions get boost

### Rule 4 — goal alignment boost
If primary goal is home purchase:
- cash savings and contribution room actions may rank higher than generic education actions

## Guardrail
Critical actions must remain visible even if historically ignored.

Do not let personalization hide urgent reality.

---

# AI Summary Personalization

## Goal
Change emphasis, not just wording.

## Examples

### Debt-oriented profile
Headline:
- `This month, your biggest gains come from reducing interest drag and improving monthly flexibility.`

### Savings-oriented profile
Headline:
- `This month, your strongest opportunity is converting extra cash flow into long-term savings progress.`

### Budget-pressure profile
Headline:
- `This month, restoring spending control will improve both flexibility and goal progress.`

## Rule
The summary should still reflect the actual top actions.
Personalization changes emphasis and narrative shape, not the underlying facts.

---

# Focus Mode Personalization

## Goal
Make Focus Mode feel more personally useful.

## V1 examples

### If user tends to act quickly
Use direct first steps:
- `Open your transactions for this category`

### If user tends to snooze
Use slightly more concrete framing:
- `Choose one expense to cut today and set a target amount`

### If profile is incomplete
Add a step such as:
- `Confirm your available room before making a contribution`

## Guardrail
Do not generate long, branching flows.
Keep 2–3 steps maximum.

---

# Interaction Recording

## Track these events first

### Dashboard / NBA
- next_best_action_completed
- next_best_action_dismissed
- next_best_action_snoozed
- next_best_action_refreshed
- focus_mode_opened

### Workflow / Plan
- workflow_action_saved
- recommended_action_completed
- recommended_action_deleted

### Summary
- optional later: AI summary expanded / dismissed

## Suggested data captured
- category
- source_type
- workflow_type if present
- timestamp

Goal:
- enough for meaningful pattern detection
- not excessive analytics

---

# Files to Modify

## New
```text
src/main/personalization-engine.js
```

## Existing
```text
src/main/database.js
src/main/ipc-handlers.js
src/main/next-best-actions-engine.js
src/renderer/js/state.js
src/renderer/js/components/ai-summary.js
src/renderer/js/components/focus-mode.js
src/renderer/js/handlers/shared.js
src/renderer/js/pages/dashboard.js
src/renderer/styles/main.css
```

If Phase 3 architecture split is further along in your branch, place the persistence and logic in the relevant repo/service modules instead of central files.

---

# Implementation Plan

## Step 0 — Apply included refinements first
1. AI Summary header style extraction
2. AI Summary confidence clarification
3. AI Summary action linkage line
4. AI Summary elevated card treatment
5. AI Summary fallback state
6. Focus Mode header / next-step emphasis / priority pill / close affordance / step wording improvements

## Step 1 — Add personalization signal storage
- migration or settings-based profile store
- read/write helpers

## Step 2 — Build PersonalizationEngine
- aggregate signals
- derive profile
- expose weighting helpers

## Step 3 — Record interaction events
- hook into action handlers
- record complete / dismiss / snooze / focus open / save action

## Step 4 — Apply ranking adjustments to NBA
- keep base scoring intact
- add bounded modifiers

## Step 5 — Personalize AI Summary emphasis
- choose summary framing based on profile + actual actions

## Step 6 — Personalize Focus Mode step framing
- adapt first step and wording based on profile where useful

---

# Suggested Renderer Updates

## AI Summary component
Enhance `src/renderer/js/components/ai-summary.js` to:
- use shared header classes
- show `Based on your top actions`
- use `High confidence` style labels
- show fallback summary state when no headline exists

## Focus Mode component
Enhance `src/renderer/js/components/focus-mode.js` to:
- add `Focus Mode` eyebrow/header
- add priority pill near title
- emphasize next steps section
- include explicit close/back affordance
- improve first step wording to be more immediate

---

# Build Order

## Phase A — Refinement foundation
- AI Summary refinements
- Focus Mode refinements

## Phase B — Signal capture
- persistence
- interaction recording

## Phase C — Ranking personalization
- profile build
- score modifiers

## Phase D — Narrative personalization
- AI Summary emphasis
- Focus Mode phrasing

---

# Acceptance Criteria

## Refinement acceptance
- AI Summary uses shared visual classes
- AI Summary confidence is clearer
- AI Summary is visually elevated and connected to actions
- AI Summary has a graceful fallback state
- Focus Mode has stronger header context and clearer next-step emphasis

## Personalization acceptance
- the app records interaction signals from key action flows
- next best action ranking adapts subtly over time
- AI Summary emphasis changes in ways that match user profile and behavior
- Focus Mode step framing becomes more relevant to user patterns
- urgent actions are never hidden by personalization

---

# Definition of Done
The personalization engine is complete when WealthFlow starts adapting intelligently to the user’s actual financial situation and behavior without becoming opaque, noisy, or overly complex.

The user should feel:
- this app gets smarter the more I use it
- this app understands what matters for me
- this app keeps showing me the right next step

---

# Product Reminder
WealthFlow is not just a smart dashboard.
It is a **decision-first financial command center that should become more personally useful over time**.

Personalization should make the product feel more aligned, not more complicated.
