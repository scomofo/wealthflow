# WealthFlow Next Best Actions System — Build Handoff

## Objective
Build a **Next Best Actions** system that turns WealthFlow from a passive dashboard into an active financial command center.

This system should automatically generate, rank, display, and persist the most important actions a user should take next based on their real financial data.

This is **not** just another AI workflow button.
It is a product system that should:
- run proactively
- surface top actions on Home/Dashboard
- combine rule-based signals with optional AI refinement
- persist actions so users can complete, dismiss, or revisit them

---

## Product Goal
When a user opens WealthFlow, the dashboard should answer:
- What matters right now?
- What should I do next?
- Which action will improve my finances fastest?

The first implementation should focus on:
- surfacing 1–5 ranked actions
- making them feel native and trustworthy
- giving users clear progress / status handling

---

## Product Principles

### 1. Decision-first
Do not just show financial data. Convert signals into recommended actions.

### 2. Rule-first, AI-second
Use deterministic business rules first.
AI can refine wording, prioritization, or summaries later.
Do not make the first version dependent on model calls.

### 3. Low friction
The dashboard should show actions automatically.
The user should not need to ask for them.

### 4. Explainability
Each action should include:
- what to do
- why it matters
- urgency / priority
- expected impact if known

### 5. Persistent + manageable
Actions must be saveable and trackable, not ephemeral text blobs.

---

## System Scope

### In scope
- rule engine to generate candidate actions
- ranking / prioritization logic
- persistence for action state
- dashboard widget / panel
- complete / dismiss / snooze actions
- refresh / regenerate logic
- optional AI enrichment hook

### Out of scope
- cloud sync
- notification scheduling across devices
- automatic transaction execution
- fully dynamic ML scoring

---

## Core User Experience
On dashboard load, show a panel:

**Next Best Actions**

Example cards:
- Reduce Food/Groceries spending by $180 this month
- Put an extra $250 toward Visa balance
- Review your TFSA room and make a contribution
- 2 bills are due in the next 3 days
- Your emergency fund is below 1 month of expenses

Each card should support actions like:
- Mark done
- Dismiss
- Snooze
- View details

Optional CTA:
- Refresh actions
- Generate AI summary of why these matter

---

## Proposed Architecture

### Rule engine
A local rule engine generates candidate actions from app state.

### Ranking layer
Actions are scored and sorted by priority.

### Persistence layer
Generated actions are stored so status can be tracked.

### Dashboard UI layer
Render top 1–5 current actions.

### Optional AI enrichment layer
Later, AI can:
- rewrite titles / rationale
- combine related actions
- generate a short monthly game plan summary

---

# Data Model

## New table
Create a new migration:
```text
src/main/migrations/010-next-best-actions.js
```

### SQL
```sql
CREATE TABLE IF NOT EXISTS next_best_actions (
  id TEXT PRIMARY KEY,
  action_key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  rationale TEXT,
  category TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  score REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open',
  source_type TEXT NOT NULL DEFAULT 'rule',
  source_payload TEXT,
  related_entity_type TEXT,
  related_entity_id TEXT,
  impact_text TEXT,
  snoozed_until TEXT,
  generated_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT,
  dismissed_at TEXT,
  deleted_at TEXT
);
```

---

## Field meanings
- `action_key`: deterministic unique key for de-duping / regeneration, e.g. `budget_overrun_food_2026_04`
- `title`: concise action title
- `description`: optional user-facing detail
- `rationale`: why this matters
- `category`: budget, debt, bills, investing, tax, cashflow, planning
- `priority`: low / medium / high / urgent
- `score`: numeric ranking score
- `status`: open / done / dismissed / snoozed
- `source_type`: rule / ai / hybrid
- `source_payload`: raw supporting JSON
- `related_entity_type`: budget / debt / bill / goal / contribution_room / etc.
- `related_entity_id`: link to source record if applicable
- `impact_text`: optional expected impact
- `snoozed_until`: date string if user snoozes action

---

# Action Object Contract

## Canonical action shape
```json
{
  "action_key": "budget_overrun_food_2026_04",
  "title": "Reduce Food/Groceries spending by $180 this month",
  "description": "You are over budget in Food/Groceries based on current monthly spending.",
  "rationale": "Overspending in this category is reducing your monthly cash flow.",
  "category": "budget",
  "priority": "high",
  "score": 84,
  "source_type": "rule",
  "source_payload": {
    "budget_amount": 600,
    "actual_spending": 780,
    "over_amount": 180
  },
  "related_entity_type": "budget",
  "related_entity_id": "budget-food-1",
  "impact_text": "Improving this category by $180 would increase monthly free cash flow by the same amount."
}
```

---

# Rule Engine Design

## New file
```text
src/main/next-best-actions-engine.js
```

## Responsibilities
- inspect current financial state
- generate candidate actions
- assign scores
- dedupe by action_key
- persist results
- optionally merge with existing status where appropriate

---

## Required public API
```js
class NextBestActionsEngine {
  constructor(database) {
    this.database = database;
  }

  async generateActions(options = {}) {}
  rankActions(actions) {}
  mergeWithExisting(actions, existing) {}
}
```

---

# Initial Rule Set (V1)

Implement these first. Keep them deterministic.

## 1. Budget overrun rule
If actual spending > budget by meaningful threshold, generate an action.

### Trigger
- budget exists
- current month spending exceeds budget
- overage > max(50 CAD, 10% of budget)

### Example output
- Reduce Food/Groceries spending by $180 this month

### Suggested score
- base 70
- +10 if overrun > 20%
- +10 if category is top 3 spending categories

---

## 2. High-interest debt rule
If a debt exists above a threshold APR, generate an action.

### Trigger
- debt APR >= 8%
- balance > 0

### Example output
- Put an extra $250 toward Visa balance

### Suggested score
- base 80
- +10 if APR >= 15%
- +5 if balance > 5000

---

## 3. Bills due soon rule
If bills are due within the configured window, generate an action.

### Trigger
- next_due_date within 3 days (or settings-driven)

### Example output
- 2 bills are due in the next 3 days

### Suggested score
- urgent 90
- +5 if bill amount is material

---

## 4. Low emergency fund rule
If available cash/savings proxy is low relative to expenses, generate an action.

### Initial proxy logic
Since WealthFlow may not yet model cash perfectly, estimate using:
- goal named emergency fund if present, or
- liquid advisor assets if available, or
- low-confidence fallback

### Trigger
- emergency fund months < 1 month of expenses

### Example output
- Build your emergency fund to cover at least 1 month of expenses

### Suggested score
- base 75
- +10 if debt also exists

---

## 5. Unused contribution room rule
If TFSA / RRSP / FHSA room exists and user has positive savings signal, suggest review.

### Trigger
- contribution room > 0
- income > expenses or positive savings rate

### Example output
- Review your TFSA room and make a contribution

### Suggested score
- base 60
- +10 if TFSA room exists and no recent contributions

---

## 6. Goal off-track rule
If a savings goal has a deadline and current pace is behind schedule.

### Trigger
- goal.deadline exists
- current progress behind required monthly pace

### Example output
- Increase monthly savings for Vacation Fund to stay on target

### Suggested score
- base 65
- +10 if deadline within 6 months

---

## 7. Recurring payment detection rule
If recurring transactions are found but not tracked as bills, generate an action.

### Trigger
- recurring detector returns untracked patterns

### Example output
- Review 3 recurring payments and convert them into reminders

### Suggested score
- base 55

---

## 8. Missing financial profile rule
If profile completion is low, generate setup actions.

### Trigger
- user not onboarded fully or profile not completed

### Example output
- Complete your financial profile to improve recommendations

### Suggested score
- base 40

---

# Ranking Logic

## Priority buckets
Map score to priority:
- 85+ = urgent
- 70–84 = high
- 50–69 = medium
- below 50 = low

## Sorting
Sort by:
1. status eligibility (open first)
2. snooze expiry
3. descending score
4. newest generated_at if tied

## Display rule
Dashboard should show top 5 open, unsnoozed actions.

---

# Persistence Behavior

## Generation model
On generation:
1. build candidate actions
2. fetch existing open/done/dismissed/snoozed actions
3. merge by `action_key`
4. preserve user state when appropriate
5. insert new actions
6. update changed action content/score when same action_key still applies
7. optionally soft-delete stale open actions that no longer apply

### Important
Do not recreate completed actions immediately unless the underlying signal is still true in a future cycle and enough time has passed.

Suggested initial rule:
- if action was completed within last 7 days, do not regenerate identical key

---

# Database Methods

## Add to `database.js`
- `listNextBestActions(statusFilter?)`
- `upsertNextBestAction(action)`
- `completeNextBestAction(id)`
- `dismissNextBestAction(id)`
- `snoozeNextBestAction(id, untilDate)`
- `deleteNextBestAction(id)`
- `clearStaleNextBestActions(activeKeys)`

If Phase 3 repo split has started, place these in a dedicated `actionsRepo` or `nextBestActionsRepo`.

---

# IPC Surface

## Add handlers in `ipc-handlers.js`
- `actions:generate-next-best`
- `actions:list-next-best`
- `actions:complete-next-best`
- `actions:dismiss-next-best`
- `actions:snooze-next-best`
- `actions:delete-next-best`

### Behavior
`actions:generate-next-best` should:
- run the engine
- persist updates
- return top actions

---

# Preload / Renderer Bridge

## Expose methods
- `generateNextBestActions()`
- `getNextBestActions()`
- `completeNextBestAction(id)`
- `dismissNextBestAction(id)`
- `snoozeNextBestAction(id, untilDate)`
- `deleteNextBestAction(id)`

Keep naming consistent with existing app bridge patterns.

---

# Renderer State Layer

## Modify `src/renderer/js/state.js`
Add state slice:
```js
nextBestActions: []
```

## Add methods
- `loadNextBestActions()`
- `generateNextBestActions()`
- `completeNextBestAction(id)`
- `dismissNextBestAction(id)`
- `snoozeNextBestAction(id, untilDate)`
- `deleteNextBestAction(id)`

### Suggested behavior
- `loadAll()` should include next best actions
- `generateNextBestActions()` should refresh the slice after generation
- user actions should update local state immediately after successful IPC call

---

# Dashboard UI

## New component
```text
src/renderer/js/components/next-best-actions-panel.js
```

## Render requirements
Show:
- section title: `Next Best Actions`
- optional subtext: `Your highest-impact financial actions right now`
- 1–5 action cards
- action title
- rationale / impact text
- priority badge
- action buttons

### Each card should support
- Mark done
- Dismiss
- Snooze 7 days
- View details (optional)

### Empty state
If no actions exist:
- “You’re in good shape right now — no urgent actions found.”
- CTA: Refresh actions

---

# Card Visual Treatment

## Priority styling
- urgent = red/emphasis
- high = strong accent
- medium = neutral accent
- low = muted

Do not make the panel feel alarming unless truly urgent.

---

# App Integration

## Modify `dashboard.js`
Add panel near top of dashboard, ideally under summary metrics.

## Modify `app.js`
Add click handlers for:
- `generate-next-best-actions`
- `complete-next-best-action`
- `dismiss-next-best-action`
- `snooze-next-best-action`
- `delete-next-best-action`

Add loading state support:
- `Refreshing actions...`

---

# Generation Timing

## Initial V1 behavior
Generate next best actions:
- on app startup after `loadAll()`
- on dashboard navigation if actions are stale
- when the user clicks refresh manually

## Staleness rule
Treat actions as stale if last generation > 12 hours ago.

Store generation timestamp either:
- in settings table, or
- by checking newest `generated_at`

---

# AI Enrichment Hook (V1.5 / Optional)

Do not make AI required for initial release.
But design the engine so later you can add:
- AI rewrite of titles / rationale
- AI summary banner such as:
  - `This month, your biggest gains come from reducing overspending and tackling high-interest debt.`

## Suggested hook
After rule actions are generated, optionally call:
```js
aiService.enrichNextBestActions(actions, financialContext)
```

Return should preserve the same canonical action shape.

---

# Acceptance Criteria

## Functional
- dashboard shows top next best actions automatically
- actions are generated from real financial data
- actions are ranked and prioritized
- user can complete, dismiss, and snooze actions
- action state persists across app restarts

## UX
- dashboard feels more like a command center
- actions are specific, not vague
- empty state is graceful
- no dependency on AI for basic operation

## Technical
- no crashes if some financial inputs are missing
- generation logic is deterministic
- repeated generation does not create duplicates
- completed / dismissed actions are respected

---

# Suggested Build Order
1. migration + DB methods
2. engine file with first 3 rules
3. IPC + preload bridge
4. state slice + methods
5. dashboard component
6. complete/dismiss/snooze actions
7. add remaining rules
8. optional AI enrichment hook

---

# Minimum Viable Version
If you want the tightest first release, ship with only:
- Budget overrun rule
- High-interest debt rule
- Bills due soon rule
- Dashboard panel
- Complete / dismiss

Then add snooze, emergency fund, goal tracking, and contribution room rules after.

---

# Definition of Done
The Next Best Actions system is complete when WealthFlow automatically surfaces the most important actions a user should take next, users can manage those actions directly from the dashboard, and the product feels meaningfully more proactive than a traditional finance tracker.
