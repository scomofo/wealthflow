module.exports = {
  version: 7,
  up(db) {
    // Add missing indexes
    db.run('CREATE INDEX IF NOT EXISTS idx_debts_rate ON debts(rate)');
    db.run('CREATE INDEX IF NOT EXISTS idx_investments_symbol ON investments(symbol)');
    db.run('CREATE INDEX IF NOT EXISTS idx_bills_date ON bills(date)');
    db.run('CREATE INDEX IF NOT EXISTS idx_budgets_category ON budgets(category)');
    db.run('CREATE INDEX IF NOT EXISTS idx_challenges_created_at ON challenges(created_at)');
    db.run('CREATE INDEX IF NOT EXISTS idx_advisor_assets_created_at ON advisor_assets(created_at)');
    db.run('CREATE INDEX IF NOT EXISTS idx_advisor_documents_upload_date ON advisor_documents(upload_date)');

    // Add soft-delete columns
    const tables = ['transactions', 'budgets', 'goals', 'debts', 'investments', 'bills'];
    for (const table of tables) {
      try {
        db.run(`ALTER TABLE ${table} ADD COLUMN deleted_at TEXT DEFAULT NULL`);
      } catch (e) {
        // Column may already exist
      }
    }

    // Index for soft-delete filtering on transactions
    db.run('CREATE INDEX IF NOT EXISTS idx_transactions_deleted_at ON transactions(deleted_at)');
  },
};
