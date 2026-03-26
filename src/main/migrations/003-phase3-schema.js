module.exports = {
  version: 3,
  up(db) {
    // Extend bills table for recurring functionality
    db.run('ALTER TABLE bills ADD COLUMN frequency TEXT DEFAULT NULL');
    db.run('ALTER TABLE bills ADD COLUMN category TEXT DEFAULT \'Other\'');
    db.run('ALTER TABLE bills ADD COLUMN last_paid_date TEXT DEFAULT NULL');
    db.run('ALTER TABLE bills ADD COLUMN next_due_date TEXT DEFAULT NULL');
    db.run('ALTER TABLE bills ADD COLUMN auto_generate INTEGER DEFAULT 0');

    db.exec(`
      CREATE TABLE IF NOT EXISTS recurring_log (
        id TEXT PRIMARY KEY,
        bill_id TEXT NOT NULL,
        paid_date TEXT NOT NULL,
        amount REAL NOT NULL,
        period_start TEXT,
        period_end TEXT,
        transaction_id TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_recurring_log_bill ON recurring_log(bill_id);
      CREATE INDEX IF NOT EXISTS idx_recurring_log_period ON recurring_log(period_start);

      CREATE TABLE IF NOT EXISTS net_worth_history (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL UNIQUE,
        total_investments REAL DEFAULT 0,
        total_savings REAL DEFAULT 0,
        total_debt REAL DEFAULT 0,
        net_worth REAL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_net_worth_date ON net_worth_history(date);
    `);
  }
};
