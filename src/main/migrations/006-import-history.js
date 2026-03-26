module.exports = {
  version: 6,
  up(db) {
    db.run(`CREATE TABLE IF NOT EXISTS import_history (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      file_type TEXT NOT NULL,
      total_rows INTEGER DEFAULT 0,
      imported_count INTEGER DEFAULT 0,
      skipped_count INTEGER DEFAULT 0,
      duplicate_count INTEGER DEFAULT 0,
      error_count INTEGER DEFAULT 0,
      import_date TEXT DEFAULT (datetime('now')),
      notes TEXT
    )`);
  }
};
