# Phase 3: Renderer Architecture Refactor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split app.js (1,726 lines) and state.js (486 lines) into domain-specific modules without changing any behavior.

**Architecture:** State splits into core.js (owns state object, loadAll, re-exports) plus 4 domain modules (money, growth, home, plan) initialized via `init(state, api)`. App.js splits into a thin coordinator (~150 lines) plus 5 handler modules (money, growth, home, plan, shared) that receive a context object and return `true/false` for handled actions.

**Tech Stack:** Vanilla JavaScript ES modules, Electron renderer process.

---

## File Structure

### New Files
- `src/renderer/js/state/core.js` — State object, loadAll, getState, computeFinancials, re-exports
- `src/renderer/js/state/money.js` — Transaction/budget/bill/debt CRUD
- `src/renderer/js/state/growth.js` — Investment/goal/contribution/RESP/GIC CRUD + stock refresh
- `src/renderer/js/state/home.js` — Settings, advisor profile, residence, challenges
- `src/renderer/js/state/plan.js` — Monthly reports, recommended actions, workflows, export/import
- `src/renderer/js/handlers/money.js` — Money domain click/input/change handlers
- `src/renderer/js/handlers/growth.js` — Growth domain click handlers
- `src/renderer/js/handlers/home.js` — Home domain click/input/change handlers
- `src/renderer/js/handlers/plan.js` — Plan domain click/input/change handlers
- `src/renderer/js/handlers/shared.js` — Modal, workflow, AI, sidebar, theme, onboarding handlers

### Modified Files
- `src/renderer/js/app.js` — Shrink to thin coordinator (~150 lines)

### Deleted Files
- `src/renderer/js/state.js` — Replaced by state/core.js + domain modules

---

## Task 1: Create State Domain Modules

**Files:**
- Create: `src/renderer/js/state/money.js`
- Create: `src/renderer/js/state/growth.js`
- Create: `src/renderer/js/state/home.js`
- Create: `src/renderer/js/state/plan.js`

- [ ] **Step 1: Create state/money.js**

Create `src/renderer/js/state/money.js`. Each domain module receives `state` and `api` references via `init()`:

```js
let state, api;
export function init(s, a) { state = s; api = a; }

// Transactions
export async function addTransaction(tx) {
  await api.addTransaction(tx);
  state.transactions.unshift(tx);
  state.counts.transactions++;
  return tx;
}
// ... all transaction, budget, bill, debt functions
```

Read the current `src/renderer/js/state.js` and extract these functions into `state/money.js`:
- `addTransaction`, `updateTransaction`, `deleteTransaction`, `addTransactionsBatch`, `findDuplicateTransactions`, `updateCategoryByDescription`, `countTransactionsByDescription`
- `addBudget`, `updateBudget`, `deleteBudget`
- `addBill`, `updateBill`, `deleteBill`, `addRecurringLog`, `processRecurringBills`
- `addDebt`, `updateDebt`, `deleteDebt` (currently named `addDebt` etc.)

Each function body stays identical — just remove the `const api = window.wealthflow` reference (it comes from `init()` now). Keep the `export` keyword on each function.

Note: `processRecurringBills` calls `loadAll()` internally. Import `loadAll` from `./core.js` for this:
```js
import { loadAll } from './core.js';
```

- [ ] **Step 2: Create state/growth.js**

Create `src/renderer/js/state/growth.js` with the same `init()` pattern. Extract:
- `addInvestment`, `updateInvestment`, `deleteInvestment`, `refreshStockPrices`
- `addGoal`, `updateGoal`, `deleteGoal`
- `upsertContributionRoom`, `deleteContributionRoom`
- `addContribution`, `deleteContribution`
- `addRESPBeneficiary`, `updateRESPBeneficiary`, `deleteRESPBeneficiary`
- `addGIC`, `deleteGIC`

- [ ] **Step 3: Create state/home.js**

Create `src/renderer/js/state/home.js` with the same `init()` pattern. Extract:
- `updateSettings`
- `loadAdvisorProfile`, `updateAdvisorPersonal`, `updateAdvisorEmployment`, `updateAdvisorRisk`, `updateAdvisorRegistered`, `updateAdvisorInsurance`, `upsertAdvisorGoal`, `deleteAdvisorGoal`, `addAdvisorAsset`, `updateAdvisorAsset`, `deleteAdvisorAsset`, `addAdvisorDocument`, `deleteAdvisorDocument`, `copyDocumentFile`, `openDocumentFile`
- `loadResidence`, `updateResidence`
- `updateChallenge`

- [ ] **Step 4: Create state/plan.js**

Create `src/renderer/js/state/plan.js` with the same `init()` pattern. Extract:
- `snapshotNetWorth`, `getNetWorthHistory`, `getMonthlyTotals`
- `generateMonthlyReport`, `saveMonthlyReport`, `getMonthlyReports`
- `runWorkflow`, `addRecommendedAction`, `completeRecommendedAction`, `deleteRecommendedAction`
- `exportAllData`, `seedSampleData`, `addImportHistory`, `getImportHistory`
- `aiCategorize`

Note: `generateMonthlyReport` and `runWorkflow` call `buildFinancialData()`. Import it from `./core.js`:
```js
import { buildFinancialData, loadAll } from './core.js';
```

`seedSampleData` calls `loadAll()` — same import.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/js/state/money.js src/renderer/js/state/growth.js src/renderer/js/state/home.js src/renderer/js/state/plan.js
git commit -m "refactor: extract state domain modules (money, growth, home, plan)"
```

---

## Task 2: Create state/core.js

**Files:**
- Create: `src/renderer/js/state/core.js`

- [ ] **Step 1: Create state/core.js**

Create `src/renderer/js/state/core.js`. This file:

1. Owns the state object and api reference
2. Calls `init(state, api)` on each domain module
3. Contains `loadAll()`, `getState()`, `computeFinancials()`, `buildFinancialData()`
4. Re-exports all domain functions via `export * from`

```js
import { init as initMoney } from './money.js';
import { init as initGrowth } from './growth.js';
import { init as initHome } from './home.js';
import { init as initPlan } from './plan.js';

const api = window.wealthflow;

let state = {
  settings: null,
  transactions: [],
  budgets: [],
  goals: [],
  debts: [],
  investments: [],
  bills: [],
  challenges: [],
  counts: {},
  contributionRoom: [],
  contributions: [],
  respBeneficiaries: [],
  gics: [],
  advisorProfile: null,
  residence: null,
  recommendedActions: [],
};

// Initialize domain modules with shared state and api references
initMoney(state, api);
initGrowth(state, api);
initHome(state, api);
initPlan(state, api);

export function getState() { return state; }

export async function loadAll() {
  // ... same Promise.all as current state.js loadAll()
  // Copy the exact loadAll() body from current state.js
}

export async function computeFinancials() {
  return api.computeFinancials();
}

export async function buildFinancialData() {
  const financials = await api.computeFinancials();
  const { loadAdvisorProfile } = await import('./home.js');
  if (!state.advisorProfile) await loadAdvisorProfile();
  return {
    financials,
    budgets: state.budgets,
    debts: state.debts,
    investments: state.investments,
    goals: state.goals,
    contributionRoom: state.contributionRoom,
    advisorProfile: state.advisorProfile,
    settings: state.settings,
  };
}

// Re-export all domain functions
export * from './money.js';
export * from './growth.js';
export * from './home.js';
export * from './plan.js';
```

Note: The `init` functions from each domain module must NOT be re-exported (they'd conflict). Each domain module should not export `init` — instead, use a non-exported name convention. Actually, since `export *` would cause conflicts with 4 `init` functions, rename them in each domain module to `_init` or don't export them. The simplest: don't use `export` on the init functions — just use plain `function init()` and import them by name.

Wait — you can't import non-exported functions. Instead, each domain module exports `init` under a unique name:
```js
// state/money.js
export function initMoney(s, a) { state = s; api = a; }
```
Then core.js imports `initMoney`, `initGrowth`, etc. and `export *` won't conflict since the names are unique.

- [ ] **Step 2: Verify all tests pass**

Run: `cd "c:/Users/Scott Morley/Dev/wealthflow" && npx jest --no-cache`
Expected: All 81 tests pass (state/core.js isn't used yet — old state.js still imported by app.js)

- [ ] **Step 3: Commit**

```bash
git add src/renderer/js/state/core.js
git commit -m "refactor: add state/core.js with loadAll, re-exports from domain modules"
```

---

## Task 3: Switch app.js to state/core.js

**Files:**
- Modify: `src/renderer/js/app.js`

- [ ] **Step 1: Update the State import**

In `src/renderer/js/app.js`, change:
```js
import * as State from './state.js';
```
to:
```js
import * as State from './state/core.js';
```

- [ ] **Step 2: Verify app still works**

Run: `cd "c:/Users/Scott Morley/Dev/wealthflow" && npx jest --no-cache`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add src/renderer/js/app.js
git commit -m "refactor: switch app.js to import from state/core.js"
```

---

## Task 4: Create Handler Modules

**Files:**
- Create: `src/renderer/js/handlers/money.js`
- Create: `src/renderer/js/handlers/growth.js`
- Create: `src/renderer/js/handlers/home.js`
- Create: `src/renderer/js/handlers/plan.js`
- Create: `src/renderer/js/handlers/shared.js`

Each handler exports an async function that takes `(action, btn, ctx)` and returns `true` if handled, `false` if not.

The `ctx` object has this shape (provided by app.js):
```js
{
  State,          // state/core.js module
  render,         // render function
  showToast,      // toast function
  showActionToast,
  handleToastAction,
  uid,            // unique ID generator
  navigate,       // router navigate
  getSection,     // router getSection
  icon,           // icon renderer
  fmt,            // currency formatter
  h,              // HTML escaper
  validateRequired, validateAmount, showFieldError, clearFieldErrors,
  appState: {     // mutable shared state object
    activeModal,
    editData,
    sideOpen,
    showAI,
    activeWorkflowResult,
    workflowLoading,
    importModalData,
    recurringModalData,
  },
  // Page-specific imports needed by handlers:
  setExpandedGroup,
  setRegTab,
  setTxFilter, nextTxPage,
  setLastPriceRefresh,
  setShowAllActions,
  setWizardStep, getWizardStep, updateWizardDraft, getWizardDraft, initWizard,
  updateTaxInput, initTaxInputs,
  updatePlanInput,
  addUserMsg, startStreaming, clearAiHistory,
  exportJSON, exportCSV, exportPDF, exportToQIF,
  importFile, applyImport, applyHoldingsImport, checkDuplicates, aiCategorizeImport, saveImportHistory, reconcileAfterImport,
  detectRecurringPayments,
  renderDecisionCard,
  renderTransactions, renderTaxCalculator, renderPlanning, renderAdvisorWizard,
  computeRiskScore, GOAL_TYPES, DOCUMENT_TYPES,
  SAMPLE_DATA,
  addXP,
  collectFormData, saveCurrentWizardStep, handleSaveModal,
  debouncedPageRender,
  renderImportModal, renderRecurringModal,
}
```

- [ ] **Step 1: Create handlers/money.js**

Read app.js and extract these action cases into `handleMoneyAction(action, btn, ctx)`:
- `edit-tx`, `delete-tx`, `edit-budget`, `delete-budget`, `edit-bill`, `delete-bill`, `mark-paid`, `edit-debt`, `delete-debt`, `detect-recurring`, `confirm-recurring`, `close-recurring-modal`, `filter-tx-cat`, `load-more-tx`, `set-tx-type`, `ai-recategorize`

Also extract the input/change handlers for transaction search and transaction sort into a separate exported function:
```js
export function handleMoneyInput(e, ctx) { ... }
export function handleMoneyChange(e, ctx) { ... }
```

Each action case body stays identical — just reference utilities from `ctx` instead of direct imports. Example:
```js
export async function handleMoneyAction(action, btn, ctx) {
  const { State, render, showToast, uid, appState } = ctx;
  switch (action) {
    case 'delete-tx': {
      if (!confirm('Delete this transaction?')) return true;
      await State.deleteTransaction(btn.dataset.id);
      showToast('Transaction deleted');
      render();
      return true;
    }
    // ... other cases
    default: return false;
  }
}
```

- [ ] **Step 2: Create handlers/growth.js**

Extract: `edit-inv`, `delete-inv`, `refresh-stock-prices`, `set-reg-tab`, `delete-contribution`, `delete-gic`, `delete-resp-beneficiary`, `nav-to-tax`, `deposit-goal`, `delete-goal`

- [ ] **Step 3: Create handlers/home.js**

Extract: `save-ai-key`, `reload-knowledge`, `reset-all`, `nav-to-advisor`, `edit-residence`, all `wizard-*` actions (10 cases)

Also extract settings change handler:
```js
export function handleHomeChange(e, ctx) { ... }
```

- [ ] **Step 4: Create handlers/plan.js**

Extract: `generate-monthly-report`, `export-json`, `export-csv`, `export-qif`, `export-pdf`, `import-csv`, `close-import-modal`, `confirm-import`

Also extract import-related change handlers (import toggle AI, import mapping, tax inputs, planning inputs):
```js
export function handlePlanInput(e, ctx) { ... }
export function handlePlanChange(e, ctx) { ... }
```

- [ ] **Step 5: Create handlers/shared.js**

Extract: `toggle-side`, `toggle-theme`, `toggle-ai`, `toggle-group`, `expand-group`, `open-modal`, `close-modal`, `save-modal`, `send-ai`, `clear-ai-history`, `toast-action`, `run-workflow`, `save-workflow-action`, `save-all-workflow-actions`, `dismiss-workflow`, `complete-action`, `delete-action`, `show-all-actions`, `ob-next`, `ob-prev`, `start-sample`, `start-empty`

The `save-modal` case calls `handleSaveModal(type)` — this function should also be extracted into `handlers/shared.js` since it's shared across domains (transaction modal, budget modal, goal modal, etc. are all handled here).

`handleSaveModal`, `collectFormData`, `saveCurrentWizardStep`, and `addXP` should all move to their respective handlers or shared.js.

Decision: `handleSaveModal` goes in `shared.js` (it dispatches by modal type). `collectFormData` and `saveCurrentWizardStep` go in `handlers/home.js` (wizard-only). `addXP` goes in `shared.js` (used by multiple domains).

- [ ] **Step 6: Commit**

```bash
git add src/renderer/js/handlers/money.js src/renderer/js/handlers/growth.js src/renderer/js/handlers/home.js src/renderer/js/handlers/plan.js src/renderer/js/handlers/shared.js
git commit -m "refactor: extract domain handler modules from app.js"
```

---

## Task 5: Refactor app.js to Thin Coordinator

**Files:**
- Modify: `src/renderer/js/app.js`

- [ ] **Step 1: Rewrite app.js**

Replace the entire contents of `src/renderer/js/app.js` with the thin coordinator. It should:

1. Import all handler modules and utilities
2. Declare module-level mutable state in an `appState` object
3. Build the `ctx` object
4. `render()` function — same logic, reads `appState` for modal/sidebar/AI state
5. `bindEvents()` function — single click listener that tries each handler in order:
   ```js
   const handled = await handleSharedAction(action, btn, ctx)
     || await handleMoneyAction(action, btn, ctx)
     || await handleGrowthAction(action, btn, ctx)
     || await handleHomeAction(action, btn, ctx)
     || await handlePlanAction(action, btn, ctx);
   ```
   Plus input/change listeners that delegate similarly.
6. `init()` function — same setup logic
7. Keyboard shortcuts — keep in app.js (they reference `appState` directly)

The `render()` function stays in app.js because it needs all page render imports and the section switch. This keeps app.js as the single place that knows about all pages.

Target: app.js should be ~200-250 lines (render ~80, bindEvents ~40, init ~50, imports ~30, setup ~20).

Note: `appState` should be a plain object so handlers can mutate it:
```js
const appState = {
  sideOpen: true,
  showAI: false,
  activeModal: null,
  editData: null,
  importModalData: null,
  recurringModalData: null,
  activeWorkflowResult: null,
  workflowLoading: false,
};
```

- [ ] **Step 2: Verify all tests pass**

Run: `cd "c:/Users/Scott Morley/Dev/wealthflow" && npx jest --no-cache`
Expected: All 81 tests pass

- [ ] **Step 3: Commit**

```bash
git add src/renderer/js/app.js
git commit -m "refactor: shrink app.js to thin coordinator with handler dispatch"
```

---

## Task 6: Delete Old state.js

**Files:**
- Delete: `src/renderer/js/state.js`

- [ ] **Step 1: Verify no remaining imports of old state.js**

Search for any file still importing `'./state.js'` or `'../state.js'`:
```bash
grep -r "from.*state\.js" src/renderer/js/ --include="*.js"
```
Expected: No matches (all should reference `state/core.js` now)

If any matches found, update them to `state/core.js`.

- [ ] **Step 2: Delete state.js**

```bash
rm src/renderer/js/state.js
```

- [ ] **Step 3: Run all tests**

Run: `cd "c:/Users/Scott Morley/Dev/wealthflow" && npx jest --no-cache`
Expected: All 81 tests pass

- [ ] **Step 4: Commit**

```bash
git rm src/renderer/js/state.js
git commit -m "refactor: delete old state.js, fully replaced by state/ modules"
```

---

## Task 7: Final Verification

**Files:** None (verification only)

- [ ] **Step 1: Run all tests**

Run: `cd "c:/Users/Scott Morley/Dev/wealthflow" && npx jest --no-cache`
Expected: All 81 tests pass

- [ ] **Step 2: Run lint on new files**

Run: `cd "c:/Users/Scott Morley/Dev/wealthflow" && npx eslint src/renderer/js/state/core.js src/renderer/js/state/money.js src/renderer/js/state/growth.js src/renderer/js/state/home.js src/renderer/js/state/plan.js src/renderer/js/handlers/money.js src/renderer/js/handlers/growth.js src/renderer/js/handlers/home.js src/renderer/js/handlers/plan.js src/renderer/js/handlers/shared.js src/renderer/js/app.js`
Expected: No errors

- [ ] **Step 3: Verify file sizes**

Run: `wc -l src/renderer/js/app.js src/renderer/js/state/core.js src/renderer/js/state/money.js src/renderer/js/state/growth.js src/renderer/js/state/home.js src/renderer/js/state/plan.js src/renderer/js/handlers/money.js src/renderer/js/handlers/growth.js src/renderer/js/handlers/home.js src/renderer/js/handlers/plan.js src/renderer/js/handlers/shared.js`
Expected:
- app.js: under 250 lines
- No state file over 150 lines
- No handler file over 400 lines

- [ ] **Step 4: Verify app launches and all pages work**

Run: `cd "c:/Users/Scott Morley/Dev/wealthflow" && npx electron .`
Expected: App launches, all pages render correctly, all actions work, no console errors. Specifically test:
- Dashboard loads with Next Best Actions
- Navigate through all 4 groups
- Add/edit/delete a transaction
- Open AI chat and send a message
- Run a workflow from dashboard
- Visit advisor wizard and navigate steps
- Settings page saves changes

- [ ] **Step 5: Final commit if fixes needed**

```bash
git add -A
git commit -m "fix: address smoke test issues from Phase 3 refactor"
```
