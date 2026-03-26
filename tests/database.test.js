// Database tests using in-memory sql.js
const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

let SQL;
let db;

// Minimal database wrapper matching WealthFlowDatabase interface
class TestDB {
  constructor(sqlDb) {
    this.db = sqlDb;
  }

  run(sql, params = []) {
    this.db.run(sql, params);
  }

  getOne(sql, params = []) {
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    let result = null;
    if (stmt.step()) {
      const cols = stmt.getColumnNames();
      const vals = stmt.get();
      result = {};
      cols.forEach((c, i) => { result[c] = vals[i]; });
    }
    stmt.free();
    return result;
  }

  getAll(sql, params = []) {
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    const results = [];
    const cols = stmt.getColumnNames();
    while (stmt.step()) {
      const vals = stmt.get();
      const row = {};
      cols.forEach((c, i) => { row[c] = vals[i]; });
      results.push(row);
    }
    stmt.free();
    return results;
  }

  getScalar(sql, params = []) {
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    let result = null;
    if (stmt.step()) result = stmt.get()[0];
    stmt.free();
    return result;
  }
}

beforeAll(async () => {
  SQL = await initSqlJs();
});

beforeEach(() => {
  db = new TestDB(new SQL.Database());
  // Run migration 001 schema
  db.run(`CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    user_name TEXT DEFAULT '',
    dark_mode INTEGER DEFAULT 1,
    onboarded INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    province TEXT DEFAULT 'ON',
    profile_completed INTEGER DEFAULT 0,
    last_wizard_step INTEGER DEFAULT 0,
    ai_api_key TEXT DEFAULT '',
    ai_model TEXT DEFAULT 'claude-sonnet-4-5-20250929',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);
  db.run(`INSERT OR IGNORE INTO settings (id) VALUES (1)`);

  db.run(`CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    category TEXT DEFAULT 'Other',
    date TEXT NOT NULL,
    icon TEXT DEFAULT 'receipt',
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    amount REAL NOT NULL,
    color TEXT DEFAULT '#6366f1',
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    target REAL NOT NULL,
    current REAL DEFAULT 0,
    color TEXT DEFAULT '#10b981',
    deadline TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS debts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    balance REAL NOT NULL,
    rate REAL DEFAULT 0,
    min_payment REAL DEFAULT 0,
    type TEXT DEFAULT 'loan',
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS investments (
    id TEXT PRIMARY KEY,
    symbol TEXT NOT NULL,
    name TEXT DEFAULT '',
    shares REAL DEFAULT 0,
    avg_cost REAL DEFAULT 0,
    current_price REAL DEFAULT 0,
    type TEXT DEFAULT 'stock',
    account_type TEXT DEFAULT 'non-registered',
    institution TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`);
});

afterEach(() => {
  if (db && db.db) db.db.close();
});

describe('Settings CRUD', () => {
  test('default settings exist', () => {
    const settings = db.getOne('SELECT * FROM settings WHERE id = 1');
    expect(settings).not.toBeNull();
    expect(settings.dark_mode).toBe(1);
    expect(settings.onboarded).toBe(0);
    expect(settings.province).toBe('ON');
  });

  test('update settings', () => {
    db.run('UPDATE settings SET user_name = ?, province = ? WHERE id = 1', ['Scott', 'AB']);
    const settings = db.getOne('SELECT * FROM settings WHERE id = 1');
    expect(settings.user_name).toBe('Scott');
    expect(settings.province).toBe('AB');
  });
});

describe('Transaction CRUD', () => {
  test('add and list transactions', () => {
    db.run('INSERT INTO transactions (id, description, amount, category, date) VALUES (?, ?, ?, ?, ?)',
      ['t1', 'Salary', 5000, 'Income', '2026-01-15']);
    db.run('INSERT INTO transactions (id, description, amount, category, date) VALUES (?, ?, ?, ?, ?)',
      ['t2', 'Groceries', -150, 'Food', '2026-01-16']);

    const txs = db.getAll('SELECT * FROM transactions ORDER BY date');
    expect(txs.length).toBe(2);
    expect(txs[0].description).toBe('Salary');
    expect(txs[1].amount).toBe(-150);
  });

  test('delete transaction', () => {
    db.run('INSERT INTO transactions (id, description, amount, category, date) VALUES (?, ?, ?, ?, ?)',
      ['t1', 'Test', 100, 'Other', '2026-01-01']);
    db.run('DELETE FROM transactions WHERE id = ?', ['t1']);
    const count = db.getScalar('SELECT COUNT(*) FROM transactions');
    expect(count).toBe(0);
  });

  test('update transaction', () => {
    db.run('INSERT INTO transactions (id, description, amount, category, date) VALUES (?, ?, ?, ?, ?)',
      ['t1', 'Old', 100, 'Other', '2026-01-01']);
    db.run('UPDATE transactions SET description = ?, amount = ? WHERE id = ?', ['New', 200, 't1']);
    const tx = db.getOne('SELECT * FROM transactions WHERE id = ?', ['t1']);
    expect(tx.description).toBe('New');
    expect(tx.amount).toBe(200);
  });
});

describe('Computed Financials', () => {
  test('computeFinancials calculates correctly', () => {
    db.run('INSERT INTO transactions (id, description, amount, category, date) VALUES (?, ?, ?, ?, ?)',
      ['t1', 'Salary', 10000, 'Income', '2026-01-15']);
    db.run('INSERT INTO transactions (id, description, amount, category, date) VALUES (?, ?, ?, ?, ?)',
      ['t2', 'Rent', -2000, 'Housing', '2026-01-01']);
    db.run('INSERT INTO transactions (id, description, amount, category, date) VALUES (?, ?, ?, ?, ?)',
      ['t3', 'Food', -500, 'Food', '2026-01-10']);

    const income = db.getScalar('SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE amount > 0') || 0;
    const expenses = db.getScalar('SELECT COALESCE(SUM(ABS(amount)), 0) FROM transactions WHERE amount < 0') || 0;
    const savingsRate = income > 0 ? ((income - expenses) / income * 100) : 0;

    expect(income).toBe(10000);
    expect(expenses).toBe(2500);
    expect(savingsRate).toBe(75);
  });

  test('empty database returns zeros', () => {
    const income = db.getScalar('SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE amount > 0') || 0;
    const expenses = db.getScalar('SELECT COALESCE(SUM(ABS(amount)), 0) FROM transactions WHERE amount < 0') || 0;
    expect(income).toBe(0);
    expect(expenses).toBe(0);
  });
});

describe('Investment CRUD', () => {
  test('add and query investments', () => {
    db.run(
      'INSERT INTO investments (id, symbol, name, shares, avg_cost, current_price, type, account_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ['i1', 'XEQT', 'iShares All-Equity', 100, 25, 30, 'etf', 'tfsa']
    );
    const totalValue = db.getScalar('SELECT COALESCE(SUM(shares * current_price), 0) FROM investments');
    expect(totalValue).toBe(3000);
  });
});

describe('Budget CRUD', () => {
  test('add and list budgets', () => {
    db.run('INSERT INTO budgets (id, category, amount, color) VALUES (?, ?, ?, ?)',
      ['b1', 'Food', 500, '#10b981']);
    const budgets = db.getAll('SELECT * FROM budgets');
    expect(budgets.length).toBe(1);
    expect(budgets[0].category).toBe('Food');
    expect(budgets[0].amount).toBe(500);
  });
});

describe('Debt CRUD', () => {
  test('add debts and compute total', () => {
    db.run('INSERT INTO debts (id, name, balance, rate, min_payment, type) VALUES (?, ?, ?, ?, ?, ?)',
      ['d1', 'Visa', 5000, 19.99, 150, 'credit']);
    db.run('INSERT INTO debts (id, name, balance, rate, min_payment, type) VALUES (?, ?, ?, ?, ?, ?)',
      ['d2', 'Car Loan', 15000, 4.5, 400, 'loan']);
    const totalDebt = db.getScalar('SELECT COALESCE(SUM(balance), 0) FROM debts');
    expect(totalDebt).toBe(20000);
  });
});
