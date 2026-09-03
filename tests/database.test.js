// Regression coverage for finding M8: this file used to run its assertions
// against a hand-rolled TestDB wrapper over a manually re-typed copy of the
// migration 001 schema, with raw SQL calls standing in for the real
// WealthFlowDatabase methods. That never actually exercised database.js —
// e.g. its "computeFinancials calculates correctly" test asserted on a
// simplified SUM query with no date windowing, while the real
// computeFinancials() windows income/expenses to the current calendar month
// (see database-financials.test.js) — so a real bug in the actual method
// could pass this file while being broken in the app.
//
// Settings and computeFinancials behavior already have dedicated real-DB
// coverage (database-settings.test.js, database-financials.test.js), so
// this file now focuses on Transaction/Investment/Budget/Debt CRUD via the
// real WealthFlowDatabase — the areas that had no real-DB coverage at all.
const fs = require('fs');
const os = require('os');
const path = require('path');

// Each test gets its own fresh temp directory (set in beforeEach below) —
// the real save()/init() persist to an actual file on disk, so reusing one
// directory across tests would let a later test's `id: 't1'` row collide
// with a row a previous test already committed under the same id.
let currentTempDir;
process.resourcesPath = os.tmpdir();

jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => currentTempDir),
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

describe('WealthFlowDatabase Transaction CRUD', () => {
  let db;

  beforeEach(async () => {
    currentTempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wealthflow-dbtest-'));
    db = new WealthFlowDatabase();
    await db.init();
  });

  afterEach(() => {
    flushPendingSave(db);
    db.close();
  });

  test('add and list transactions', () => {
    db.addTransaction({ id: 't1', description: 'Salary', amount: 5000, category: 'Income', date: '2026-01-15' });
    db.addTransaction({ id: 't2', description: 'Groceries', amount: -150, category: 'Food', date: '2026-01-16' });

    const txs = db.listTransactions();
    expect(txs.length).toBe(2);
    // listTransactions() orders by date DESC, so the later date comes first.
    expect(txs[0].description).toBe('Groceries');
    expect(txs[1].amount).toBe(5000);
  });

  test('delete transaction is a soft delete — it disappears from listTransactions()', () => {
    db.addTransaction({ id: 't1', description: 'Test', amount: 100, category: 'Other', date: '2026-01-01' });
    db.deleteTransaction('t1');

    expect(db.listTransactions()).toHaveLength(0);
    // The row itself still exists with deleted_at set, not hard-deleted.
    const raw = db.getOne('SELECT * FROM transactions WHERE id = ?', ['t1']);
    expect(raw).not.toBeNull();
    expect(raw.deleted_at).not.toBeNull();
  });

  test('update transaction', () => {
    db.addTransaction({ id: 't1', description: 'Old', amount: 100, category: 'Other', date: '2026-01-01' });
    db.updateTransaction({ id: 't1', description: 'New', amount: 200, category: 'Other', date: '2026-01-01' });

    const tx = db.listTransactions().find((t) => t.id === 't1');
    expect(tx.description).toBe('New');
    expect(tx.amount).toBe(200);
  });
});

describe('WealthFlowDatabase Investment CRUD', () => {
  let db;

  beforeEach(async () => {
    currentTempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wealthflow-dbtest-'));
    db = new WealthFlowDatabase();
    await db.init();
  });

  afterEach(() => {
    flushPendingSave(db);
    db.close();
  });

  test('add and query investments', () => {
    db.addInvestment({
      id: 'i1', symbol: 'XEQT', name: 'iShares All-Equity', shares: 100,
      avg_cost: 25, current_price: 30, type: 'etf', account_type: 'tfsa',
    });

    const investments = db.listInvestments();
    expect(investments).toHaveLength(1);
    expect(investments[0].symbol).toBe('XEQT');
    const totalValue = investments.reduce((s, i) => s + i.shares * i.current_price, 0);
    expect(totalValue).toBe(3000);
  });
});

describe('WealthFlowDatabase Budget CRUD', () => {
  let db;

  beforeEach(async () => {
    currentTempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wealthflow-dbtest-'));
    db = new WealthFlowDatabase();
    await db.init();
  });

  afterEach(() => {
    flushPendingSave(db);
    db.close();
  });

  test('add and list budgets', () => {
    db.addBudget({ id: 'b1', category: 'Food', amount: 500, color: '#10b981' });

    const budgets = db.listBudgets();
    expect(budgets).toHaveLength(1);
    expect(budgets[0].category).toBe('Food');
    expect(budgets[0].amount).toBe(500);
  });
});

describe('WealthFlowDatabase Debt CRUD', () => {
  let db;

  beforeEach(async () => {
    currentTempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wealthflow-dbtest-'));
    db = new WealthFlowDatabase();
    await db.init();
  });

  afterEach(() => {
    flushPendingSave(db);
    db.close();
  });

  test('add debts and compute total', () => {
    db.addDebt({ id: 'd1', name: 'Visa', balance: 5000, rate: 19.99, min_payment: 150, type: 'credit' });
    db.addDebt({ id: 'd2', name: 'Car Loan', balance: 15000, rate: 4.5, min_payment: 400, type: 'loan' });

    const debts = db.listDebts();
    expect(debts).toHaveLength(2);
    const totalDebt = debts.reduce((s, d) => s + d.balance, 0);
    expect(totalDebt).toBe(20000);
  });
});
