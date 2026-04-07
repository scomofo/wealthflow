module.exports = {
  version: 9,
  name: '009-recommended-actions',
  up(db) {
    db.run(`CREATE TABLE IF NOT EXISTS recommended_actions (
      id TEXT PRIMARY KEY,
      workflow_type TEXT NOT NULL,
      title TEXT NOT NULL,
      action_type TEXT,
      priority TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      impact_text TEXT,
      source_payload TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT,
      deleted_at TEXT
    )`);
    db.run('CREATE INDEX IF NOT EXISTS idx_actions_status ON recommended_actions(status)');
    db.run('CREATE INDEX IF NOT EXISTS idx_actions_created ON recommended_actions(created_at)');
  },
};
