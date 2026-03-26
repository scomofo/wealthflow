module.exports = {
  version: 5,
  up(db) {
    db.run(`ALTER TABLE settings ADD COLUMN ai_api_key TEXT DEFAULT ''`);
    db.run(`ALTER TABLE settings ADD COLUMN ai_model TEXT DEFAULT 'claude-sonnet-4-5-20250929'`);
  }
};
