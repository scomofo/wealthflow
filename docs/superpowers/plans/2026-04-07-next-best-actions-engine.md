# Next Best Actions Engine — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a persistent, rule-based Next Best Actions system that automatically generates scored and ranked financial actions, stores them in the database, and surfaces them on the dashboard with complete/dismiss/snooze lifecycle.

**Architecture:** Main process engine generates candidate actions from financial state using deterministic rules, scores and ranks them, deduplicates by action_key, and persists to a new `next_best_actions` DB table. Renderer loads persisted actions and renders them via the existing orphaned `next-best-actions-panel.js` component. Replaces the current computed-on-the-fly `computeNextActions()` approach in dashboard.js.

**Tech Stack:** sql.js (SQLite via WASM), Electron IPC, vanilla JS renderer.

---

## File Structure

### New Files
- `src/main/migrations/010-next-best-actions.js` — DB table for persistent NBA
- `src/main/next-best-actions-engine.js` — Rule engine: generate, score, rank, dedup, persist
- `tests/next-best-actions-engine.test.js` — Engine rule tests

### Modified Files
- `src/main/database.js` — Add migration 009 to array + NBA CRUD methods + migration 010
- `src/main/ipc-handlers.js` — Add NBA IPC handlers
- `src/main/preload.js` — Add NBA bridge methods
- `src/renderer/js/state/core.js` — Add nextBestActions to state + loadAll
- `src/renderer/js/state/plan.js` — Add NBA state methods
- `src/renderer/js/handlers/shared.js` — Add NBA action handlers (complete/dismiss/snooze/refresh)
- `src/renderer/js/pages/dashboard.js` — Replace computed NBA with persistent NBA panel
- `src/renderer/js/app.js` — Wire NBA refresh on startup

### Existing Files (already exist, may need updates)
- `src/renderer/js/components/next-best-actions-panel.js` — Already exists, orphaned. Wire it in.

---

## Task 1: Fix Migration 009 + Create Migration 010

**Files:**
- Modify: `src/main/database.js`
- Create: `src/main/migrations/010-next-best-actions.js`

- [ ] **Step 1: Add migration 009 to the migrations array**

In `src/main/database.js`, find the migrations array in `runMigrations()` (around line 144-152). Add `require('./migrations/009-recommended-actions')` after the 008 line:

```js
    require('./migrations/008-new-features'),
    require('./migrations/009-recommended-actions'),
```

- [ ] **Step 2: Create migration 010**

Create `src/main/migrations/010-next-best-actions.js`:

```js
module.exports = {
  version: 10,
  name: '010-next-best-actions',
  up(db) {
    db.run(`CREATE TABLE IF NOT EXISTS next_best_actions (
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
    )`);
    db.run('CREATE INDEX IF NOT EXISTS idx_nba_action_key ON next_best_actions(action_key)');
    db.run('CREATE INDEX IF NOT EXISTS idx_nba_status ON next_best_actions(status)');
    db.run('CREATE INDEX IF NOT EXISTS idx_nba_score ON next_best_actions(score)');
  },
};
```

Add to migrations array:
```js
    require('./migrations/010-next-best-actions'),
```

- [ ] **Step 3: Add NBA CRUD methods to database.js**

After the existing `deleteRecommendedAction` method, add:

```js
  // Next Best Actions
  listNextBestActions(statusFilter) {
    if (statusFilter) {
      return this.getAll("SELECT * FROM next_best_actions WHERE status = ? AND deleted_at IS NULL ORDER BY score DESC", [statusFilter]);
    }
    return this.getAll("SELECT * FROM next_best_actions WHERE deleted_at IS NULL ORDER BY score DESC");
  }

  upsertNextBestAction(a) {
    const existing = this.getOne("SELECT id FROM next_best_actions WHERE action_key = ? AND deleted_at IS NULL", [a.action_key]);
    if (existing) {
      this.run(
        'UPDATE next_best_actions SET title=?, description=?, rationale=?, category=?, priority=?, score=?, source_payload=?, related_entity_type=?, related_entity_id=?, impact_text=?, generated_at=datetime(\'now\') WHERE id=?',
        [a.title, a.description || null, a.rationale || null, a.category || null, a.priority, a.score, a.source_payload || null, a.related_entity_type || null, a.related_entity_id || null, a.impact_text || null, existing.id]
      );
      return { ...a, id: existing.id };
    }
    this.run(
      'INSERT INTO next_best_actions (id, action_key, title, description, rationale, category, priority, score, status, source_type, source_payload, related_entity_type, related_entity_id, impact_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [a.id, a.action_key, a.title, a.description || null, a.rationale || null, a.category || null, a.priority, a.score, 'open', a.source_type || 'rule', a.source_payload || null, a.related_entity_type || null, a.related_entity_id || null, a.impact_text || null]
    );
    return a;
  }

  completeNextBestAction(id) {
    this.run("UPDATE next_best_actions SET status = 'done', completed_at = datetime('now') WHERE id = ?", [id]);
  }

  dismissNextBestAction(id) {
    this.run("UPDATE next_best_actions SET status = 'dismissed', dismissed_at = datetime('now') WHERE id = ?", [id]);
  }

  snoozeNextBestAction(id, untilDate) {
    this.run("UPDATE next_best_actions SET status = 'snoozed', snoozed_until = ? WHERE id = ?", [untilDate, id]);
  }

  deleteNextBestAction(id) {
    this.run("UPDATE next_best_actions SET deleted_at = datetime('now') WHERE id = ?", [id]);
  }

  clearStaleNextBestActions(activeKeys) {
    if (!activeKeys || activeKeys.length === 0) return;
    const placeholders = activeKeys.map(() => '?').join(',');
    this.run(
      "UPDATE next_best_actions SET deleted_at = datetime('now') WHERE status = 'open' AND action_key NOT IN (" + placeholders + ") AND deleted_at IS NULL",
      activeKeys
    );
  }
```

- [ ] **Step 4: Commit**

```bash
git add src/main/database.js src/main/migrations/010-next-best-actions.js
git commit -m "feat: add next_best_actions table, fix migration 009 registration, add NBA CRUD"
```

---

## Task 2: Next Best Actions Engine

**Files:**
- Create: `src/main/next-best-actions-engine.js`
- Create: `tests/next-best-actions-engine.test.js`

- [ ] **Step 1: Write the test file**

Create `tests/next-best-actions-engine.test.js`:

```js
const { NextBestActionsEngine } = require('../src/main/next-best-actions-engine');

// Mock database
function mockDb(existingActions = []) {
  return {
    listNextBestActions: jest.fn(() => existingActions),
    upsertNextBestAction: jest.fn(a => a),
    clearStaleNextBestActions: jest.fn(),
    getSettings: jest.fn(() => ({ province: 'AB' })),
    listBudgets: jest.fn(() => []),
    listDebts: jest.fn(() => []),
    listBills: jest.fn(() => []),
    listGoals: jest.fn(() => []),
    listInvestments: jest.fn(() => []),
    getContributionRoom: jest.fn(() => []),
    computeFinancials: jest.fn(() => ({ income: 5000, expenses: 3000, savingsRate: 40, catSpending: {}, netWorth: 50000, totalDebt: 0 })),
  };
}

describe('NextBestActionsEngine', () => {
  test('generates budget overrun action', async () => {
    const db = mockDb();
    db.listBudgets.mockReturnValue([{ id: 'b1', category: 'Food', amount: 500 }]);
    db.computeFinancials.mockReturnValue({ income: 5000, expenses: 3000, savingsRate: 40, catSpending: { Food: 600 }, netWorth: 50000, totalDebt: 0 });

    const engine = new NextBestActionsEngine(db);
    const actions = await engine.generateActions();
    expect(actions.some(a => a.category === 'budget' && a.action_key.includes('food'))).toBe(true);
  });

  test('generates high-interest debt action', async () => {
    const db = mockDb();
    db.listDebts.mockReturnValue([{ id: 'd1', name: 'Visa', balance: 5000, rate: 19.99, min_payment: 100 }]);

    const engine = new NextBestActionsEngine(db);
    const actions = await engine.generateActions();
    expect(actions.some(a => a.category === 'debt' && a.priority === 'urgent')).toBe(true);
  });

  test('generates bills due soon action', async () => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const db = mockDb();
    db.listBills.mockReturnValue([{ id: 'bl1', title: 'Rent', amount: 1500, next_due_date: tomorrow, type: 'bill' }]);

    const engine = new NextBestActionsEngine(db);
    const actions = await engine.generateActions();
    expect(actions.some(a => a.category === 'bills')).toBe(true);
  });

  test('generates contribution room action', async () => {
    const db = mockDb();
    db.getContributionRoom.mockReturnValue([{ account_type: 'tfsa', known_room: 15000 }]);
    db.computeFinancials.mockReturnValue({ income: 5000, expenses: 3000, savingsRate: 40, catSpending: {}, netWorth: 50000, totalDebt: 0 });

    const engine = new NextBestActionsEngine(db);
    const actions = await engine.generateActions();
    expect(actions.some(a => a.category === 'investing')).toBe(true);
  });

  test('generates goal off-track action', async () => {
    const deadline = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
    const db = mockDb();
    db.listGoals.mockReturnValue([{ id: 'g1', name: 'Vacation', target: 10000, current: 500, deadline }]);
    db.computeFinancials.mockReturnValue({ income: 5000, expenses: 4500, savingsRate: 10, catSpending: {}, netWorth: 50000, totalDebt: 0 });

    const engine = new NextBestActionsEngine(db);
    const actions = await engine.generateActions();
    expect(actions.some(a => a.category === 'planning')).toBe(true);
  });

  test('generates missing profile action', async () => {
    const db = mockDb();
    db.getSettings.mockReturnValue({ province: 'AB', profile_completed: false });

    const engine = new NextBestActionsEngine(db);
    const actions = await engine.generateActions();
    expect(actions.some(a => a.category === 'planning' && a.action_key === 'missing_profile')).toBe(true);
  });

  test('ranks actions by score descending', async () => {
    const db = mockDb();
    db.listDebts.mockReturnValue([{ id: 'd1', name: 'Visa', balance: 5000, rate: 19.99, min_payment: 100 }]);
    db.getSettings.mockReturnValue({ province: 'AB', profile_completed: false });

    const engine = new NextBestActionsEngine(db);
    const actions = await engine.generateActions();
    for (let i = 1; i < actions.length; i++) {
      expect(actions[i].score).toBeLessThanOrEqual(actions[i - 1].score);
    }
  });

  test('does not regenerate recently completed action', async () => {
    const completedRecently = {
      action_key: 'high_interest_debt_visa',
      status: 'done',
      completed_at: new Date().toISOString(),
    };
    const db = mockDb([completedRecently]);
    db.listDebts.mockReturnValue([{ id: 'd1', name: 'Visa', balance: 5000, rate: 19.99, min_payment: 100 }]);

    const engine = new NextBestActionsEngine(db);
    const actions = await engine.generateActions();
    expect(actions.some(a => a.action_key === 'high_interest_debt_visa')).toBe(false);
  });

  test('persists generated actions via upsert', async () => {
    const db = mockDb();
    db.listDebts.mockReturnValue([{ id: 'd1', name: 'Visa', balance: 5000, rate: 19.99, min_payment: 100 }]);

    const engine = new NextBestActionsEngine(db);
    await engine.generateActions();
    expect(db.upsertNextBestAction).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd "c:/Users/Scott Morley/Dev/wealthflow" && npx jest tests/next-best-actions-engine.test.js --no-cache`
Expected: FAIL — module not found

- [ ] **Step 3: Write the engine implementation**

Create `src/main/next-best-actions-engine.js`. This is a CJS module.

The engine:
1. Gathers financial state from the database (budgets, debts, bills, goals, investments, contribution room, settings, computed financials)
2. Runs 8 deterministic rules, each producing candidate actions with scores
3. Deduplicates by action_key against existing actions
4. Skips regenerating actions completed within last 7 days
5. Persists via `database.upsertNextBestAction()`
6. Clears stale open actions whose keys no longer apply
7. Returns sorted array (by score descending)

**Rules and scoring:**
1. Budget overrun: base 70, +10 if overrun >20%, +10 if top 3 category. Category: 'budget'
2. High-interest debt: base 80, +10 if APR >=15%, +5 if balance >5000. Category: 'debt'
3. Bills due soon: base 90 if due <=3 days, 75 if <=7 days. Category: 'bills'
4. Low emergency fund: base 75, +10 if debt also exists. Category: 'cashflow'
5. Unused contribution room: base 60, +10 if no recent contributions. Category: 'investing'
6. Goal off-track: base 65, +10 if deadline within 6 months. Category: 'planning'
7. Recurring untracked: base 55. Category: 'bills' (skip for V1 — requires transaction analysis)
8. Missing profile: base 40. Category: 'planning'

**Priority mapping from score:** 85+ = urgent, 70-84 = high, 50-69 = medium, below 50 = low

**Action shape:**
```js
{
  id: crypto.randomUUID(),
  action_key: 'budget_overrun_food_2026_04',
  title: 'Reduce Food spending by $180 this month',
  description: 'You are over budget in Food based on current monthly spending.',
  rationale: 'Overspending in this category is reducing your monthly cash flow.',
  category: 'budget',
  priority: 'high',
  score: 80,
  source_type: 'rule',
  related_entity_type: 'budget',
  related_entity_id: 'b1',
  impact_text: 'Freeing up $180/mo improves monthly cash flow.'
}
```

CJS export: `module.exports = { NextBestActionsEngine };`

- [ ] **Step 4: Run tests**

Run: `cd "c:/Users/Scott Morley/Dev/wealthflow" && npx jest tests/next-best-actions-engine.test.js --no-cache`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/main/next-best-actions-engine.js tests/next-best-actions-engine.test.js
git commit -m "feat: add NextBestActionsEngine with 8 rules and scoring"
```

---

## Task 3: IPC + Bridge + State

**Files:**
- Modify: `src/main/ipc-handlers.js`
- Modify: `src/main/preload.js`
- Modify: `src/renderer/js/state/core.js`
- Modify: `src/renderer/js/state/plan.js`

- [ ] **Step 1: Add NBA IPC handlers**

In `src/main/ipc-handlers.js`, after the recommended-actions handlers, add:

```js
  // Next Best Actions
  const { NextBestActionsEngine } = require('./next-best-actions-engine');
  const nbaEngine = new NextBestActionsEngine(database);

  safeHandle('actions:generate-next-best', async () => {
    return nbaEngine.generateActions();
  });
  safeHandle('actions:list-next-best', () => database.listNextBestActions('open'));
  safeHandle('actions:complete-next-best', (_, id) => database.completeNextBestAction(id));
  safeHandle('actions:dismiss-next-best', (_, id) => database.dismissNextBestAction(id));
  safeHandle('actions:snooze-next-best', (_, id, untilDate) => database.snoozeNextBestAction(id, untilDate));
```

- [ ] **Step 2: Add NBA bridge methods to preload.js**

Before the closing `});`, add:

```js
  // Next Best Actions
  generateNextBestActions: () => ipcRenderer.invoke('actions:generate-next-best'),
  getNextBestActions: () => ipcRenderer.invoke('actions:list-next-best'),
  completeNextBestAction: (id) => ipcRenderer.invoke('actions:complete-next-best', id),
  dismissNextBestAction: (id) => ipcRenderer.invoke('actions:dismiss-next-best', id),
  snoozeNextBestAction: (id, untilDate) => ipcRenderer.invoke('actions:snooze-next-best', id, untilDate),
```

- [ ] **Step 3: Add nextBestActions to state/core.js**

Add `nextBestActions: [],` to the state object in core.js.

Add `api.getNextBestActions()` to the `loadAll()` Promise.all and assign to state.

- [ ] **Step 4: Add NBA state methods to state/plan.js**

Add these exports:

```js
// Next Best Actions
export async function generateNextBestActions() {
  const result = await api.generateNextBestActions();
  state.nextBestActions = result;
  return result;
}

export async function loadNextBestActions() {
  state.nextBestActions = await api.getNextBestActions();
  return state.nextBestActions;
}

export async function completeNextBestAction(id) {
  await api.completeNextBestAction(id);
  state.nextBestActions = state.nextBestActions.filter(a => a.id !== id);
}

export async function dismissNextBestAction(id) {
  await api.dismissNextBestAction(id);
  state.nextBestActions = state.nextBestActions.filter(a => a.id !== id);
}

export async function snoozeNextBestAction(id, untilDate) {
  await api.snoozeNextBestAction(id, untilDate);
  state.nextBestActions = state.nextBestActions.filter(a => a.id !== id);
}
```

- [ ] **Step 5: Commit**

```bash
git add src/main/ipc-handlers.js src/main/preload.js src/renderer/js/state/core.js src/renderer/js/state/plan.js
git commit -m "feat: wire NBA engine through IPC, bridge, and state layer"
```

---

## Task 4: Wire Dashboard + Handlers

**Files:**
- Modify: `src/renderer/js/handlers/shared.js`
- Modify: `src/renderer/js/pages/dashboard.js`
- Modify: `src/renderer/js/app.js`

- [ ] **Step 1: Add NBA action handlers to shared.js**

Add these cases to the click switch in `handleSharedAction`:

```js
      case 'generate-next-best-actions': {
        ctx.showToast('Refreshing actions...', 'info');
        try {
          await ctx.State.generateNextBestActions();
          ctx.render();
        } catch (err) {
          ctx.showToast('Failed to refresh actions: ' + err.message, 'error');
        }
        return true;
      }
      case 'complete-next-best-action': {
        await ctx.State.completeNextBestAction(btn.dataset.id);
        ctx.showToast('Action completed');
        ctx.render();
        return true;
      }
      case 'dismiss-next-best-action': {
        await ctx.State.dismissNextBestAction(btn.dataset.id);
        ctx.showToast('Action dismissed');
        ctx.render();
        return true;
      }
      case 'snooze-next-best-action': {
        const until = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
        await ctx.State.snoozeNextBestAction(btn.dataset.id, until);
        ctx.showToast('Snoozed for 7 days');
        ctx.render();
        return true;
      }
```

- [ ] **Step 2: Update dashboard.js to use persistent NBA**

In `src/renderer/js/pages/dashboard.js`:

Replace the import of `computeNextActions` from `../utils/next-actions.js` with the import of `renderNextBestActionsPanel` from `../components/next-best-actions-panel.js`.

Replace the computed actions section (which calls `computeNextActions(state, F)` and renders inline) with:

```js
${renderNextBestActionsPanel(state.nextBestActions || [], { loading: false, stale: false })}
```

Keep the rest of the dashboard (spending snapshot, achievements strip, quick links, AI recommendations, action list) unchanged.

- [ ] **Step 3: Add NBA generation to app startup**

In `src/renderer/js/app.js`, find the `init()` function. After `State.loadAll()`, add:

```js
    try { await State.generateNextBestActions(); } catch (_) { /* non-blocking */ }
```

This generates/refreshes NBA on every app start.

- [ ] **Step 4: Run all tests**

Run: `cd "c:/Users/Scott Morley/Dev/wealthflow" && npx jest --no-cache`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add src/renderer/js/handlers/shared.js src/renderer/js/pages/dashboard.js src/renderer/js/app.js
git commit -m "feat: wire persistent NBA into dashboard with complete/dismiss/snooze"
```

---

## Task 5: Final Verification

**Files:** None (verification only)

- [ ] **Step 1: Run all tests**

Run: `cd "c:/Users/Scott Morley/Dev/wealthflow" && npx jest --no-cache`
Expected: All tests pass

- [ ] **Step 2: Run lint on new files**

Run: `cd "c:/Users/Scott Morley/Dev/wealthflow" && npx eslint src/main/next-best-actions-engine.js`
Expected: No errors

- [ ] **Step 3: Verify app launches**

Run: `cd "c:/Users/Scott Morley/Dev/wealthflow" && npx electron .`
Expected:
- Dashboard shows "Next Best Actions" hero panel at top
- Actions generated from real financial data (if any data exists)
- Complete/Dismiss/Snooze buttons work
- Refresh button regenerates actions
- Actions persist across app restart
- Empty state shows "You're in good shape" message

- [ ] **Step 4: Final commit if fixes needed**

```bash
git add -A
git commit -m "fix: address smoke test issues from NBA engine"
```
