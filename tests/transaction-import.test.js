const mockState = {
  addTransactionsBatch: jest.fn(), findDuplicateTransactions: jest.fn(),
  getState: jest.fn(), updateDebt: jest.fn(), updateGoal: jest.fn(),
  addContribution: jest.fn(), snapshotNetWorth: jest.fn(), aiCategorize: jest.fn(),
};
jest.mock('../src/renderer/js/state/core.js', () => mockState);
global.window = { wealthflow: {} };
const { applyImport, reconcileAfterImport, checkDuplicates, importFile, aiCategorizeImport } = require('../src/renderer/js/utils/export-import.js');
const { computeStats } = require('../src/renderer/js/components/import-modal.js');
const { normalizeImportDate, parseImportAmount, normalizeImportRow } = require('../src/renderer/js/utils/transaction-import.js');
const { autoMapColumns } = require('../src/renderer/js/utils/csv-parser.js');
const { resolveBankMapping } = require('../src/renderer/js/utils/bank-presets.js');
const { initMoney, addTransactionsBatch } = require('../src/renderer/js/state/money.js');
const { renderImportModal } = require('../src/renderer/js/components/import-modal.js');

const mapping = { date: 'date', description: 'description', amount: 'amount' };

beforeEach(() => {
  jest.resetAllMocks();
  mockState.getState.mockReturnValue({
    debts: [{ id: 'visa', name: 'TD Visa', type: 'credit', balance: 1000 }],
    goals: [{ id: 'goal', name: 'Vacation', current: 100, target: 1000 }],
    settings: { hasApiKey: false },
  });
  mockState.findDuplicateTransactions.mockImplementation(async checks => checks.map(() => false));
});

test('rejects impossible dates and partially numeric amounts before inserting', async () => {
  const rows = [
    { date: '2026-02-30', description: 'Groceries', amount: '-50' },
    { date: '2026-10-14', description: 'Groceries', amount: '-50oops' },
  ];
  const result = await applyImport(rows, mapping);
  expect(result.imported).toBe(0);
  expect(result.errorCount).toBe(2);
  expect(mockState.addTransactionsBatch).not.toHaveBeenCalled();
});

test('the preview excludes the same invalid rows that the import rejects', () => {
  const stats = computeStats([
    { date: '2026-13-14', description: 'Groceries', amount: '-50' },
  ], mapping);
  expect(stats.importable).toBe(0);
  expect(stats.errorCount).toBe(1);
});

test('incoming internal transfers keep their category instead of becoming income', async () => {
  const result = await applyImport([
    { date: '2026-10-14', description: 'Transfer from savings', amount: '500' },
  ], mapping);
  expect(result.transactions[0].category).toBe('Transfer');
});

test('statement activity never guesses debt balances, savings progress or registered contributions', async () => {
  const transactions = [
    ...Array.from({ length: 6 }, () => ({ description: 'Groceries', amount: -50, date: '2026-10-14' })),
    { description: 'Vacation refund', amount: 100, date: '2026-10-14' },
    { description: 'TFSA withdrawal', amount: 250, date: '2026-10-14' },
  ];
  await reconcileAfterImport(transactions, { name: 'TD Canada Trust' });
  expect(mockState.updateDebt).not.toHaveBeenCalled();
  expect(mockState.updateGoal).not.toHaveBeenCalled();
  expect(mockState.addContribution).not.toHaveBeenCalled();
  expect(mockState.snapshotNetWorth).toHaveBeenCalledTimes(1);
});

test.each([
  ['2028-02-29', '2028-02-29'], ['2026/10/14', '2026-10-14'],
  ['20261014', '2026-10-14'], ['10/14/2026', '2026-10-14'],
  ['14-Oct-2026', '2026-10-14'], ['October 14, 2026', '2026-10-14'],
  ['2026-10-14T23:30:00-06:00', '2026-10-14'],
])('normalizes %s without moving the statement day', (raw, expected) => {
  expect(normalizeImportDate(raw)).toBe(expected);
});

test.each(['2026-02-29', '2026-02-30', '2026-04-31', '2026-13-01', '2026-00-01',
  '2026-10-00', '14/10/2026', '2026-10-14garbage', 'Octoberish 14, 2026',
  '2026-10-14T25:00:00Z', '', null])('rejects unsupported or impossible date %s', raw => {
  expect(normalizeImportDate(raw)).toBeNull();
});

test('numeric date order is explicit and year-first dates remain stable', () => {
  expect(normalizeImportDate('03/04/2026')).toBe('2026-03-04');
  expect(normalizeImportDate('03/04/2026', 'DD/MM/YYYY')).toBe('2026-04-03');
  expect(normalizeImportDate('14/10/2026', 'DD/MM/YYYY')).toBe('2026-10-14');
  expect(normalizeImportDate('2026-10-14', 'DD/MM/YYYY')).toBe('2026-10-14');
});

test.each([
  ['$1,234.56', 1234.56], ['(1,234.56)', -1234.56], ['-$50.25', -50.25],
  ['$-50.25', -50.25], ['CAD 50.25', 50.25], ['+12.00', 12], ['.50', 0.5], [42.25, 42.25],
])('parses the complete money value %s', (raw, expected) => {
  expect(parseImportAmount(raw)).toBe(expected);
});

test.each(['20oops', 'Infinity', 'NaN', '1e3', '0x20', '12,34.00', '$', '--5',
  '(-5.00)', '(5)extra', '1.239', '', null, Infinity, NaN])('rejects malformed money %s', raw => {
  expect(parseImportAmount(raw)).toBeNull();
});

test('debit/credit normalization supports a credit-only mapping and rejects conflicting values', () => {
  expect(normalizeImportRow({ date: '2026-10-14', description: 'Deposit', credit: '40' },
    { ...mapping, amount: null, credit: 'credit' }).amount).toBe(40);
  const split = { ...mapping, amount: null, credit: 'credit', debit: 'debit' };
  expect(normalizeImportRow({ date: '2026-10-14', description: 'Purchase', debit: '40', credit: '' }, split).amount).toBe(-40);
  expect(normalizeImportRow({ date: '2026-10-14', description: 'Purchase', debit: '40', credit: '10' }, split).error).toMatch(/Both debit and credit/);
  expect(normalizeImportRow({ date: '2026-10-14', description: 'Purchase', debit: 'oops', credit: '10' }, split).error).toMatch(/Invalid debit/);
});

test('the same normalized row drives preview, duplicate lookup and insertion', async () => {
  const rows = [
    { date: '14/10/2026', description: 'Unknown merchant', amount: '(12.50)' },
    { date: '2026-02-30', description: 'Invalid day', amount: '40' },
    { date: '14/10/2026', description: 'Existing', amount: '-5' },
  ];
  const options = { dateFormat: 'DD/MM/YYYY' };
  mockState.findDuplicateTransactions.mockResolvedValue([false, true]);
  const duplicates = await checkDuplicates(rows, mapping, options);
  expect(duplicates).toEqual([false, false, true]);
  expect(mockState.findDuplicateTransactions).toHaveBeenCalledWith([
    { date: '2026-10-14', description: 'Unknown merchant', amount: -12.5 },
    { date: '2026-10-14', description: 'Existing', amount: -5 },
  ]);
  const stats = computeStats(rows, mapping, duplicates, options);
  const result = await applyImport(rows, mapping, duplicates, { 0: 'Shopping' }, options);
  expect(stats).toEqual({ importable: 1, errorCount: 1, duplicateCount: 1 });
  expect(result).toMatchObject({ imported: 1, errorCount: 1, duplicateCount: 1 });
  expect(result.transactions[0]).toMatchObject({ date: '2026-10-14', amount: -12.5, category: 'Shopping' });
});

test('retains additional TD description and does not map debit amounts as signed totals', () => {
  const headers = ['Account Number', 'Transaction Date', 'Description 1', 'Description 2', 'Debit Amount', 'Credit Amount'];
  const bankMapping = resolveBankMapping('TD', headers);
  const row = { 'Transaction Date': '10/14/2026', 'Description 1': 'Purchase', 'Description 2': 'Costco', 'Debit Amount': '80', 'Credit Amount': '' };
  expect(normalizeImportRow(row, bankMapping)).toMatchObject({ date: '2026-10-14', description: 'Purchase - Costco', amount: -80, category: 'Food/Groceries', error: null });
  expect(autoMapColumns(headers)).toMatchObject({ date: 'Transaction Date', description: 'Description 1', amount: null, debit: 'Debit Amount', credit: 'Credit Amount' });
});

test('explicit categories survive a CSV export round trip and override AI suggestions', async () => {
  Object.assign(window.wealthflow, {
    showOpenDialog: jest.fn().mockResolvedValue({ filePaths: ['/tmp/export.csv'], canceled: false }),
    readFile: jest.fn().mockResolvedValue('date,description,amount,category\n2026-10-14,Deposit,250,Transfer'),
  });
  const file = await importFile();
  const result = await applyImport(file.rows, file.mapping, null, { 0: 'Income' });
  expect(result.transactions[0].category).toBe('Transfer');
});

test('explicit categories, benefits, dividends and transfers stay consistent', () => {
  expect(normalizeImportRow({ date: '2026-10-14', description: 'CPP benefit', amount: '500' }, mapping).category).toBe('Government Benefits');
  expect(normalizeImportRow({ date: '2026-10-14', description: 'Dividend', amount: '500' }, mapping).category).toBe('Investment Income');
  expect(normalizeImportRow({ date: '2026-10-14', description: 'Transfer to savings', amount: '-500' }, mapping, { aiCategory: 'Shopping' }).category).toBe('Transfer');
  expect(normalizeImportRow({ date: '2026-10-14', description: 'Deposit', amount: '500', category: 'Mystery' }, { ...mapping, category: 'category' }).error).toMatch(/Unknown category/);
});

test('row validation matches the database description contract', () => {
  expect(normalizeImportRow({ date: '2026-10-14', description: '', amount: '20' }, mapping).error).toBe('Missing description');
  expect(normalizeImportRow({ date: '2026-10-14', description: 'x'.repeat(2001), amount: '20' }, mapping).error).toMatch(/2,000/);
});

test('AI request excludes invalid rows and protected categories and reports provider failure', async () => {
  mockState.aiCategorize.mockRejectedValue(new Error('Unavailable'));
  await expect(aiCategorizeImport([
    { date: '2026-10-14', description: 'Unknown merchant', amount: '-20' },
    { date: '2026-10-14', description: 'Transfer', amount: '-20' },
    { date: '2026-02-30', description: 'Bad date', amount: '-20' },
  ], mapping)).rejects.toThrow(/AI categorization unavailable/);
  expect(mockState.aiCategorize).toHaveBeenCalledWith(['Unknown merchant']);
});

test('an empty statement is distinguishable from cancellation', async () => {
  Object.assign(window.wealthflow, {
    showOpenDialog: jest.fn().mockResolvedValue({ filePaths: ['/tmp/empty.csv'], canceled: false }),
    readFile: jest.fn().mockResolvedValue('date,description,amount'),
  });
  await expect(importFile()).rejects.toThrow(/no transaction rows/);
  window.wealthflow.showOpenDialog.mockResolvedValue({ canceled: true });
  expect(await importFile()).toBeNull();
});

test('canceling AI review stops later batches and explicit categories are never sent', async () => {
  let active = true;
  mockState.aiCategorize.mockImplementation(async descriptions => {
    active = false;
    return descriptions.map(() => 'Other');
  });
  const rows = Array.from({ length: 51 }, (_, i) => ({ date: '2026-10-14', description: 'Merchant ' + i, amount: '-20' }));
  await aiCategorizeImport(rows, mapping, { isCurrent: () => active });
  expect(mockState.aiCategorize).toHaveBeenCalledTimes(1);
  mockState.aiCategorize.mockClear();
  await aiCategorizeImport([{ ...rows[0], category: 'Other' }], { ...mapping, category: 'category' });
  expect(mockState.aiCategorize).not.toHaveBeenCalled();
});

test('XLSX and OFX statement formats use the same review contract', async () => {
  Object.assign(window.wealthflow, {
    showOpenDialog: jest.fn().mockResolvedValue({ filePaths: ['/tmp/rbc.xlsx'], canceled: false }),
    parseXLSX: jest.fn().mockResolvedValue({ headers: ['Account Type', 'Transaction Date', 'Description 1', 'Description 2', 'CAD$'], rows: [{ 'Account Type': 'Chequing', 'Transaction Date': '10/14/2026', 'Description 1': 'Purchase', 'Description 2': 'Costco', 'CAD$': '-20' }] }),
    readFile: jest.fn().mockResolvedValue('<OFX><BANKTRANLIST><STMTTRN><DTPOSTED>20261014<TRNAMT>-20<NAME>Costco</STMTTRN></BANKTRANLIST></OFX>'),
  });
  const xlsx = await importFile();
  expect(xlsx.detectedBank.key).toBe('RBC');
  expect(normalizeImportRow(xlsx.rows[0], xlsx.mapping)).toMatchObject({ date: '2026-10-14', description: 'Purchase - Costco', amount: -20, error: null });
  window.wealthflow.showOpenDialog.mockResolvedValue({ filePaths: ['/tmp/statement.ofx'], canceled: false });
  const ofx = await importFile();
  expect(normalizeImportRow(ofx.rows[0], ofx.mapping)).toMatchObject({ date: '2026-10-14', description: 'Costco', amount: -20, error: null });
});

test('a committed batch updates the cache without a second fallible database read', async () => {
  const state = { transactions: [], counts: { transactions: 0 } };
  const api = { addTransactionsBatch: jest.fn(), getTransactions: jest.fn(), getCounts: jest.fn() };
  initMoney(state, api);
  const rows = [{ id: 't1', date: '2026-10-14', amount: 20, category: 'Income', description: 'Salary' }];
  expect(await addTransactionsBatch(rows)).toBe(1);
  expect(state.transactions).toEqual(rows);
  expect(state.counts.transactions).toBe(1);
  expect(api.getTransactions).not.toHaveBeenCalled();
  expect(api.getCounts).not.toHaveBeenCalled();
  api.addTransactionsBatch.mockRejectedValue(new Error('Write failed'));
  await expect(addTransactionsBatch(rows)).rejects.toThrow('Write failed');
  expect(state.counts.transactions).toBe(1);
});

test('oversized batches are blocked in preview and before persistence', async () => {
  const rows = Array.from({ length: 10001 }, () => ({ date: '2026-10-14', description: 'Purchase', amount: '-20' }));
  await expect(applyImport(rows, mapping)).rejects.toThrow(/10,000/);
  expect(mockState.addTransactionsBatch).not.toHaveBeenCalled();
  const html = renderImportModal({ headers: Object.keys(mapping), rows, mapping, fileType: 'csv' });
  expect(html).toMatch(/data-action="confirm-import" disabled/);
  expect(html).toContain('Split this file into smaller statements');
});
