module.exports = {
  version: 8,
  up(db) {
    // Budget rollover support
    db.run(`ALTER TABLE budgets ADD COLUMN rollover INTEGER DEFAULT 0`);
    db.run(`ALTER TABLE budgets ADD COLUMN carried_amount REAL DEFAULT 0`);

    // Multi-currency support for investments
    db.run(`ALTER TABLE investments ADD COLUMN currency TEXT DEFAULT 'CAD'`);

    // Principal residence tracking
    db.run(`CREATE TABLE IF NOT EXISTS principal_residence (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      purchase_price REAL DEFAULT 0,
      current_value REAL DEFAULT 0,
      purchase_date TEXT,
      address TEXT DEFAULT '',
      mortgage_balance REAL DEFAULT 0,
      mortgage_rate REAL DEFAULT 0,
      mortgage_payment REAL DEFAULT 0,
      mortgage_amortization_months INTEGER DEFAULT 300,
      property_tax_annual REAL DEFAULT 0,
      pre_eligible INTEGER DEFAULT 1,
      heloc_balance REAL DEFAULT 0,
      heloc_limit REAL DEFAULT 0,
      heloc_rate REAL DEFAULT 0,
      notes TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    )`);
    db.run(`INSERT OR IGNORE INTO principal_residence (id) VALUES (1)`);

    // Dashboard widget preferences
    db.run(`ALTER TABLE settings ADD COLUMN dashboard_widgets TEXT DEFAULT '["summary","budgets","goals","transactions","insights"]'`);

    // Theme auto mode
    db.run(`ALTER TABLE settings ADD COLUMN theme_mode TEXT DEFAULT 'dark'`);

    // Notification preferences
    db.run(`ALTER TABLE settings ADD COLUMN bill_notifications INTEGER DEFAULT 1`);
    db.run(`ALTER TABLE settings ADD COLUMN bill_notify_days INTEGER DEFAULT 3`);

    // Monthly report tracking
    db.run(`CREATE TABLE IF NOT EXISTS monthly_reports (
      id TEXT PRIMARY KEY,
      month TEXT NOT NULL,
      year INTEGER NOT NULL,
      report_text TEXT,
      generated_at TEXT DEFAULT (datetime('now')),
      spending_vs_last REAL,
      budget_adherence REAL,
      net_worth_change REAL
    )`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_monthly_reports_date ON monthly_reports(year, month)`);

    // Undo history
    db.run(`CREATE TABLE IF NOT EXISTS undo_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action_type TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      old_data TEXT,
      new_data TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_undo_log_created ON undo_log(created_at)`);
  },
};
