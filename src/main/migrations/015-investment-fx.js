module.exports = {
  version: 15,
  name: '015-investment-fx',
  up(db) {
    try {
      db.run('ALTER TABLE investments ADD COLUMN exchange_rate_to_cad REAL DEFAULT 1');
    } catch { /* column may exist */ }
  },
};
