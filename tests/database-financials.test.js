const fs = require('fs');
const os = require('os');
const path = require('path');

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wealthflow-fin-'));
process.resourcesPath = tempRoot;

jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => tempRoot),
  },
  safeStorage: {
    isEncryptionAvailable: jest.fn(() => false),
  },
}));

const { WealthFlowDatabase } = require('../src/main/database.js');

function flushPendingSave(database) {
  if (database._saveTimer) {
    clearTimeout(database._saveTimer);
    database._saveTimer = null;
  }
}

describe('WealthFlowDatabase computeFinancials zero-vs-absent', () => {
  let database;

  beforeEach(async () => {
    const dbPath = path.join(tempRoot, 'wealthflow.db');
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    database = new WealthFlowDatabase();
    await database.init();
    database.updateSettings({
      monthly_income: 5000,
      monthly_expenses: 3200,
      total_debt: 12000,
      savings_buffer: 1500,
    });
  });

  afterEach(() => {
    if (database) database.close();
  });

  test('uses DB totals once rows exist, even when the total is legitimately 0', () => {
    database.addDebt({ id: 'd1', name: 'Visa', balance: 0, rate: 19.99, min_payment: 0, type: 'credit' });
    database.addGoal({ id: 'g1', name: 'Emergency fund', target: 5000, current: 0 });
    database.addTransaction({ id: 't1', description: 'Salary', amount: 4200, category: 'Income', date: '2026-06-01' });

    const financials = database.computeFinancials();

    expect(financials.totalDebt).toBe(0); // debt paid off — not the stale 12000
    expect(financials.totalSaved).toBe(0); // goal at 0 — not the stale 1500
    expect(financials.income).toBe(4200); // real transactions — not the onboarding 5000
    expect(financials.expenses).toBe(0); // transactions exist with no spending — not 3200
  });

  test('falls back to onboarding values when no rows exist', () => {
    const financials = database.computeFinancials();

    expect(financials.income).toBe(5000);
    expect(financials.expenses).toBe(3200);
    expect(financials.totalDebt).toBe(12000);
    expect(financials.totalSaved).toBe(1500);
  });

  test('soft-deleted rows do not count as real data', () => {
    database.addDebt({ id: 'd1', name: 'Visa', balance: 700, rate: 19.99, min_payment: 25, type: 'credit' });
    database.deleteDebt('d1');

    const financials = database.computeFinancials();

    expect(financials.totalDebt).toBe(12000);
  });

  test('transfer-only transactions still fall back to onboarding income/expenses', () => {
    database.addTransaction({ id: 't1', description: 'To savings', amount: -300, category: 'Transfer', date: '2026-06-01' });

    const financials = database.computeFinancials();

    expect(financials.income).toBe(5000);
    expect(financials.expenses).toBe(3200);
  });

  test('emergency fund action is not generated when the onboarding buffer covers a month of expenses', async () => {
    database.updateSettings({ savings_buffer: 3500, profile_completed: true });

    const { NextBestActionsEngine } = require('../src/main/next-best-actions-engine.js');
    const engine = new NextBestActionsEngine(database);
    const actions = await engine.generateActions();

    expect(actions.find((a) => a.action_key === 'low_emergency_fund')).toBeUndefined();
  });
});

describe('WealthFlowDatabase listNextBestActions unsnooze', () => {
  let database;

  beforeEach(async () => {
    const dbPath = path.join(tempRoot, 'wealthflow.db');
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    database = new WealthFlowDatabase();
    await database.init();
  });

  afterEach(() => {
    if (database) database.close();
  });

  test('unsnoozes expired actions and schedules a save only when rows changed', () => {
    database.upsertNextBestAction({ id: 'a1', action_key: 'k1', title: 'Expired snooze', priority: 'medium', score: 50 });
    database.snoozeNextBestAction('a1', '2020-01-01');
    database.upsertNextBestAction({ id: 'a2', action_key: 'k2', title: 'Future snooze', priority: 'medium', score: 40 });
    database.snoozeNextBestAction('a2', '2099-01-01');

    flushPendingSave(database);
    const spy = jest.spyOn(database, '_deferSave');

    const open = database.listNextBestActions('open');
    expect(open.map((a) => a.id)).toContain('a1');
    expect(open.map((a) => a.id)).not.toContain('a2');
    expect(spy).toHaveBeenCalledTimes(1);

    // Nothing left to unsnooze — listing again must not schedule disk I/O
    flushPendingSave(database);
    spy.mockClear();
    const openAgain = database.listNextBestActions('open');
    expect(openAgain.map((a) => a.id)).toContain('a1');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
