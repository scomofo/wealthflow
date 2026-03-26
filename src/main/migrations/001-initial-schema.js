// Migration 001: Initial database schema
module.exports = {
  version: 1,
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY,
        applied_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        user_name TEXT NOT NULL DEFAULT '',
        dark_mode INTEGER NOT NULL DEFAULT 1,
        onboarded INTEGER NOT NULL DEFAULT 0,
        level INTEGER NOT NULL DEFAULT 1,
        xp INTEGER NOT NULL DEFAULT 0,
        province TEXT DEFAULT 'ON',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      INSERT OR IGNORE INTO settings (id) VALUES (1);

      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        description TEXT NOT NULL,
        amount REAL NOT NULL,
        category TEXT NOT NULL,
        date TEXT NOT NULL,
        icon TEXT DEFAULT 'receipt',
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
      CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);

      CREATE TABLE IF NOT EXISTS budgets (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL UNIQUE,
        amount REAL NOT NULL,
        color TEXT DEFAULT '#6366f1',
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS goals (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        target REAL NOT NULL,
        current REAL NOT NULL DEFAULT 0,
        color TEXT DEFAULT '#10b981',
        deadline TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS debts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        balance REAL NOT NULL,
        rate REAL NOT NULL DEFAULT 0,
        min_payment REAL NOT NULL DEFAULT 0,
        type TEXT NOT NULL DEFAULT 'loan',
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS investments (
        id TEXT PRIMARY KEY,
        symbol TEXT NOT NULL,
        name TEXT,
        shares REAL NOT NULL DEFAULT 0,
        avg_cost REAL NOT NULL DEFAULT 0,
        current_price REAL NOT NULL DEFAULT 0,
        type TEXT DEFAULT 'stock',
        account_type TEXT DEFAULT 'non-registered',
        institution TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS bills (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'bill',
        amount REAL NOT NULL DEFAULT 0,
        date TEXT NOT NULL,
        recurring TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS challenges (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        xp INTEGER NOT NULL DEFAULT 0,
        target INTEGER NOT NULL,
        progress INTEGER NOT NULL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS community_posts (
        id TEXT PRIMARY KEY,
        author TEXT NOT NULL,
        avatar TEXT,
        title TEXT NOT NULL,
        body TEXT,
        likes INTEGER DEFAULT 0,
        comments INTEGER DEFAULT 0,
        time_label TEXT,
        tags TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS education (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        type TEXT NOT NULL,
        duration TEXT,
        level TEXT,
        rating REAL DEFAULT 0,
        completed INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);
  }
};
