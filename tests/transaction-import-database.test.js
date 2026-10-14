const fs = require('fs');
const os = require('os');
const path = require('path');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wealthflow-import-'));
process.resourcesPath = tempRoot;
jest.mock('electron', () => ({
  app: { getPath: () => tempRoot },
  safeStorage: { isEncryptionAvailable: () => false },
}));

const mockState = {};
jest.mock('../src/renderer/js/state/core.js', () => mockState);
global.window = { wealthflow: {} };
const { WealthFlowDatabase } = require('../src/main/database.js');
const { createValidatedDatabase } = require('../src/main/validated-database.js');
const { initMoney, addTransactionsBatch } = require('../src/renderer/js/state/money.js');
const { applyImport, checkDuplicates, reconcileAfterImport } = require('../src/renderer/js/utils/export-import.js');
const mapping = { date: 'date', description: 'description', amount: 'amount' };

let database, state;
beforeEach(async () => {
  for (const name of ['wealthflow.db', 'wealthflow.db.bak', 'wealthflow.db.tmp']) {
    fs.rmSync(path.join(tempRoot, name), { force: true });
  }
  database = new WealthFlowDatabase();
  await database.init();
  const validated = createValidatedDatabase(database);
  state = { transactions: [], counts: { transactions: 0 } };
  initMoney(state, { addTransactionsBatch: rows => validated.addTransactionsBatch(rows) });
  Object.assign(mockState, {
    addTransactionsBatch, findDuplicateTransactions: rows => database.findDuplicateTransactions(rows),
    snapshotNetWorth: () => database.snapshotNetWorth(),
  });
});
afterEach(() => { jest.restoreAllMocks(); database.close(); });
afterAll(() => fs.rmSync(tempRoot, { recursive: true, force: true }));

function row(description, amount = '-20') { return { date: '2026-10-14', description, amount }; }

test('imports through the validated SQLite boundary and excludes internal transfers from income', async () => {
  database.addDebt({ id: 'd1', name: 'TD Visa', balance: 1000, rate: 20, min_payment: 25, type: 'credit' });
  database.addGoal({ id: 'g1', name: 'Vacation', target: 1000, current: 100 });
  const debtsBefore = database.listDebts(), goalsBefore = database.listGoals();
  const rows = [row('Salary', '2000'), row('Transfer from savings', '500'), row('Transfer to savings', '-400'), row('CPP benefit', '200'), row('Dividend', '50'), row('Groceries', '-100')];
  const duplicates = await checkDuplicates(rows, mapping);
  const result = await applyImport(rows, mapping, duplicates);
  await reconcileAfterImport(result.transactions, { name: 'TD Canada Trust' });
  expect(database.computeFinancials('2026-10')).toMatchObject({ income: 2250, expenses: 100 });
  expect(database.getMonthlyTotals(1200).find(month => month.month === '2026-10')).toMatchObject({ income: 2250, expenses: 100 });
  expect(Object.values(database.computeFinancials('2026-10').catSpending).reduce((sum, amount) => sum + amount, 0)).toBe(100);
  expect(database.listDebts()).toEqual(debtsBefore);
  expect(database.listGoals()).toEqual(goalsBefore);
  expect(database.listContributions()).toEqual([]);
  expect(state.counts.transactions).toBe(6);
  expect(state.transactions).toHaveLength(6);

  const repeated = await applyImport(rows, mapping, await checkDuplicates(rows, mapping));
  expect(repeated).toMatchObject({ imported: 0, duplicateCount: 6 });
  expect(database.listTransactions()).toHaveLength(6);
  expect(state.counts.transactions).toBe(6);
});

test('two equal purchases remain two purchases, while a repeated statement is skipped', async () => {
  database.addTransaction({ id: 'existing', ...row('Coffee'), amount: -20, category: 'Other' });
  const rows = [row('Coffee'), row('Coffee')];
  expect(await checkDuplicates(rows, mapping)).toEqual([true, false]);
  const result = await applyImport(rows, mapping, await checkDuplicates(rows, mapping));
  expect(result).toMatchObject({ imported: 1, duplicateCount: 1 });
  expect(database.listTransactions()).toHaveLength(2);
  expect(await checkDuplicates(rows, mapping)).toEqual([true, true]);
});

test('deleted entries do not suppress a valid replacement import', async () => {
  database.addTransaction({ id: 'deleted', ...row('Coffee'), amount: -20, category: 'Other' });
  database.deleteTransaction('deleted');
  expect(await checkDuplicates([row('Coffee')], mapping)).toEqual([false]);
  const result = await applyImport([row('Coffee')], mapping, [false]);
  expect(result.imported).toBe(1);
  expect(database.listTransactions()).toHaveLength(1);
});

test('a batch insertion failure rolls back all transactions and leaves the renderer cache untouched', async () => {
  // Force a primary-key collision in the second record of the actual batch.
  jest.spyOn(Date, 'now').mockReturnValue(1);
  jest.spyOn(Math, 'random').mockReturnValue(0.5);
  await expect(applyImport([row('First'), row('Second')], mapping, [false, false])).rejects.toThrow(/UNIQUE/);
  expect(database.listTransactions()).toEqual([]);
  expect(state.transactions).toEqual([]);
  expect(state.counts.transactions).toBe(0);
});

test('successful imports persist across a real database close and reopen', async () => {
  await applyImport([row('Salary', '2000'), row('Transfer from savings', '500')], mapping, [false, false]);
  database.close();
  database = new WealthFlowDatabase();
  await database.init();
  expect(database.listTransactions()).toHaveLength(2);
  expect(database.computeFinancials('2026-10').income).toBe(2000);
  expect(database.findDuplicateTransactions([
    { date: '2026-10-14', description: 'Salary', amount: 2000 },
  ])).toEqual([true]);
});
