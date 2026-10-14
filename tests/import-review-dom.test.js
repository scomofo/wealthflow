/** @jest-environment jsdom */
jest.mock('../src/renderer/js/utils/export-import.js', () => ({
  importFile: jest.fn(), applyImport: jest.fn(), checkDuplicates: jest.fn(),
  aiCategorizeImport: jest.fn(), saveImportHistory: jest.fn(), reconcileAfterImport: jest.fn(),
}));
jest.mock('../src/renderer/js/utils/qif-export.js', () => ({}));
jest.mock('../src/renderer/js/pages/planning.js', () => ({}));

const imports = require('../src/renderer/js/utils/export-import.js');
const { renderImportModal } = require('../src/renderer/js/components/import-modal.js');
const { handlePlanAction, handlePlanChange } = require('../src/renderer/js/handlers/plan.js');

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function makeData(overrides = {}) {
  return {
    headers: ['date', 'description', 'amount', 'alternative'],
    rows: [{ date: '10/14/2026', description: 'Unknown merchant', amount: '-20', alternative: '-40' }],
    mapping: { date: 'date', description: 'description', amount: 'amount' },
    filePath: '/tmp/statement.csv', fileType: 'csv', dateFormat: 'MM/DD/YYYY',
    duplicates: [false], useAI: false, hasAiKey: true, processing: false,
    ...overrides,
  };
}
function context(data = makeData()) {
  const ctx = {
    appState: { importModalData: data }, showToast: jest.fn(),
    State: { loadAll: jest.fn(), refreshCommandCenterIntelligence: jest.fn() },
  };
  ctx.render = jest.fn(async () => {
    document.getElementById('modal-root').innerHTML = renderImportModal(ctx.appState.importModalData);
  });
  document.body.innerHTML = '<button id="import-trigger" data-action="import-csv">Import</button><div id="modal-root"></div>';
  ctx.render();
  return ctx;
}

beforeEach(() => {
  jest.resetAllMocks();
  imports.checkDuplicates.mockResolvedValue([false]);
  imports.aiCategorizeImport.mockResolvedValue({ 0: 'Shopping' });
  imports.applyImport.mockResolvedValue({ imported: 1, duplicateCount: 0, errorCount: 0, transactions: [] });
});

function confirmButton() { return document.querySelector('[data-action="confirm-import"]'); }

test('review has dialog semantics, associated controls and readable errors beyond the first eight rows', () => {
  const rows = Array.from({ length: 9 }, (_, i) => ({ date: i === 8 ? '2026-02-30' : '2026-10-14', description: 'Purchase', amount: '-20' }));
  context(makeData({ rows, duplicates: rows.map(() => false) }));
  const dialog = document.querySelector('[role="dialog"]');
  expect(dialog.getAttribute('aria-modal')).toBe('true');
  expect(document.getElementById(dialog.getAttribute('aria-labelledby')).textContent).toMatch(/Review your transactions/);
  for (const select of dialog.querySelectorAll('select')) {
    expect(document.querySelector(`label[for="${select.id}"]`)).not.toBeNull();
  }
  expect(dialog.textContent).toContain('Row 9: Invalid date');
  expect(dialog.textContent).toContain('8 ready to import');
  expect(confirmButton().disabled).toBe(false);
});

test('escaping protects filenames, headers, descriptions and error messages', () => {
  const payload = '"><img src=x onerror="window.injected=true">';
  const ctx = context(makeData({ filePath: '/tmp/' + payload, headers: [payload], rows: [{ date: '2026-10-14', description: payload, amount: '-20' }], validationError: payload }));
  expect(document.querySelector('script')).toBeNull();
  expect(document.querySelector('img')).toBeNull();
  expect(document.querySelector('.import-file-info').textContent).toContain(payload);
  expect(confirmButton().disabled).toBe(true);
  expect(ctx.appState.importModalData).not.toBeNull();
});

test('changing date order updates normalized preview and keeps keyboard focus', async () => {
  const ctx = context(makeData({ rows: [{ date: '14/10/2026', description: 'Purchase', amount: '-20' }] }));
  expect(confirmButton().disabled).toBe(true);
  const select = document.getElementById('import-date-format');
  select.focus();
  select.value = 'DD/MM/YYYY';
  await handlePlanChange({ target: select }, ctx);
  expect(imports.checkDuplicates).toHaveBeenCalledWith(ctx.appState.importModalData.rows, ctx.appState.importModalData.mapping, { dateFormat: 'DD/MM/YYYY' });
  expect(document.querySelector('.import-table').textContent).toContain('2026-10-14');
  expect(document.activeElement.id).toBe('import-date-format');
  expect(confirmButton().disabled).toBe(false);
});

test('mapping changes clear incompatible amount roles and block saving while validation is pending', async () => {
  const pending = deferred();
  imports.checkDuplicates.mockReturnValue(pending.promise);
  const ctx = context();
  const select = document.getElementById('import-column-3');
  select.focus();
  select.value = 'debit';
  const change = handlePlanChange({ target: select }, ctx);
  expect(ctx.appState.importModalData.mapping).toMatchObject({ amount: null, debit: 'alternative' });
  expect(confirmButton().disabled).toBe(true);
  await handlePlanAction('confirm-import', null, ctx);
  expect(imports.applyImport).not.toHaveBeenCalled();
  pending.resolve([false]);
  await change;
  expect(document.activeElement.id).toBe('import-column-3');
  expect(confirmButton().disabled).toBe(false);
});

test('older duplicate checks cannot overwrite results for the latest mapping', async () => {
  const older = deferred(), newer = deferred();
  imports.checkDuplicates.mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise);
  const ctx = context();
  let select = document.getElementById('import-column-3');
  select.value = 'amount';
  const first = handlePlanChange({ target: select }, ctx);
  select = document.getElementById('import-column-2');
  select.value = 'amount';
  const second = handlePlanChange({ target: select }, ctx);
  newer.resolve([false]);
  await second;
  older.resolve([true]);
  await first;
  expect(ctx.appState.importModalData.mapping.amount).toBe('amount');
  expect(ctx.appState.importModalData.duplicates).toEqual([false]);
  expect(confirmButton().disabled).toBe(false);
});

test('canceled validation cannot modify a new review and focus returns to the import control', async () => {
  const pending = deferred();
  imports.checkDuplicates.mockReturnValue(pending.promise);
  const ctx = context();
  const select = document.getElementById('import-column-3');
  select.value = 'amount';
  const changing = handlePlanChange({ target: select }, ctx);
  await handlePlanAction('close-import-modal', null, ctx);
  expect(ctx.appState.importModalData).toBeNull();
  expect(document.activeElement.id).toBe('import-trigger');
  const newData = makeData({ duplicates: [false] });
  ctx.appState.importModalData = newData;
  await ctx.render();
  pending.resolve([true]);
  await changing;
  expect(ctx.appState.importModalData).toBe(newData);
  expect(newData.duplicates).toEqual([false]);
});

test('cancellation during AI loading discards the late result without an exception', async () => {
  const pending = deferred();
  imports.aiCategorizeImport.mockReturnValue(pending.promise);
  const ctx = context();
  const toggle = document.getElementById('import-ai');
  toggle.checked = true;
  const loading = handlePlanChange({ target: toggle }, ctx);
  expect(confirmButton().disabled).toBe(true);
  await handlePlanAction('close-import-modal', null, ctx);
  pending.resolve({ 0: 'Shopping' });
  await loading;
  expect(ctx.appState.importModalData).toBeNull();
  expect(document.getElementById('modal-root').textContent).toBe('');
});

test('duplicate-check failure blocks saving and exposes a working retry', async () => {
  imports.checkDuplicates.mockRejectedValueOnce(new Error('Read failed'));
  const ctx = context();
  await handlePlanAction('retry-import-validation', null, ctx);
  expect(document.querySelector('[role="alert"]').textContent).toContain('Read failed');
  expect(confirmButton().disabled).toBe(true);
  await handlePlanAction('confirm-import', null, ctx);
  expect(imports.applyImport).not.toHaveBeenCalled();
  await handlePlanAction('retry-import-validation', null, ctx);
  expect(ctx.appState.importModalData.validationError).toBeNull();
  expect(confirmButton().disabled).toBe(false);
});

test('AI failure exposes a local categorization fallback and preserves the review', async () => {
  imports.aiCategorizeImport.mockRejectedValue(new Error('Provider failed'));
  const ctx = context();
  const toggle = document.getElementById('import-ai');
  toggle.checked = true;
  await handlePlanChange({ target: toggle }, ctx);
  expect(ctx.appState.importModalData.useAI).toBe(false);
  expect(ctx.showToast).toHaveBeenCalledWith(expect.stringContaining('Using local categories'), 'info');
  expect(confirmButton().disabled).toBe(false);
});

test('a failed batch stays retryable with an explicit save error', async () => {
  imports.applyImport.mockRejectedValueOnce(new Error('Disk unavailable'));
  const ctx = context();
  await handlePlanAction('confirm-import', null, ctx);
  expect(ctx.appState.importModalData.processing).toBe(false);
  expect(document.querySelector('[role="alert"]').textContent).toContain('Disk unavailable');
  expect(imports.saveImportHistory).not.toHaveBeenCalled();
  expect(confirmButton().disabled).toBe(false);
  await handlePlanAction('confirm-import', null, ctx);
  expect(imports.applyImport).toHaveBeenCalledTimes(2);
  expect(ctx.appState.importModalData).toBeNull();
});

test('successful insertion cannot be retried after history or refresh failure', async () => {
  imports.saveImportHistory.mockRejectedValue(new Error('History unavailable'));
  const ctx = context();
  ctx.State.loadAll.mockRejectedValue(new Error('Refresh unavailable'));
  await handlePlanAction('confirm-import', null, ctx);
  expect(ctx.appState.importModalData).toBeNull();
  expect(ctx.showToast).toHaveBeenCalledWith(expect.stringContaining('Imported 1 transactions. Import history could not be saved.'), 'info');
  expect(ctx.State.refreshCommandCenterIntelligence).toHaveBeenCalledWith('financial_data_changed');
  await handlePlanAction('confirm-import', null, ctx);
  expect(imports.applyImport).toHaveBeenCalledTimes(1);
});

test('a failed final page render still closes the committed import without enabling another write', async () => {
  const ctx = context();
  ctx.render.mockRejectedValue(new Error('Page read failed'));
  await handlePlanAction('confirm-import', null, ctx);
  expect(ctx.appState.importModalData).toBeNull();
  expect(document.getElementById('modal-root').textContent).toBe('');
  expect(ctx.showToast).toHaveBeenCalledWith('Transactions saved. Reload the app to refresh the view.', 'info');
  await handlePlanAction('confirm-import', null, ctx);
  expect(imports.applyImport).toHaveBeenCalledTimes(1);
});

test('duplicate ledger check is repeated immediately before insertion', async () => {
  imports.checkDuplicates.mockResolvedValue([true]);
  imports.applyImport.mockResolvedValue({ imported: 0, duplicateCount: 1, errorCount: 0 });
  const ctx = context();
  await handlePlanAction('confirm-import', null, ctx);
  expect(imports.applyImport).toHaveBeenCalledWith(expect.any(Array), expect.any(Object), [true], null, { dateFormat: 'MM/DD/YYYY' });
  expect(ctx.showToast).toHaveBeenCalledWith('Imported 0 transactions, 1 duplicates skipped', 'success');
});

test('saving blocks cancellation, editing and a second confirmation', async () => {
  const pending = deferred();
  imports.checkDuplicates.mockReturnValue(pending.promise);
  const ctx = context();
  const saving = handlePlanAction('confirm-import', null, ctx);
  const data = ctx.appState.importModalData;
  expect(confirmButton().disabled).toBe(true);
  await handlePlanAction('close-import-modal', null, ctx);
  await handlePlanAction('confirm-import', null, ctx);
  const select = document.getElementById('import-date-format');
  select.value = 'DD/MM/YYYY';
  await handlePlanChange({ target: select }, ctx);
  expect(ctx.appState.importModalData).toBe(data);
  expect(data.dateFormat).toBe('MM/DD/YYYY');
  expect(imports.checkDuplicates).toHaveBeenCalledTimes(1);
  pending.resolve([false]);
  await saving;
  expect(imports.applyImport).toHaveBeenCalledTimes(1);
});

test('opening a file displays actionable parsing errors and cancellation is quiet', async () => {
  const ctx = context(null);
  imports.importFile.mockRejectedValueOnce(new Error('No transaction rows'));
  await handlePlanAction('import-csv', null, ctx);
  expect(ctx.showToast).toHaveBeenCalledWith(expect.stringContaining('No transaction rows'), 'error');
  ctx.showToast.mockClear();
  imports.importFile.mockResolvedValue(null);
  await handlePlanAction('import-csv', null, ctx);
  expect(ctx.showToast).not.toHaveBeenCalled();
});
