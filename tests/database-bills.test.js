// Regression coverage for the one-off-bill-becomes-permanently-overdue bug:
// addBill() defaulted next_due_date to the bill's own `date` whenever the
// caller passed next_due_date: null (which the renderer does deliberately
// for a non-recurring bill), so a one-off bill got a due date that was
// already in the past by the time it was saved. next-best-actions-engine's
// _ruleBillsDueSoon then treated it as overdue forever, with no way to
// clear it short of deleting the bill outright.
const fs = require('fs');
const os = require('os');
const path = require('path');

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wealthflow-bills-'));
process.resourcesPath = tempRoot;

jest.mock('electron', () => ({
  app: { getPath: jest.fn(() => tempRoot) },
  safeStorage: { isEncryptionAvailable: jest.fn(() => false) },
}));

const { WealthFlowDatabase } = require('../src/main/database.js');
const { NextBestActionsEngine } = require('../src/main/next-best-actions-engine.js');

function flushPendingSave(database) {
  if (database._saveTimer) {
    clearTimeout(database._saveTimer);
    database._saveTimer = null;
  }
}

describe('WealthFlowDatabase.addBill next_due_date handling', () => {
  let database;

  beforeEach(async () => {
    const dbPath = path.join(tempRoot, 'wealthflow.db');
    for (const p of [dbPath, dbPath + '.bak', dbPath + '.tmp']) {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
    database = new WealthFlowDatabase();
    await database.init();
    flushPendingSave(database);
  });

  afterEach(() => {
    if (database) database.close();
  });

  test('a one-off bill (next_due_date: null) is stored with no due date, not the bill date', () => {
    database.addBill({
      id: 'b1', title: 'One-time purchase', amount: 50, date: '2020-01-01',
      next_due_date: null,
    });
    flushPendingSave(database);

    const bills = database.listBills();
    expect(bills[0].next_due_date).toBeNull();
  });

  test('a recurring bill keeps its explicit next_due_date', () => {
    database.addBill({
      id: 'b2', title: 'Rent', amount: 1500, date: '2020-01-01',
      frequency: 'monthly', next_due_date: '2026-09-05',
    });
    flushPendingSave(database);

    const bills = database.listBills();
    expect(bills[0].next_due_date).toBe('2026-09-05');
  });

  test('a one-off bill from long in the past never generates a next-best-action, since it never got a due date', async () => {
    database.addBill({
      id: 'b3', title: 'Old one-time charge', amount: 75, date: '2020-01-01',
      next_due_date: null,
    });
    flushPendingSave(database);

    const engine = new NextBestActionsEngine(database);
    await engine.generateActions();
    flushPendingSave(database);

    const open = database.listNextBestActions('open');
    expect(open.find((a) => a.action_key === 'bill_due_b3')).toBeUndefined();
  });

  test('marking a one-off bill paid clears its due date so it stops being treated as overdue', async () => {
    // Simulate a bill that was already corrupted by the old addBill bug
    // (next_due_date backfilled to a past date) to verify the self-healing
    // path in the mark-paid flow.
    database.run(
      "INSERT INTO bills (id, title, type, amount, date, next_due_date) VALUES (?, ?, ?, ?, ?, ?)",
      ['b4', 'Legacy corrupted bill', 'bill', 100, '2020-01-01', '2020-01-01']
    );
    flushPendingSave(database);

    let bill = database.listBills().find((b) => b.id === 'b4');
    expect(bill.next_due_date).toBe('2020-01-01');

    // Mirrors handlers/money.js's mark-paid: no frequency -> clear next_due_date.
    database.updateBill({ ...bill, last_paid_date: '2026-09-02', next_due_date: null });
    flushPendingSave(database);

    bill = database.listBills().find((b) => b.id === 'b4');
    expect(bill.next_due_date).toBeNull();

    const engine = new NextBestActionsEngine(database);
    await engine.generateActions();
    flushPendingSave(database);

    const open = database.listNextBestActions('open');
    expect(open.find((a) => a.action_key === 'bill_due_b4')).toBeUndefined();
  });
});
