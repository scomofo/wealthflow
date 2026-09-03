// getBillsDueSoon() and processRecurringBills() both filter/sort bills by
// next_due_date, but no index covered that column.
module.exports = {
  version: 14,
  name: '014-bills-due-date-index',
  up(db) {
    db.run('CREATE INDEX IF NOT EXISTS idx_bills_next_due_date ON bills(next_due_date)');
  },
};
