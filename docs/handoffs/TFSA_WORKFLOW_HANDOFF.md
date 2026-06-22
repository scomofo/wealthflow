# WealthFlow TFSA vs RRSP Workflow — Build Handoff

## Objective
Implement the first structured AI workflow end-to-end inside WealthFlow:

**TFSA vs RRSP Optimizer**

This is the pilot workflow for Phase 2. It should prove the full pattern:
- structured AI prompt
- JSON response contract
- safe parsing + validation
- renderer integration
- saveable actions

Do this workflow first before building debt-vs-investing or monthly planner.

---

## Product Goal
When a user opens the Registered Accounts area, they should be able to click:

**Optimize TFSA vs RRSP**

WealthFlow should then:
1. gather the user’s current financial context
2. run a task-specific AI workflow
3. return structured JSON
4. render a recommendation card
5. let the user save one or more actions

This must feel native to the app, not like opening a generic chatbot.

---

## User Story
As a Canadian user with TFSA and RRSP contribution room, I want WealthFlow to recommend where my next contribution should go so I can make a more tax-aware decision.

---

## Required Output Contract
The workflow must return JSON in this exact shape.

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
    "Your available TFSA room gives you tax-free growth flexibility",
    "Your current income level may not create the strongest immediate RRSP tax benefit"
  ],
  "tradeoffs": [
    "RRSP contributions may become more attractive if income rises",
    "TFSA contributions do not lower taxable income today"
  ],
  "next_actions": [
    {
      "title": "Contribute $5,000 to TFSA",
      "type": "contribution",
      "priority": "high"
    },
    {
      "title": "Revisit RRSP contribution strategy before year end",
      "type": "review",
      "priority": "medium"
    }
  ],
  "confidence": "medium",
  "disclaimer": "This is general educational guidance and not individualized tax, legal, or investment advice."
}
```

If the model cannot confidently answer because data is missing, it must still return valid JSON with lower confidence and a conservative recommendation.

---

## Exact Files to Create or Modify

### New files
```text
src/main/ai-workflows.js
src/main/ai-workflow-prompts.js
src/main/ai-workflow-schema.js
src/renderer/js/components/ai-decision-card.js
```

### Existing files to modify
```text
src/main/ipc-handlers.js
src/main/database.js
src/main/migrations/009-recommended-actions.js
src/renderer/js/state.js
src/renderer/js/app.js
src/renderer/js/pages/registered-accounts.js
src/main/preload.js
```

If `preload.js` is named differently in your project, use the existing preload bridge file referenced from `main.js`.

---

# Implementation Steps

## Step 1 — Add recommended actions persistence

### Create migration
**File:** `src/main/migrations/009-recommended-actions.js`

Create a table:

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

### Update migration loader
In `database.js`, include the new migration after migration 008.

### Add DB methods
Add these methods to `database.js`:
- `listRecommendedActions()`
- `addRecommendedAction(action)`
- `completeRecommendedAction(id)`
- `deleteRecommendedAction(id)`

Use the same soft-delete style used elsewhere in the codebase.

---

## Step 2 — Add workflow schema validation

### File: `src/main/ai-workflow-schema.js`

### Required exports
- `WORKFLOW_TYPES`
- `validateWorkflowResult(type, result)`
- `normalizeWorkflowResult(type, result)`
- `buildWorkflowFallback(type, errorMessage)`

### Initial implementation scope
Support only:
- `tfsa_rrsp_optimizer`

### Validation requirements
Ensure the result contains:
- `workflow_type`
- `summary`
- `recommendation`
- `why` array
- `tradeoffs` array
- `next_actions` array
- `confidence`
- `disclaimer`

### Normalization rules
- if `why` is missing, set to `[]`
- if `tradeoffs` is missing, set to `[]`
- if `next_actions` is missing, set to `[]`
- if `confidence` is invalid, default to `low`
- if `allocation` values are strings, coerce to numbers when possible

### Fallback example
Return something like:

```json
{
  "workflow_type": "tfsa_rrsp_optimizer",
  "summary": "WealthFlow could not generate a confident TFSA vs RRSP recommendation from the available data",
  "recommendation": {
    "primary_action": "Review your income, TFSA room, and RRSP room before deciding",
    "allocation": {
      "tfsa": 0,
      "rrsp": 0
    }
  },
  "why": [],
  "tradeoffs": [],
  "next_actions": [],
  "confidence": "low",
  "disclaimer": "This is general educational guidance and not individualized tax, legal, or investment advice."
}
```

The UI should never receive `null` or a malformed response.

---

## Step 3 — Add prompt builder

### File: `src/main/ai-workflow-prompts.js`

Create:
- `buildTfsaRrspPrompt(financialContext)`

### Prompt requirements
The prompt should:
- instruct the model to act as a Canadian finance assistant
- explicitly consider province, income, TFSA room, RRSP room, debt pressure, flexibility needs, and time horizon if present
- avoid invented facts
- return valid JSON only
- avoid markdown fences

### Prompt template guidance
Use language like:

- “Return valid JSON only.”
- “Do not wrap the JSON in markdown.”
- “Do not fabricate missing facts.”
- “If information is missing, lower confidence and recommend what the user should verify.”

The schema in the prompt should match the exact output contract.

---

## Step 4 — Add workflow orchestration service

### File: `src/main/ai-workflows.js`

Create class:

```js
class AiWorkflowService {
  constructor(aiService) {
    this.aiService = aiService;
  }

  async runWorkflow(apiKey, model, workflowType, financialData) {}
}
```

### Behavior
For `tfsa_rrsp_optimizer`:
1. build financial context
2. build prompt
3. call Anthropic
4. parse JSON
5. validate and normalize
6. return safe result

### Important
Reuse existing helpers from `ai-service.js` where practical:
- `_withRetry(...)`
- `_buildFinancialContext(...)`

Do not duplicate large chunks of logic if they can be shared cleanly.

### Parsing strategy
Use this order:
1. `JSON.parse(rawText)`
2. extract first JSON object via regex if needed
3. fallback object if parsing still fails

Never throw raw parsing errors to the renderer if a safe fallback can be returned.

---

## Step 5 — Add IPC handlers

### Modify `src/main/ipc-handlers.js`
Instantiate the workflow service inside `registerIpcHandlers(...)`.

Add handlers:
- `ai:run-workflow`
- `db:recommended-actions:list`
- `db:recommended-actions:add`
- `db:recommended-actions:complete`
- `db:recommended-actions:delete`

### Example
```js
safeHandle('ai:run-workflow', async (_, workflowType, financialData) => {
  const settings = database.getSettings();
  const apiKey = settings.ai_api_key;
  const model = settings.ai_model || DEFAULT_AI_MODEL;
  if (!apiKey) throw new Error('No API key configured. Go to Settings to add your Claude API key.');
  return aiWorkflowService.runWorkflow(apiKey, model, workflowType, financialData);
});
```

---

## Step 6 — Expose through preload bridge

### Modify `src/main/preload.js`
Expose methods:
- `runWorkflow(workflowType, financialData)`
- `getRecommendedActions()`
- `addRecommendedAction(action)`
- `completeRecommendedAction(id)`
- `deleteRecommendedAction(id)`

Keep naming consistent with your existing bridge style.

---

## Step 7 — Extend state layer

### Modify `src/renderer/js/state.js`
Add state slice:
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
Reuse the pattern used by monthly reports:
1. assemble financial context
2. call `api.runWorkflow(workflowType, data)`
3. return structured result

Do not automatically persist the returned `next_actions`.
Saving must be user-initiated.

---

## Step 8 — Build decision card component

### File: `src/renderer/js/components/ai-decision-card.js`

Render these sections if present:
- workflow title
- summary
- primary action
- allocation split
- why
- tradeoffs
- next actions
- confidence badge
- disclaimer

### Required interactions
- save single action
- save all actions
- dismiss

### Notes
- do not render empty blocks
- low-confidence results should appear neutral, not celebratory
- allocation should show CAD formatting

---

## Step 9 — Add UI entry point in Registered Accounts page

### Modify `src/renderer/js/pages/registered-accounts.js`
Add a CTA button:

**Optimize TFSA vs RRSP**

### On click
1. call `State.runWorkflow('tfsa_rrsp_optimizer')`
2. show loading state
3. render `ai-decision-card`

This can render:
- inline in the page
- or in a modal

Inline is preferred for the first implementation because it makes the feature feel integrated rather than hidden.

---

## Step 10 — Wire page action in app event layer

### Modify `src/renderer/js/app.js`
Add click handling for:
- `run-tfsa-rrsp-workflow`
- `save-ai-action`
- `save-all-ai-actions`
- `complete-ai-action`
- `delete-ai-action`

### Suggested behavior
- store the latest workflow result in a temporary UI state variable
- rerender the registered accounts page after result arrives
- on save, persist each selected action into `recommended_actions`
- show success toast on save

---

## Data Mapping for Saved Actions
When saving a `next_action`, map it into DB rows like this:

```js
{
  id: uid(),
  workflow_type: 'tfsa_rrsp_optimizer',
  title: nextAction.title,
  action_type: nextAction.type || 'general',
  priority: nextAction.priority || 'medium',
  status: 'pending',
  impact_text: nextAction.impact || null,
  source_payload: JSON.stringify(nextAction)
}
```

---

## UX Requirements

### Loading state
When workflow runs:
- button disabled
- text changes to: `Analyzing TFSA vs RRSP...`

### Empty/missing data handling
If contribution room or income data is sparse:
- still show a result
- confidence should be low or medium
- `why` should explain missing data gaps

### Error handling
If no API key exists:
- show toast directing user to Settings

If AI call fails entirely:
- show toast
- optionally render fallback card if available

---

## Acceptance Criteria

### Functional
- user can click “Optimize TFSA vs RRSP”
- WealthFlow returns structured JSON
- decision card renders without crashing
- user can save one or all recommended actions
- saved actions persist in DB

### UX
- native-feeling flow from registered accounts page
- clear loading state
- safe fallback behavior

### Technical
- no regression to existing AI chat
- malformed AI output does not break rendering
- migration runs successfully on existing local DBs

---

## Suggested Build Order
1. migration + DB methods
2. workflow schema
3. prompt builder
4. workflow service
5. IPC + preload bridge
6. state methods
7. decision card component
8. registered accounts integration
9. save action flows
10. polish

---

## Definition of Done
This workflow is complete when a user can run TFSA vs RRSP optimization from inside WealthFlow and receive a structured, saveable, Canadian-specific recommendation without relying on freeform AI chat.
