module.exports = {
  version: 10,
  name: '010-next-best-actions',
  up(db) {
    db.run(`CREATE TABLE IF NOT EXISTS next_best_actions (
      id TEXT PRIMARY KEY,
      action_key TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      rationale TEXT,
      category TEXT,
      priority TEXT NOT NULL DEFAULT 'medium',
      score REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'open',
      source_type TEXT NOT NULL DEFAULT 'rule',
      source_payload TEXT,
      related_entity_type TEXT,
      related_entity_id TEXT,
      impact_text TEXT,
      snoozed_until TEXT,
      generated_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT,
      dismissed_at TEXT,
      deleted_at TEXT
    )`);
    db.run('CREATE INDEX IF NOT EXISTS idx_nba_action_key ON next_best_actions(action_key)');
    db.run('CREATE INDEX IF NOT EXISTS idx_nba_status ON next_best_actions(status)');
    db.run('CREATE INDEX IF NOT EXISTS idx_nba_score ON next_best_actions(score)');
  },
};
