module.exports = {
  version: 13,
  name: '013-guided-onboarding-profile',
  up(db) {
    try { db.run('ALTER TABLE settings ADD COLUMN onboarding_focus TEXT DEFAULT NULL'); } catch { /* column may exist */ }
    try { db.run("ALTER TABLE settings ADD COLUMN onboarding_confidence TEXT DEFAULT 'starter'"); } catch { /* column may exist */ }
    try { db.run('ALTER TABLE settings ADD COLUMN onboarding_completed_at TEXT DEFAULT NULL'); } catch { /* column may exist */ }
  },
};
