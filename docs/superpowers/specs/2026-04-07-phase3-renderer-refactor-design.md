# Phase 3 Design Spec: Renderer Architecture Refactor

**Goal:** Split app.js (1,726 lines) and state.js (486 lines) into domain-specific modules for maintainability, without changing any behavior.

**Scope:** Renderer side only. No main process changes. No new features.

---

## 1. Domain Split Map

Everything splits along the 4 nav groups plus shared infrastructure:

| Domain | Handler File | State File | Entities |
|--------|-------------|------------|----------|
| **Money** | `handlers/money.js` | `state/money.js` | transactions, budgets, bills, debts |
| **Growth** | `handlers/growth.js` | `state/growth.js` | investments, savings/goals, registered accounts (contributions, room, RESP, GICs), stock refresh |
| **Home** | `handlers/home.js` | `state/home.js` | settings, advisor profile, residence, achievements/XP |
| **Plan** | `handlers/plan.js` | `state/plan.js` | analytics, monthly reports, recommended actions, workflows |
| **Shared** | `handlers/shared.js` | — | modals, AI chat, import/export, sidebar, theme, workflow UI |
| **Coordinator** | `app.js` (~150 lines) | `state/core.js` | init, render, event delegation, state object, loadAll, getState, computeFinancials |

---

## 2. Event Delegation Pattern

Each domain handler exports a function with this signature:

```js
export async function handleMoneyAction(action, btn, ctx) {
  switch (action) {
    case 'edit-tx': { ... return true; }
    // ...
    default: return false;
  }
}
```

Returns `true` if the action was handled, `false` otherwise.

**app.js dispatcher in bindEvents():**

```js
const ctx = { State, render, showToast, showActionToast, uid, ... };
const handled = await handleMoneyAction(action, btn, ctx)
  || await handleGrowthAction(action, btn, ctx)
  || await handleSharedAction(action, btn, ctx)
  || await handleHomeAction(action, btn, ctx)
  || await handlePlanAction(action, btn, ctx);
```

The **context object** (`ctx`) passes shared state and utilities to avoid circular dependencies. It includes: `State` (the core state module), `render`, `showToast`, `showActionToast`, `handleToastAction`, `uid`, `icon`, `fmt`, `h`, `navigate`, `getSection`, plus mutable refs for `activeModal`, `editData`, `sideOpen`, `showAI`, `activeWorkflowResult`, `workflowLoading`.

Mutable state is passed as an object reference (`ctx.appState = { activeModal, editData, sideOpen, showAI, activeWorkflowResult, workflowLoading }`) so handlers can modify it and app.js sees the changes.

---

## 3. State Module Pattern

**state/core.js** owns the state object and API reference:

```js
let state = { ... };
const api = window.wealthflow;

export function getState() { return state; }
export function _getStateRef() { return { state, api }; }  // for domain modules
export async function loadAll() { ... }
```

Each domain state module receives `state` and `api` via a one-time `init()` call:

```js
// state/money.js
let state, api;
export function init(s, a) { state = s; api = a; }

export async function addTransaction(tx) {
  await api.addTransaction(tx);
  state.transactions.unshift(tx);
  state.counts.transactions++;
  return tx;
}
```

**core.js** calls `init()` on all domain modules at startup (in `loadAll()` or a dedicated `initState()` before the first load).

**Re-exports:** `core.js` does `export * from './money.js'` etc. so all consumers that currently import from `state.js` can import from `state/core.js` with zero changes to their import statements.

---

## 4. Action-to-Handler Mapping

### handlers/money.js
Actions: `edit-tx`, `delete-tx`, `edit-budget`, `delete-budget`, `edit-bill`, `delete-bill`, `mark-paid`, `edit-debt`, `delete-debt`, `detect-recurring`, `confirm-recurring`, `close-recurring-modal`, `filter-tx-cat`, `load-more-tx`, `set-tx-type`, `ai-recategorize`

### handlers/growth.js
Actions: `edit-inv`, `delete-inv`, `refresh-stock-prices`, `set-reg-tab`, `delete-contribution`, `delete-gic`, `delete-resp-beneficiary`, `nav-to-tax`, `deposit-goal`, `delete-goal`

### handlers/home.js
Actions: `save-ai-key`, `reload-knowledge`, `reset-all`, `nav-to-advisor`, `edit-residence`, `wizard-goto-step`, `wizard-next`, `wizard-prev`, `wizard-skip`, `wizard-save-step`, `wizard-toggle-goal`, `wizard-add-asset`, `wizard-delete-asset`, `wizard-upload-doc`, `wizard-open-doc`, `wizard-delete-doc`, `wizard-complete-profile`

### handlers/plan.js
Actions: `generate-monthly-report`, `export-json`, `export-csv`, `export-qif`, `export-pdf`, `import-csv`, `close-import-modal`, `confirm-import`

### handlers/shared.js
Actions: `toggle-side`, `toggle-theme`, `toggle-ai`, `toggle-group`, `expand-group`, `open-modal`, `close-modal`, `save-modal`, `send-ai`, `clear-ai-history`, `toast-action`, `run-workflow`, `save-workflow-action`, `save-all-workflow-actions`, `dismiss-workflow`, `complete-action`, `delete-action`, `show-all-actions`, `ob-next`, `ob-prev`, `start-sample`, `start-empty`

---

## 5. State Function Mapping

### state/money.js
Functions: `addTransaction`, `updateTransaction`, `deleteTransaction`, `addTransactionsBatch`, `findDuplicateTransactions`, `updateCategoryByDescription`, `countTransactionsByDescription`, `addBudget`, `updateBudget`, `deleteBudget`, `addBill`, `updateBill`, `deleteBill`, `addRecurringLog`, `processRecurringBills`

### state/growth.js
Functions: `addInvestment`, `updateInvestment`, `deleteInvestment`, `refreshStockPrices`, `addGoal`, `updateGoal`, `deleteGoal`, `upsertContributionRoom`, `deleteContributionRoom`, `addContribution`, `deleteContribution`, `addRESPBeneficiary`, `updateRESPBeneficiary`, `deleteRESPBeneficiary`, `addGIC`, `deleteGIC`

### state/home.js
Functions: `updateSettings`, `loadAdvisorProfile`, `updateAdvisorPersonal`, `updateAdvisorEmployment`, `updateAdvisorRisk`, `updateAdvisorRegistered`, `updateAdvisorInsurance`, `upsertAdvisorGoal`, `deleteAdvisorGoal`, `addAdvisorAsset`, `updateAdvisorAsset`, `deleteAdvisorAsset`, `addAdvisorDocument`, `deleteAdvisorDocument`, `copyDocumentFile`, `openDocumentFile`, `loadResidence`, `updateResidence`, `updateChallenge`

### state/plan.js
Functions: `snapshotNetWorth`, `getNetWorthHistory`, `getMonthlyTotals`, `generateMonthlyReport`, `saveMonthlyReport`, `getMonthlyReports`, `runWorkflow`, `addRecommendedAction`, `completeRecommendedAction`, `deleteRecommendedAction`, `exportAllData`, `seedSampleData`, `addImportHistory`, `getImportHistory`, `aiCategorize`

### state/core.js (kept here)
Functions: `getState`, `loadAll`, `computeFinancials`

Private: `buildFinancialData()`, `_getStateRef()`

---

## 6. Import Changes

**Before:** `import * as State from './state.js'`
**After:** `import * as State from './state/core.js'`

Files that need this import path update:
- `app.js`
- All handler files (via the `ctx` object, not direct import)
- `pages/dashboard.js` (if it imports State directly — check; it currently doesn't, it receives state as param)

Most page files receive `state` as a function parameter, not via import. So the import change is minimal — primarily just app.js.

---

## 7. What Changes, What Doesn't

### Changes
- `app.js` — shrinks from 1,726 to ~150 lines
- `state.js` — replaced by `state/core.js` + 4 domain modules
- 5 new handler files created
- 5 new state files created (including core.js)

### Doesn't Change
- No page files change (they receive state as params)
- No component files change
- No main process files change
- No CSS changes
- No new features, no behavior changes
- All 81 existing tests pass without modification

### Migration Strategy
Since `state/core.js` re-exports everything with `export *`, this is a transparent refactor. The dispatcher pattern means we can migrate one domain at a time, testing after each.

---

## 8. Explicit Non-Goals

- No database.js split
- No ipc-handlers.js split
- No page file changes
- No new features
- No computed selectors
- No test changes (existing 81 tests must pass unchanged)

---

## 9. File Tree

```
src/renderer/js/
├── app.js                    (~150 lines — coordinator)
├── handlers/
│   ├── money.js              (tx, budget, bill, debt actions)
│   ├── growth.js             (investment, registered, savings actions)
│   ├── home.js               (settings, advisor/wizard, residence)
│   ├── plan.js               (analytics, tax, planning, monthly report, export/import)
│   └── shared.js             (modal, workflow, AI chat, sidebar, theme, onboarding)
├── state/
│   ├── core.js               (state object, loadAll, getState, computeFinancials, re-exports)
│   ├── money.js              (transaction/budget/bill/debt CRUD)
│   ├── growth.js             (investment/goal/contribution/RESP/GIC CRUD + stock refresh)
│   ├── home.js               (settings, advisor profile, residence, challenges)
│   └── plan.js               (monthly reports, recommended actions, workflows, export/import)
├── pages/                    (unchanged)
├── components/               (unchanged)
├── utils/                    (unchanged)
└── canadian/                 (unchanged)
```

---

## 10. Success Criteria

- app.js is under 200 lines
- No file in handlers/ exceeds 400 lines
- No file in state/ exceeds 150 lines
- All 81 existing tests pass
- App launches and all pages work identically to before
- No regressions in any page functionality
