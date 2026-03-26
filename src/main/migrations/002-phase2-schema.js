module.exports = {
  version: 2,
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS contribution_room (
        id TEXT PRIMARY KEY,
        account_type TEXT NOT NULL,
        known_room REAL NOT NULL DEFAULT 0,
        known_as_of_date TEXT NOT NULL,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_contribution_room_type ON contribution_room(account_type);

      CREATE TABLE IF NOT EXISTS contributions (
        id TEXT PRIMARY KEY,
        account_type TEXT NOT NULL,
        amount REAL NOT NULL,
        date TEXT NOT NULL,
        description TEXT,
        institution TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_contributions_type ON contributions(account_type);
      CREATE INDEX IF NOT EXISTS idx_contributions_date ON contributions(date);

      CREATE TABLE IF NOT EXISTS resp_beneficiaries (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        birth_year INTEGER NOT NULL,
        total_contributions REAL NOT NULL DEFAULT 0,
        total_cesg_received REAL NOT NULL DEFAULT 0,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS gics (
        id TEXT PRIMARY KEY,
        institution TEXT NOT NULL,
        principal REAL NOT NULL,
        rate REAL NOT NULL,
        term_months INTEGER NOT NULL,
        purchase_date TEXT NOT NULL,
        maturity_date TEXT NOT NULL,
        account_type TEXT DEFAULT 'non-registered',
        is_cashable INTEGER DEFAULT 0,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_gics_maturity ON gics(maturity_date);
    `);
  }
};
