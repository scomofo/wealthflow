module.exports = {
  version: 12,
  name: '012-onboarding-settings',
  up(db) {
    try { db.run('ALTER TABLE settings ADD COLUMN monthly_income REAL DEFAULT 0'); } catch { /* column may exist */ }
    try { db.run('ALTER TABLE settings ADD COLUMN monthly_expenses REAL DEFAULT 0'); } catch { /* column may exist */ }
    try { db.run('ALTER TABLE settings ADD COLUMN total_debt REAL DEFAULT 0'); } catch { /* column may exist */ }
    try { db.run('ALTER TABLE settings ADD COLUMN savings_buffer REAL DEFAULT 0'); } catch { /* column may exist */ }
    try { db.run('ALTER TABLE settings ADD COLUMN first_action_completed INTEGER DEFAULT 0'); } catch { /* column may exist */ }
  },
};
