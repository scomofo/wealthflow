// Migration 016: preserve the intended day of monthly/quarterly/annual bills.
module.exports = {
  version: 16,
  up(db) {
    const columns = db.exec("PRAGMA table_info(bills)")[0]?.values || [];
    if (!columns.some((column) => column[1] === 'recurrence_day')) {
      db.run('ALTER TABLE bills ADD COLUMN recurrence_day INTEGER');
    }
    // Backfill from the original bill date where possible. For older records
    // without a useful date, fall back to the next scheduled occurrence.
    db.run(`
      UPDATE bills
      SET recurrence_day = CAST(strftime('%d', date) AS INTEGER)
      WHERE frequency IS NOT NULL AND recurrence_day IS NULL
        AND date IS NOT NULL AND date != ''
    `);
    db.run(`
      UPDATE bills
      SET recurrence_day = CAST(strftime('%d', next_due_date) AS INTEGER)
      WHERE frequency IS NOT NULL AND recurrence_day IS NULL
        AND next_due_date IS NOT NULL AND next_due_date != ''
    `);
  },
};
