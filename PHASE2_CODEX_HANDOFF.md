# WealthFlow Phase 2 Codex Handoff

## Objective
Turn WealthFlow AI from a general-purpose chat surface into a structured financial decision engine that produces repeatable, actionable, UI-friendly outputs.

This phase should make AI feel like a product feature, not an add-on.

---

## Product Goal
Today, WealthFlow supports freeform AI chat with Canadian financial context and the user’s financial data.

Phase 2 should add task-specific workflows that answer high-value questions such as:
- Should I prioritize TFSA or RRSP?
- Should I pay debt down or invest?
- What are the top 3 actions I should take this month?
- What should I do with extra cash?

The key principle:

**Do not return raw essay-style AI output unless the workflow explicitly requires it.**

Instead, AI should return structured JSON that the UI can render as recommendation cards.

---

## Scope

### In scope
- New AI workflow service layer
- New IPC endpoints for workflow execution
- Structured prompt templates
- JSON parsing / validation / fallback handling
- New renderer decision card components
- New saved recommended actions persistence
- New entry points in dashboard / planning / registered accounts

### Out of scope
- Architecture-wide refactor of renderer or DB layer
- General chat redesign
- Cloud sync
- Financial institution account linking
- Fine-tuned models or custom model hosting

---

## User Outcomes
After this phase, a user should be able to:
- run a specific AI decision workflow from a relevant page
- receive a recommendation with rationale, tradeoffs, and next actions
- save one or more actions into an action list
- revisit saved actions later and mark them complete

---

## Primary Workflows (V1)

### 1. TFSA vs RRSP Optimizer
#### User story
As a Canadian user, I want WealthFlow to recommend whether my next contribution should go to TFSA or RRSP so I can make a smarter tax-aware decision.

#### Inputs
- province
- annual gross income
- marginal tax estimate if available
- TFSA room
- RRSP room
- debt profile
- savings goals
- emergency fund signal if available
- expected use case / time horizon if available

#### Output contract
```json
{
  "workflow_type": "tfsa_rrsp_optimizer",
  "summary": "Prioritize TFSA for your next contribution",
  "recommendation": {
    "primary_action": "Contribute to TFSA first",
    "allocation": {
      "tfsa": 5000,
      "rrsp": 0
    }
  },
  "why": [
    "Your current income level suggests limited immediate RRSP tax advantage",
    "TFSA gives you flexibility for medium-term goals",
    "You still have meaningful TFSA room available"
  ],
  "tradeoffs": [
    "RRSP may become more attractive if your income rises",
    "TFSA contributions do not reduce taxable income today"
  ],
  "next_actions": [
    {
      "title": "Contribute $5,000 to TFSA",
      "type": "contribution",
      "priority": "high"
    },
    {
      "title": "Re-evaluate RRSP strategy before year end",
      "type": "review",
      "priority": "medium"
    }
  ],
  "confidence": "medium",
  "disclaimer": "This is general educational guidance and not individualized tax or investment advice."
}
```

---

### 2. Debt vs Investing Allocator
#### User story
As a user with both debt and investments, I want a recommendation on where extra cash should go first.

#### Inputs
- debts with balances, APR, minimum payments
- investment holdings
- savings rate
- emergency fund signal
- contribution room
- registered account context if present

#### Output contract
```json
{
  "workflow_type": "debt_vs_investing",
  "summary": "Pay down high-interest debt before increasing investments",
  "recommendation": {
    "primary_action": "Direct extra cash to debt repayment",
    "priority_order": [
      "Credit card",
      "Line of credit",
      "TFSA investing"
    ]
  },
  "why": [
    "Your highest debt APR exceeds a reasonable expected investment return",
    "Guaranteed debt reduction beats uncertain market gains at this rate"
  ],
  "tradeoffs": [
    "You may delay portfolio growth in the short term",
    "If employer matching exists, matched contributions should still be prioritized"
  ],
  "next_actions": [
    {
      "title": "Add $300/month to highest-interest debt",
      "type": "debt_paydown",
      "priority": "high"
    }
  ],
  "confidence": "high",
  "disclaimer": "This is general educational guidance and not individualized financial advice."
}
```

---

### 3. Monthly Action Planner
#### User story
As a user, I want WealthFlow to tell me the top actions to take this month based on my real financial data.

#### Inputs
- financial summary
- budgets and category overruns
- debts
- investments
- goals
- bills due soon
- contribution room
- monthly report context if available

#### Output contract
```json
{
  "workflow_type": "monthly_action_planner",
  "summary": "Here are your 3 highest-impact financial actions this month",
  "recommendation": {
    "primary_action": "Reduce overspending and redirect freed cash"
  },
  "top_actions": [
    {
      "title": "Reduce food spending by $200 this month",
      "impact": "Improves monthly cash flow by $200",
      "effort": "low",
      "priority": "high"
    },
    {
      "title": "Put $300 toward highest-interest debt",
      "impact": "Reduces interest drag",
      "effort": "low",
      "priority": "high"
    },
    {
      "title": "Review TFSA contribution room and make a deposit",
      "impact": "Improves tax-free growth",
      "effort": "medium",
      "priority": "medium"
    }
  ],
  "why": [
    "Food/Groceries is materially over budget",
    "Debt interest is a bigger drag than current idle cash is helping",
    "You still have available registered account room"
  ],
  "confidence": "medium",
  "disclaimer": "This is general educational guidance and not individualized advice."
}
```

---

## Recommended File Changes

### New files
```text
src/main/ai-workflows.js
src/main/ai-workflow-prompts.js
src/main/ai-workflow-schema.js
src/renderer/js/components/ai-decision-card.js
src/renderer/js/components/ai-action-list.js
src/renderer/js/utils/ai-workflow-client.js
```

### Existing files to modify
```text
src/main/ipc-handlers.js
src/main/ai-service.js
src/main/database.js
src/renderer/js/app.js
src/renderer/js/state.js
src/renderer/js/pages/dashboard.js
src/renderer/js/pages/planning.js
src/renderer/js/pages/registered-accounts.js
```

---

## Implementation Plan

## Step 1 — Add persistence for saved recommended actions

### Database migration
Create a new migration:
```text
src/main/migrations/009-recommended-actions.js
```

### Table
```sql
CREATE TABLE IF NOT EXISTS recommended_actions (
  id TEXT PRIMARY KEY,
  workflow_type TEXT NOT NULL,
  title TEXT NOT NULL,
  action_type TEXT,
  priority TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  impact_text TEXT,
  source_payload TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT,
  deleted_at TEXT
);
```

### Database methods to add
In `database.js`, add:
- `listRecommendedActions()`
- `addRecommendedAction(action)`
- `updateRecommendedAction(action)`
- `completeRecommendedAction(id)`
- `deleteRecommendedAction(id)`

Use soft delete if consistent with other entities.

---

## Step 2 — Add workflow schema and validation

### New file: `src/main/ai-workflow-schema.js`
Purpose:
- define allowed workflow types
- validate parsed AI responses
- normalize incomplete outputs

### Required exports
- `WORKFLOW_TYPES`
- `validateWorkflowResult(type, result)`
- `normalizeWorkflowResult(type, result)`
- `buildWorkflowFallback(type, errorMessage)`

### Validation rules
For all workflows require:
- `workflow_type`
- `summary`
- `recommendation`
- `disclaimer`

For TFSA/RRSP and debt/investing:
- `why` must be an array
- `tradeoffs` must be an array
- `next_actions` must be an array

For monthly planner:
- `top_actions` must be an array

Do not let malformed model output break the UI.

---

## Step 3 — Add prompt templates

### New file: `src/main/ai-workflow-prompts.js`
Purpose:
- house one prompt builder per workflow
- keep prompts separate from orchestration logic

### Required exports
- `buildTfsaRrspPrompt(financialContext)`
- `buildDebtVsInvestingPrompt(financialContext)`
- `buildMonthlyPlannerPrompt(financialContext)`

### Prompt guidance
Each prompt should:
- instruct the model to return JSON only
- specify exact required keys
- explicitly forbid markdown fences
- emphasize Canadian context
- state that missing data should reduce confidence, not invent facts

Example language to include:
- “Do not fabricate missing financial details”
- “If confidence is limited, state medium or low confidence”
- “Return valid JSON only. No prose before or after the JSON.”

---

## Step 4 — Add AI workflow orchestration service

### New file: `src/main/ai-workflows.js`
Purpose:
- accept workflow type + financial data
- build prompt
- call Anthropic
- parse JSON
- validate + normalize result
- return structured result

### Public API
```js
class AiWorkflowService {
  async runWorkflow(apiKey, model, workflowType, financialData) {}
}
```

### Behavior
1. build financial context using existing AI service helpers where possible
2. select prompt builder by workflow type
3. call model with retry behavior similar to existing `AiService`
4. parse JSON safely
5. validate/normalize response
6. return fallback JSON if parsing fails

### Parsing strategy
- first try `JSON.parse(raw)`
- then extract first `{ ... }` object if needed
- if still invalid, return a structured fallback object instead of throwing a renderer-breaking error

---

## Step 5 — Wire workflows through IPC

### Modify `src/main/ipc-handlers.js`
Add new handlers:
- `ai:run-workflow`
- `db:recommended-actions:list`
- `db:recommended-actions:add`
- `db:recommended-actions:update`
- `db:recommended-actions:complete`
- `db:recommended-actions:delete`

### AI IPC signature
```js
safeHandle('ai:run-workflow', async (_, workflowType, financialData) => {
  const settings = database.getSettings();
  const apiKey = settings.ai_api_key;
  const model = settings.ai_model || DEFAULT_AI_MODEL;
  if (!apiKey) throw new Error('No API key configured. Go to Settings to add your Claude API key.');
  return aiWorkflowService.runWorkflow(apiKey, model, workflowType, financialData);
});
```

Instantiate the workflow service alongside the existing AI service.

---

## Step 6 — Extend renderer preload / bridge if needed
Expose the new IPC methods through the preload bridge so renderer code can call:
- `runWorkflow(type, financialData)`
- `getRecommendedActions()`
- `addRecommendedAction(action)`
- `updateRecommendedAction(action)`
- `completeRecommendedAction(id)`
- `deleteRecommendedAction(id)`

Keep naming consistent with the rest of the bridge.

---

## Step 7 — Extend renderer state layer

### Modify `src/renderer/js/state.js`
Add a new state slice:
```js
recommendedActions: []
```

### Add methods
- `loadRecommendedActions()`
- `runWorkflow(workflowType)`
- `addRecommendedAction(action)`
- `completeRecommendedAction(id)`
- `deleteRecommendedAction(id)`

### `runWorkflow(workflowType)` behavior
1. build financial data using the existing helper pattern used for monthly reports
2. call `api.runWorkflow(workflowType, data)`
3. return structured result to the page/component

Do not auto-save actions unless the user explicitly chooses to save them.

---

## Step 8 — Build recommendation card UI

### New file: `src/renderer/js/components/ai-decision-card.js`
This component should render structured workflow output.

### Render sections
- title / workflow label
- summary
- primary recommendation
- why
- tradeoffs
- next actions
- confidence badge
- disclaimer

### Required UI actions
- Save action
- Save all actions
- Dismiss

### Notes
Do not render empty sections.
If workflow output is fallback / low-confidence, show a softer neutral state rather than a success state.

---

## Step 9 — Build saved action list UI

### New file: `src/renderer/js/components/ai-action-list.js`
Show saved actions with:
- title
- priority
- status
- source workflow
- created date
- mark complete
- delete

This can initially live on:
- dashboard
- planning page

---

## Step 10 — Add entry points in product surfaces

### Dashboard
Add a panel titled:
**AI Recommendations**

Buttons:
- Generate Monthly Action Plan

### Registered Accounts page
Add button:
- Optimize TFSA vs RRSP

### Planning page
Add button:
- Decide: Debt vs Investing

Each button should:
1. run the workflow
2. show a loading state
3. render a decision card inline or in a modal

---

## UX Requirements

### Loading states
For each workflow button:
- disable while loading
- show spinner or text like “Analyzing your finances...”

### Error handling
If no API key exists:
- show actionable toast that directs user to settings

If workflow fails:
- show non-blocking error toast
- do not break page rendering

### Save behavior
When user clicks save on a next action:
- persist to DB
- show success toast
- update saved action list without requiring full app reload

---

## Suggested Renderer Interaction Pattern

### Example flow
1. User clicks “Optimize TFSA vs RRSP”
2. Renderer calls `State.runWorkflow('tfsa_rrsp_optimizer')`
3. Result returned as structured JSON
4. Decision card renders in page or modal
5. User clicks “Save action”
6. Renderer persists action to `recommended_actions`
7. Dashboard action list updates

---

## Coding Guidance

### Reuse where practical
Leverage existing logic from:
- `ai-service.js` for retry patterns and financial context assembly
- `state.js` monthly report helper for financial context construction

### Avoid these mistakes
- do not duplicate entire AI chat logic into each workflow
- do not let the model invent financial facts
- do not return markdown or raw prose to components expecting structured JSON
- do not auto-save AI outputs without user confirmation

---

## Acceptance Criteria

### Functional
- user can run 3 workflow types
- each workflow returns structured JSON or a safe fallback
- user can save recommended actions
- saved actions can be listed, completed, and deleted
- dashboard or planning page shows saved actions

### UX
- loading state shown during workflow execution
- errors handled cleanly
- saved recommendations feel like native app entities, not raw AI transcripts

### Technical
- no page crashes on malformed AI output
- no regression to existing chat behavior
- migration runs cleanly on existing DB
- IPC surface is consistent with existing conventions

---

## Optional Stretch Goals
Only implement if core phase is already stable.

### Stretch 1
Add a fourth workflow:
- “What should I do with extra cash?”

### Stretch 2
Let users convert saved AI actions into:
- goals
- bills/reminders
- manual checklist items

### Stretch 3
Cache the last result per workflow for the current month to reduce repeat API calls

---

## Suggested Commit Sequence
1. migration + DB methods
2. workflow schema + prompts + service
3. IPC bridge
4. state layer additions
5. decision card component
6. saved action list
7. page integrations
8. polish + fallback handling

---

## Definition of Done
Phase 2 is complete when WealthFlow AI can produce structured, saveable, financial recommendations from task-specific workflows, and users can act on them inside the product without relying on freeform chat.
