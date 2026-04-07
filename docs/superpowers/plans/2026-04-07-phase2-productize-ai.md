# Phase 2: Productize AI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert WealthFlow AI from freeform chat into a structured financial decision engine with 3 task-specific workflows that return saveable recommendation cards.

**Architecture:** New `AiWorkflowService` on main process handles workflow orchestration with structured JSON prompts. New `recommended_actions` table persists saved actions. Renderer gets decision card and action list components. Dashboard, Registered Accounts, and Planning pages get workflow trigger buttons.

**Tech Stack:** Anthropic SDK (non-streaming `messages.create`), sql.js, Electron IPC, vanilla JS renderer.

---

## File Structure

### New Files (Main Process)
- `src/main/migrations/009-recommended-actions.js` — DB migration for recommended_actions table
- `src/main/ai-workflow-prompts.js` — Prompt builders for each workflow type
- `src/main/ai-workflow-schema.js` — JSON validation/normalization for workflow output
- `src/main/ai-workflows.js` — AiWorkflowService orchestration class

### New Files (Renderer)
- `src/renderer/js/components/ai-decision-card.js` — Renders structured workflow output
- `src/renderer/js/components/ai-action-list.js` — Renders saved recommended actions

### New Files (Tests)
- `tests/ai-workflow-schema.test.js` — Schema validation tests
- `tests/ai-workflow-prompts.test.js` — Prompt builder tests

### Modified Files
- `src/main/database.js` — Add recommended_actions CRUD methods
- `src/main/ipc-handlers.js` — Add workflow + recommended_actions IPC handlers
- `src/main/preload.js` — Add bridge methods
- `src/renderer/js/state.js` — Add recommendedActions slice + workflow methods
- `src/renderer/js/app.js` — Wire workflow actions and decision card rendering
- `src/renderer/js/pages/dashboard.js` — Add AI Recommendations panel + saved action list
- `src/renderer/js/pages/registered-accounts.js` — Add Optimize TFSA vs RRSP button
- `src/renderer/js/pages/planning.js` — Add Debt vs Investing button

---

## Task 1: Database Migration + CRUD

**Files:**
- Create: `src/main/migrations/009-recommended-actions.js`
- Modify: `src/main/database.js`

- [ ] **Step 1: Create migration file**

Create `src/main/migrations/009-recommended-actions.js`:

```js
module.exports = {
  version: 9,
  name: '009-recommended-actions',
  up(db) {
    db.run(`CREATE TABLE IF NOT EXISTS recommended_actions (
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
    )`);
    db.run('CREATE INDEX IF NOT EXISTS idx_actions_status ON recommended_actions(status)');
    db.run('CREATE INDEX IF NOT EXISTS idx_actions_created ON recommended_actions(created_at)');
  },
};
```

- [ ] **Step 2: Add CRUD methods to database.js**

In `src/main/database.js`, add after existing monthly report methods:

```js
  // Recommended Actions
  listRecommendedActions() {
    return this.getAll("SELECT * FROM recommended_actions WHERE deleted_at IS NULL ORDER BY created_at DESC");
  }

  addRecommendedAction(a) {
    this.run(
      'INSERT INTO recommended_actions (id, workflow_type, title, action_type, priority, status, impact_text, source_payload) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [a.id, a.workflow_type, a.title, a.action_type || null, a.priority || 'medium', a.status || 'pending', a.impact_text || null, a.source_payload || null]
    );
    return a;
  }

  completeRecommendedAction(id) {
    this.run("UPDATE recommended_actions SET status = 'completed', completed_at = datetime('now') WHERE id = ?", [id]);
  }

  deleteRecommendedAction(id) {
    this.run("UPDATE recommended_actions SET deleted_at = datetime('now') WHERE id = ?", [id]);
  }
```

- [ ] **Step 3: Commit**

```bash
git add src/main/migrations/009-recommended-actions.js src/main/database.js
git commit -m "feat: add recommended_actions table and CRUD methods"
```

---

## Task 2: Workflow Schema + Validation

**Files:**
- Create: `src/main/ai-workflow-schema.js`
- Create: `tests/ai-workflow-schema.test.js`

- [ ] **Step 1: Write the test file**

Create `tests/ai-workflow-schema.test.js`:

```js
const { WORKFLOW_TYPES, validateWorkflowResult, normalizeWorkflowResult, buildWorkflowFallback } = require('../src/main/ai-workflow-schema');

describe('WORKFLOW_TYPES', () => {
  test('defines three workflow types', () => {
    expect(WORKFLOW_TYPES).toContain('tfsa_rrsp_optimizer');
    expect(WORKFLOW_TYPES).toContain('debt_vs_investing');
    expect(WORKFLOW_TYPES).toContain('monthly_action_planner');
  });
});

describe('validateWorkflowResult', () => {
  test('accepts valid tfsa_rrsp_optimizer result', () => {
    const result = {
      workflow_type: 'tfsa_rrsp_optimizer',
      summary: 'Prioritize TFSA',
      recommendation: { primary_action: 'Contribute to TFSA' },
      why: ['Low income bracket'],
      tradeoffs: ['Miss RRSP deduction'],
      next_actions: [{ title: 'Contribute $5,000', type: 'contribution', priority: 'high' }],
      confidence: 'medium',
      disclaimer: 'General guidance only',
    };
    expect(validateWorkflowResult('tfsa_rrsp_optimizer', result)).toBe(true);
  });

  test('rejects missing summary', () => {
    const result = { workflow_type: 'tfsa_rrsp_optimizer', recommendation: {} };
    expect(validateWorkflowResult('tfsa_rrsp_optimizer', result)).toBe(false);
  });

  test('rejects missing recommendation', () => {
    const result = { workflow_type: 'tfsa_rrsp_optimizer', summary: 'test' };
    expect(validateWorkflowResult('tfsa_rrsp_optimizer', result)).toBe(false);
  });

  test('rejects non-array why for tfsa_rrsp_optimizer', () => {
    const result = {
      workflow_type: 'tfsa_rrsp_optimizer', summary: 'test',
      recommendation: { primary_action: 'test' },
      why: 'not an array', tradeoffs: [], next_actions: [],
    };
    expect(validateWorkflowResult('tfsa_rrsp_optimizer', result)).toBe(false);
  });

  test('accepts valid monthly_action_planner with top_actions', () => {
    const result = {
      workflow_type: 'monthly_action_planner', summary: 'Top 3 actions',
      recommendation: { primary_action: 'Reduce spending' },
      top_actions: [{ title: 'Cut food', impact: 'Save $200', effort: 'low', priority: 'high' }],
      why: ['Over budget'], confidence: 'medium', disclaimer: 'General guidance',
    };
    expect(validateWorkflowResult('monthly_action_planner', result)).toBe(true);
  });

  test('rejects monthly_action_planner without top_actions array', () => {
    const result = {
      workflow_type: 'monthly_action_planner', summary: 'test',
      recommendation: { primary_action: 'test' }, why: [],
    };
    expect(validateWorkflowResult('monthly_action_planner', result)).toBe(false);
  });
});

describe('normalizeWorkflowResult', () => {
  test('adds missing arrays as empty', () => {
    const result = { workflow_type: 'tfsa_rrsp_optimizer', summary: 'test', recommendation: { primary_action: 'test' } };
    const normalized = normalizeWorkflowResult('tfsa_rrsp_optimizer', result);
    expect(Array.isArray(normalized.why)).toBe(true);
    expect(Array.isArray(normalized.tradeoffs)).toBe(true);
    expect(Array.isArray(normalized.next_actions)).toBe(true);
    expect(normalized.disclaimer).toBeTruthy();
  });

  test('preserves existing values', () => {
    const result = {
      workflow_type: 'debt_vs_investing', summary: 'Pay debt',
      recommendation: { primary_action: 'Pay CC' }, why: ['High APR'],
      tradeoffs: ['Delay growth'],
      next_actions: [{ title: 'Pay $300', type: 'debt_paydown', priority: 'high' }],
      confidence: 'high', disclaimer: 'Custom disclaimer',
    };
    const normalized = normalizeWorkflowResult('debt_vs_investing', result);
    expect(normalized.why).toEqual(['High APR']);
    expect(normalized.disclaimer).toBe('Custom disclaimer');
  });
});

describe('buildWorkflowFallback', () => {
  test('returns valid fallback structure', () => {
    const fallback = buildWorkflowFallback('tfsa_rrsp_optimizer', 'Parse error');
    expect(fallback.workflow_type).toBe('tfsa_rrsp_optimizer');
    expect(fallback.summary).toContain('unable');
    expect(fallback.confidence).toBe('low');
    expect(fallback.disclaimer).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd "c:/Users/Scott Morley/Dev/wealthflow" && npx jest tests/ai-workflow-schema.test.js --no-cache`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

Create `src/main/ai-workflow-schema.js`:

```js
const WORKFLOW_TYPES = ['tfsa_rrsp_optimizer', 'debt_vs_investing', 'monthly_action_planner'];

const DEFAULT_DISCLAIMER = 'This is general educational guidance and not individualized tax or investment advice.';

function validateWorkflowResult(type, result) {
  if (!result || typeof result !== 'object') return false;
  if (!result.summary || typeof result.summary !== 'string') return false;
  if (!result.recommendation || typeof result.recommendation !== 'object') return false;

  if (type === 'tfsa_rrsp_optimizer' || type === 'debt_vs_investing') {
    if (!Array.isArray(result.why)) return false;
    if (!Array.isArray(result.tradeoffs)) return false;
    if (!Array.isArray(result.next_actions)) return false;
  }

  if (type === 'monthly_action_planner') {
    if (!Array.isArray(result.top_actions)) return false;
    if (!Array.isArray(result.why)) return false;
  }

  return true;
}

function normalizeWorkflowResult(type, result) {
  const normalized = { ...result };
  normalized.workflow_type = normalized.workflow_type || type;
  normalized.why = Array.isArray(normalized.why) ? normalized.why : [];
  normalized.tradeoffs = Array.isArray(normalized.tradeoffs) ? normalized.tradeoffs : [];
  normalized.next_actions = Array.isArray(normalized.next_actions) ? normalized.next_actions : [];
  normalized.confidence = normalized.confidence || 'medium';
  normalized.disclaimer = normalized.disclaimer || DEFAULT_DISCLAIMER;

  if (type === 'monthly_action_planner') {
    normalized.top_actions = Array.isArray(normalized.top_actions) ? normalized.top_actions : [];
  }

  return normalized;
}

function buildWorkflowFallback(type, errorMessage) {
  return {
    workflow_type: type,
    summary: 'The advisor was unable to complete this analysis.',
    recommendation: { primary_action: 'Please try again or adjust your financial data.' },
    why: [errorMessage || 'An error occurred during analysis.'],
    tradeoffs: [],
    next_actions: [],
    top_actions: type === 'monthly_action_planner' ? [] : undefined,
    confidence: 'low',
    disclaimer: DEFAULT_DISCLAIMER,
    _fallback: true,
  };
}

module.exports = { WORKFLOW_TYPES, validateWorkflowResult, normalizeWorkflowResult, buildWorkflowFallback };
```

- [ ] **Step 4: Run tests**

Run: `cd "c:/Users/Scott Morley/Dev/wealthflow" && npx jest tests/ai-workflow-schema.test.js --no-cache`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/main/ai-workflow-schema.js tests/ai-workflow-schema.test.js
git commit -m "feat: add workflow schema validation and normalization"
```

---

## Task 3: Prompt Templates

**Files:**
- Create: `src/main/ai-workflow-prompts.js`
- Create: `tests/ai-workflow-prompts.test.js`

- [ ] **Step 1: Write the test file**

Create `tests/ai-workflow-prompts.test.js`:

```js
const { buildTfsaRrspPrompt, buildDebtVsInvestingPrompt, buildMonthlyPlannerPrompt } = require('../src/main/ai-workflow-prompts');

const sampleContext = {
  financials: { netWorth: 50000, income: 5000, expenses: 3000, savingsRate: 40, catSpending: { Food: 400 } },
  budgets: [{ category: 'Food', amount: 500 }],
  debts: [{ name: 'CC', balance: 3000, rate: 19.99, min_payment: 100 }],
  investments: [{ symbol: 'XEQT', shares: 50, current_price: 25 }],
  goals: [{ name: 'Vacation', target: 5000, current: 2000 }],
  contributionRoom: [{ account_type: 'tfsa', known_room: 15000 }, { account_type: 'rrsp', known_room: 20000 }],
  advisorProfile: { personal: { province: 'AB' }, employment: { annual_gross_income: 75000 } },
  settings: { province: 'AB' },
};

describe('buildTfsaRrspPrompt', () => {
  test('returns a non-empty string', () => {
    const prompt = buildTfsaRrspPrompt(sampleContext);
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(100);
  });

  test('includes key financial data', () => {
    const prompt = buildTfsaRrspPrompt(sampleContext);
    expect(prompt).toContain('tfsa_rrsp_optimizer');
    expect(prompt).toContain('JSON');
    expect(prompt).toContain('15,000');
    expect(prompt).toContain('20,000');
  });

  test('instructs JSON-only output', () => {
    const prompt = buildTfsaRrspPrompt(sampleContext);
    expect(prompt.toLowerCase()).toContain('json only');
  });
});

describe('buildDebtVsInvestingPrompt', () => {
  test('returns a non-empty string with debt data', () => {
    const prompt = buildDebtVsInvestingPrompt(sampleContext);
    expect(prompt).toContain('debt_vs_investing');
    expect(prompt).toContain('19.99');
    expect(prompt).toContain('JSON');
  });
});

describe('buildMonthlyPlannerPrompt', () => {
  test('returns a non-empty string with budget data', () => {
    const prompt = buildMonthlyPlannerPrompt(sampleContext);
    expect(prompt).toContain('monthly_action_planner');
    expect(prompt).toContain('top_actions');
    expect(prompt).toContain('JSON');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd "c:/Users/Scott Morley/Dev/wealthflow" && npx jest tests/ai-workflow-prompts.test.js --no-cache`
Expected: FAIL

- [ ] **Step 3: Write the implementation**

Create `src/main/ai-workflow-prompts.js`. Each function takes `financialData` (same shape as `buildFinancialData()` returns from state.js) and returns a string prompt instructing Claude to return JSON matching the workflow contract.

Each prompt must:
- Instruct Claude to return valid JSON only, no prose, no markdown fences
- Specify the exact required JSON keys
- Include the user's actual financial data interpolated
- Emphasize Canadian context
- State "Do not fabricate missing financial details"
- State "If confidence is limited, state medium or low confidence"

Three exported functions:
- `buildTfsaRrspPrompt(financialData)` — includes province, income, TFSA room, RRSP room, debts, goals
- `buildDebtVsInvestingPrompt(financialData)` — includes debts with APR, investments, contribution room, savings rate
- `buildMonthlyPlannerPrompt(financialData)` — includes budget status with spending %, debts, goals, contribution room

CJS export: `module.exports = { buildTfsaRrspPrompt, buildDebtVsInvestingPrompt, buildMonthlyPlannerPrompt };`

- [ ] **Step 4: Run tests**

Run: `cd "c:/Users/Scott Morley/Dev/wealthflow" && npx jest tests/ai-workflow-prompts.test.js --no-cache`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/main/ai-workflow-prompts.js tests/ai-workflow-prompts.test.js
git commit -m "feat: add structured prompt templates for 3 AI workflows"
```

---

## Task 4: AI Workflow Service

**Files:**
- Create: `src/main/ai-workflows.js`

- [ ] **Step 1: Write the implementation**

Create `src/main/ai-workflows.js`. This is a CJS module exporting `AiWorkflowService` class.

The class has:
- `_ensureClient(apiKey)` — creates/reuses Anthropic client (same pattern as ai-service.js line 92-98)
- `async runWorkflow(apiKey, model, workflowType, financialData)` — public API
  1. Selects prompt builder by workflow type from a map
  2. Builds prompt string
  3. Calls `_callWithRetry(model, prompt)` (non-streaming `client.messages.create`)
  4. Extracts `response.content[0].text`
  5. Parses JSON with `_parseJSON(text)` — tries `JSON.parse` first, then extracts first `{...}` block
  6. Validates with `validateWorkflowResult`, normalizes with `normalizeWorkflowResult`
  7. Returns fallback via `buildWorkflowFallback` on any failure
- `_callWithRetry(model, prompt, maxRetries = 2)` — retry logic (same pattern as ai-service.js line 46-76)
- `_parseJSON(text)` — safe JSON extraction

Imports: `@anthropic-ai/sdk`, `./logger`, `./ai-workflow-schema`, `./ai-workflow-prompts`

CJS export: `module.exports = { AiWorkflowService };`

- [ ] **Step 2: Commit**

```bash
git add src/main/ai-workflows.js
git commit -m "feat: add AiWorkflowService orchestration layer"
```

---

## Task 5: IPC Handlers + Preload Bridge

**Files:**
- Modify: `src/main/ipc-handlers.js`
- Modify: `src/main/preload.js`

- [ ] **Step 1: Add workflow IPC handlers to ipc-handlers.js**

At the top of the `registerIpcHandlers` function, add:
```js
const { AiWorkflowService } = require('./ai-workflows');
const aiWorkflowService = new AiWorkflowService();
```

After the existing `ai:generate-monthly-report` handler, add:
```js
  // AI Workflows
  safeHandle('ai:run-workflow', async (_, workflowType, financialData) => {
    const settings = database.getSettings();
    const apiKey = settings.ai_api_key;
    const model = settings.ai_model || DEFAULT_AI_MODEL;
    if (!apiKey) throw new Error('No API key configured. Go to Settings to add your Claude API key.');
    return aiWorkflowService.runWorkflow(apiKey, model, workflowType, financialData);
  });

  // Recommended Actions
  safeHandle('db:recommended-actions:list', () => database.listRecommendedActions());
  safeHandle('db:recommended-actions:add', (_, action) => database.addRecommendedAction(action));
  safeHandle('db:recommended-actions:complete', (_, id) => database.completeRecommendedAction(id));
  safeHandle('db:recommended-actions:delete', (_, id) => database.deleteRecommendedAction(id));
```

- [ ] **Step 2: Add preload bridge methods**

In `src/main/preload.js`, before the closing `});`, add:
```js
  // AI Workflows
  runWorkflow: (type, financialData) => ipcRenderer.invoke('ai:run-workflow', type, financialData),

  // Recommended Actions
  getRecommendedActions: () => ipcRenderer.invoke('db:recommended-actions:list'),
  addRecommendedAction: (action) => ipcRenderer.invoke('db:recommended-actions:add', action),
  completeRecommendedAction: (id) => ipcRenderer.invoke('db:recommended-actions:complete', id),
  deleteRecommendedAction: (id) => ipcRenderer.invoke('db:recommended-actions:delete', id),
```

- [ ] **Step 3: Commit**

```bash
git add src/main/ipc-handlers.js src/main/preload.js
git commit -m "feat: add AI workflow and recommended actions IPC handlers + bridge"
```

---

## Task 6: State Layer

**Files:**
- Modify: `src/renderer/js/state.js`

- [ ] **Step 1: Add recommendedActions to state**

Add `recommendedActions: [],` to the initial state object.

Add `api.getRecommendedActions()` to the `loadAll()` Promise.all array and `recommendedActions` to the destructuring and Object.assign.

- [ ] **Step 2: Add workflow + action methods**

Add at end of state.js:

```js
// AI Workflows
export async function runWorkflow(workflowType) {
  const financialData = await buildFinancialData();
  return api.runWorkflow(workflowType, financialData);
}

// Recommended Actions
export async function addRecommendedAction(action) {
  await api.addRecommendedAction(action);
  state.recommendedActions.unshift(action);
  return action;
}

export async function completeRecommendedAction(id) {
  await api.completeRecommendedAction(id);
  const idx = state.recommendedActions.findIndex(a => a.id === id);
  if (idx >= 0) {
    state.recommendedActions[idx].status = 'completed';
    state.recommendedActions[idx].completed_at = new Date().toISOString();
  }
}

export async function deleteRecommendedAction(id) {
  await api.deleteRecommendedAction(id);
  state.recommendedActions = state.recommendedActions.filter(a => a.id !== id);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/js/state.js
git commit -m "feat: add recommended actions state slice and workflow methods"
```

---

## Task 7: Decision Card + Action List Components

**Files:**
- Create: `src/renderer/js/components/ai-decision-card.js`
- Create: `src/renderer/js/components/ai-action-list.js`

- [ ] **Step 1: Write ai-decision-card.js**

Export `renderDecisionCard(result)` returning HTML string.

Sections (skip if empty):
- Title bar: workflow label + confidence badge (high=green, medium=orange, low=red)
- Summary text (bold, 14px)
- Primary recommendation (highlighted card)
- "Why" bullet list
- "Tradeoffs" bullet list
- Actions list: for tfsa_rrsp/debt workflows use `result.next_actions`, for monthly planner use `result.top_actions`. Each action row has title, priority badge, and "Save" button with `data-action="save-workflow-action"` + data attributes: `data-title`, `data-type`, `data-priority`, `data-workflow`, `data-impact`
- "Save All" button: `data-action="save-all-workflow-actions"`
- "Dismiss" button: `data-action="dismiss-workflow"`
- Disclaimer in small muted text
- If `result._fallback`, use warning border color instead of accent

Workflow labels map: `tfsa_rrsp_optimizer` = "TFSA vs RRSP Optimizer", `debt_vs_investing` = "Debt vs Investing", `monthly_action_planner` = "Monthly Action Plan"

Use `icon()` from `../icons.js`, `h()` from `../helpers.js` for escaping.

- [ ] **Step 2: Write ai-action-list.js**

Export `renderActionList(actions)` returning HTML string.

Shows saved recommended_actions grouped: pending first, then last 5 completed.
Each pending action: title, priority badge, workflow label, created date, "Complete" button (`data-action="complete-action" data-id`), "Delete" button (`data-action="delete-action" data-id`).
Completed: muted with checkmark, no action buttons.
Empty state: "No saved recommendations yet."

Same workflow labels map. Same priority colors.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/js/components/ai-decision-card.js src/renderer/js/components/ai-action-list.js
git commit -m "feat: add AI decision card and saved action list components"
```

---

## Task 8: Wire Workflows in app.js

**Files:**
- Modify: `src/renderer/js/app.js`

- [ ] **Step 1: Add imports**

```js
import { renderDecisionCard } from './components/ai-decision-card.js';
import { renderActionList } from './components/ai-action-list.js';
```

- [ ] **Step 2: Add module-level workflow state**

```js
let activeWorkflowResult = null;
let workflowLoading = false;
```

- [ ] **Step 3: Add action handlers in click switch**

Add these cases:
- `run-workflow` — sets loading, calls `State.runWorkflow(type)`, stores result. If not on dashboard, show result as custom modal via `activeModal = '_custom'` with `renderDecisionCard` as body.
- `save-workflow-action` — builds action object from button data attributes, calls `State.addRecommendedAction`, shows toast
- `save-all-workflow-actions` — iterates `activeWorkflowResult.next_actions || .top_actions`, saves each
- `dismiss-workflow` — clears `activeWorkflowResult`, re-renders
- `complete-action` — calls `State.completeRecommendedAction(id)`, shows toast
- `delete-action` — calls `State.deleteRecommendedAction(id)`, shows toast

- [ ] **Step 4: Pass workflow state to dashboard**

Update dashboard render call to pass `{ activeWorkflowResult, workflowLoading }` as third argument.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/js/app.js
git commit -m "feat: wire AI workflow actions in app.js"
```

---

## Task 9: Page Entry Points

**Files:**
- Modify: `src/renderer/js/pages/dashboard.js`
- Modify: `src/renderer/js/pages/registered-accounts.js`
- Modify: `src/renderer/js/pages/planning.js`

- [ ] **Step 1: Add AI Recommendations section to dashboard**

Update `renderDashboard` signature to accept `workflowCtx` parameter.

Add imports for `renderDecisionCard` and `renderActionList`.

After the Next Best Actions card and before the spending snapshot, add:
- "AI Recommendations" section with "Generate Monthly Action Plan" button (`data-action="run-workflow" data-workflow="monthly_action_planner"`)
- Loading state when `workflowCtx?.workflowLoading` is true
- Decision card when `workflowCtx?.activeWorkflowResult` is present
- Saved action list from `renderActionList(state.recommendedActions)`

- [ ] **Step 2: Add button to registered-accounts.js**

Near the top of `renderRegisteredAccounts`, after the tab buttons div, add:
```
<button class="btn btn-secondary" data-action="run-workflow" data-workflow="tfsa_rrsp_optimizer">
  ${icon('lightbulb', 14)} Optimize TFSA vs RRSP
</button>
```

- [ ] **Step 3: Add button to planning.js**

Near the top of `renderPlanning`, add:
```
<button class="btn btn-secondary" data-action="run-workflow" data-workflow="debt_vs_investing">
  ${icon('lightbulb', 14)} Decide: Debt vs Investing
</button>
```

- [ ] **Step 4: Commit**

```bash
git add src/renderer/js/pages/dashboard.js src/renderer/js/pages/registered-accounts.js src/renderer/js/pages/planning.js
git commit -m "feat: add AI workflow entry points to dashboard, registered accounts, and planning"
```

---

## Task 10: Final Verification

**Files:** None (verification only)

- [ ] **Step 1: Run all tests**

Run: `cd "c:/Users/Scott Morley/Dev/wealthflow" && npx jest --no-cache`
Expected: All tests pass

- [ ] **Step 2: Run lint on new files**

Run: `cd "c:/Users/Scott Morley/Dev/wealthflow" && npx eslint src/main/ai-workflow-schema.js src/main/ai-workflow-prompts.js src/main/ai-workflows.js`
Expected: No errors

- [ ] **Step 3: Verify app launches**

Run: `cd "c:/Users/Scott Morley/Dev/wealthflow" && npx electron .`
Expected:
- Dashboard shows AI Recommendations section with "Generate Monthly Action Plan" button
- Clicking it shows loading state, then decision card (requires API key)
- Decision card has Save/Save All/Dismiss buttons
- Saved actions appear in the action list
- Registered Accounts has "Optimize TFSA vs RRSP" button
- Planning has "Debt vs Investing" button
- Non-dashboard workflows show decision card in modal

- [ ] **Step 4: Final commit if needed**

```bash
git add -A
git commit -m "fix: address smoke test issues from Phase 2 AI workflows"
```
