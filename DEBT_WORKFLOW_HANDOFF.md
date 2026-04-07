# WealthFlow Debt vs Investing Workflow — Build Handoff

## Objective
Implement the second structured AI workflow end-to-end inside WealthFlow:

**Debt vs Investing Allocator**

This workflow should reuse the Phase 2 pattern established by the TFSA vs RRSP optimizer:
- structured AI prompt
- JSON response contract
- safe parsing + validation
- renderer integration
- saveable actions

This should be built after the TFSA workflow so it can reuse the same workflow engine, schema helpers, renderer patterns, and saved action persistence.

---

## Product Goal
When a user opens the Planning area, they should be able to click:

**Decide: Debt vs Investing**

WealthFlow should then:
1. gather the user’s current financial context
2. evaluate debt APR, investment context, cash flow, and flexibility needs
3. run a task-specific AI workflow
4. return structured JSON
5. render a recommendation card
6. let the user save one or more actions

This must feel like a native planning tool, not a chat prompt.

---

## User Story
As a user with both debt and investments, I want WealthFlow to recommend whether my next extra dollars should go toward debt repayment or investing so I can make a higher-confidence decision.

---

## Required Output Contract
The workflow must return JSON in this exact shape.

```json
{
  "workflow_type": "debt_vs_investing",
  "summary": "Pay down high-interest debt before increasing investments",
  "recommendation": {
    "primary_action": "Direct extra cash to debt repayment first",
    "priority_order": [
      "Credit card",
      "Line of credit",
      "TFSA investing"
    ]
  },
  "why": [
    "Your highest debt APR is above a reasonable expected investment return",
    "Debt repayment gives you a guaranteed return while investment returns are uncertain",
    "Reducing high-interest balances improves flexibility and lowers risk"
  ],
  "tradeoffs": [
    "You may delay portfolio growth in the short term",
    "If you have employer matching, matched contributions may still deserve priority"
  ],
  "next_actions": [
    {
      "title": "Put an extra $300/month toward your highest-interest debt",
      "type": "debt_paydown",
      "priority": "high"
    },
    {
      "title": "Maintain current investment contributions but pause increases for now",
      "type": "investment_review",
      "priority": "medium"
    }
  ],
  "confidence": "high",
  "disclaimer": "This is general educational guidance and not individualized tax, legal, or investment advice."
}
```

If the model cannot answer confidently because data is incomplete, it must still return valid JSON with lower confidence and conservative next steps.

---

## Exact Files to Create or Modify

### New files
If you already created these for the TFSA workflow, extend them rather than recreating them:
```text
src/main/ai-workflow-prompts.js
src/main/ai-workflow-schema.js
src/main/ai-workflows.js
src/renderer/js/components/ai-decision-card.js
```

### Existing files to modify
```text
src/main/ipc-handlers.js
src/renderer/js/state.js
src/renderer/js/app.js
src/renderer/js/pages/planning.js
```

No new DB table is required if `recommended_actions` already exists from the TFSA workflow.

---

# Implementation Steps

## Step 1 — Extend workflow schema

### File: `src/main/ai-workflow-schema.js`

Add support for:
- `debt_vs_investing`

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

### Specific normalization rules
- `recommendation.priority_order` should always normalize to an array
- if missing, default to `[]`
- if `why` or `tradeoffs` is missing, default to `[]`
- if `next_actions` is missing, default to `[]`
- if `confidence` is invalid, default to `low`

### Fallback example
```json
{
  "workflow_type": "debt_vs_investing",
  "summary": "WealthFlow could not generate a confident debt-vs-investing recommendation from the available data",
  "recommendation": {
    "primary_action": "Review your debt rates, cash flow, and investment priorities before deciding",
    "priority_order": []
  },
  "why": [],
  "tradeoffs": [],
  "next_actions": [],
  "confidence": "low",
  "disclaimer": "This is general educational guidance and not individualized tax, legal, or investment advice."
}
```

The UI should never receive `null` or malformed output.

---

## Step 2 — Add prompt builder

### File: `src/main/ai-workflow-prompts.js`

Add:
- `buildDebtVsInvestingPrompt(financialContext)`

### Prompt requirements
The prompt should instruct the model to evaluate:
- debt balances and APRs
- minimum payments
- savings rate / cash flow if available
- emergency fund signal if available
- registered account room if available
- investment holdings in broad terms
- the difference between guaranteed debt reduction and uncertain market return
- flexibility / risk reduction benefits of debt payoff

### Prompt guidance
Use language like:
- “Return valid JSON only.”
- “Do not wrap the JSON in markdown.”
- “Do not fabricate missing facts.”
- “If information is missing, lower confidence and recommend what the user should verify.”
- “If debt APRs are materially higher than reasonable expected returns, prefer debt repayment.”
- “If employer matching exists and is known, note that matched contributions may still deserve priority.”

The schema in the prompt should match the exact output contract.

---

## Step 3 — Extend workflow service

### File: `src/main/ai-workflows.js`

Add support for:
- `debt_vs_investing`

### Behavior
1. build financial context using the existing AI service helper(s)
2. select the debt-vs-investing prompt
3. call Anthropic through the shared retry pattern
4. parse JSON
5. validate and normalize
6. return safe result

### Important guidance
Reuse the same orchestration pattern as TFSA workflow:
- shared parser
- shared fallback handling
- shared confidence normalization

Do not introduce workflow-specific parsing logic that duplicates the whole pipeline.

---

## Step 4 — Extend renderer state layer

### File: `src/renderer/js/state.js`

If `runWorkflow(workflowType)` already exists from the TFSA implementation, no major state API change is needed.

Ensure it can now be called with:
- `debt_vs_investing`

The financial context passed into this workflow should include at minimum:
- computed financials
- debts
- investments
- goals
- contribution room
- settings
- advisor profile if available

Do not auto-save returned actions.

---

## Step 5 — Add Planning page entry point

### File: `src/renderer/js/pages/planning.js`

Add a CTA button:

**Decide: Debt vs Investing**

### On click
1. call `State.runWorkflow('debt_vs_investing')`
2. show a loading state
3. render `ai-decision-card`

Inline render on the planning page is preferred for the first implementation.

### Placement guidance
Put this near:
- debt strategy content
- long-term planning cards
- extra cash / allocation decision areas

This should feel like a natural planning action, not a hidden utility.

---

## Step 6 — Wire page action in app event layer

### File: `src/renderer/js/app.js`

Add click handling for:
- `run-debt-vs-investing-workflow`

If your save-action flows already exist from TFSA workflow, reuse them:
- `save-ai-action`
- `save-all-ai-actions`
- `complete-ai-action`
- `delete-ai-action`

### Suggested behavior
- store latest workflow result in temporary UI state for planning page
- rerender planning page after result arrives
- allow save of one or all returned actions
- show success toast on save

---

## Data Mapping for Saved Actions
When saving a `next_action`, map it into DB rows like this:

```js
{
  id: uid(),
  workflow_type: 'debt_vs_investing',
  title: nextAction.title,
  action_type: nextAction.type || 'general',
  priority: nextAction.priority || 'medium',
  status: 'pending',
  impact_text: nextAction.impact || null,
  source_payload: JSON.stringify(nextAction)
}
```

If your save helper already exists from TFSA, just pass the workflow type dynamically.

---

## UX Requirements

### Loading state
When workflow runs:
- button disabled
- text changes to: `Analyzing debt vs investing...`

### Missing data behavior
If debt rates or balances are sparse:
- still return a result
- confidence should be low or medium
- `why` should explain missing data gaps

### Error handling
If no API key exists:
- show toast directing user to Settings

If AI call fails entirely:
- show toast
- optionally render fallback card if available

### Recommendation tone
This workflow should feel pragmatic and non-judgmental.
The app should not shame the user for having debt.

---

## Acceptance Criteria

### Functional
- user can click “Decide: Debt vs Investing”
- WealthFlow returns structured JSON
- decision card renders without crashing
- user can save one or all recommended actions
- saved actions persist using existing `recommended_actions` flow

### UX
- native-feeling flow from planning page
- clear loading state
- safe fallback behavior

### Technical
- no regression to TFSA workflow
- no regression to existing AI chat
- malformed AI output does not break rendering
- workflow is added without duplicating the TFSA implementation pattern

---

## Suggested Build Order
1. extend workflow schema
2. add prompt builder
3. extend workflow service
4. planning page CTA
5. app click wiring
6. test save action flow
7. polish fallback behavior

---

## Definition of Done
This workflow is complete when a user can run Debt vs Investing from inside WealthFlow and receive a structured, saveable recommendation that helps them allocate extra cash more intelligently without relying on freeform AI chat.
