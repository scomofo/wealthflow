// Regression coverage for finding M18 (null derefs): handlePlanChange's
// AI-categorize and duplicate-recheck async continuations mutated
// appState.importModalData without re-checking it was still non-null. If the
// user closes the import modal (which sets appState.importModalData = null)
// while the AI call or the duplicate-check IPC round-trip is still in
// flight, the continuation used to throw "Cannot set properties of null" —
// uncaught, since nothing downstream handles it, producing an unhandled
// promise rejection.

jest.mock('../src/renderer/js/utils/export-import.js', () => ({
  exportJSON: jest.fn(),
  exportCSV: jest.fn(),
  importFile: jest.fn(),
  applyImport: jest.fn(),
  applyHoldingsImport: jest.fn(),
  checkDuplicates: jest.fn(),
  aiCategorizeImport: jest.fn(),
  saveImportHistory: jest.fn(),
  exportPDF: jest.fn(),
  reconcileAfterImport: jest.fn(),
}));

jest.mock('../src/renderer/js/utils/qif-export.js', () => ({
  exportToQIF: jest.fn(),
}));

jest.mock('../src/renderer/js/components/import-modal.js', () => ({
  renderImportModal: jest.fn(() => '<div></div>'),
}));

jest.mock('../src/renderer/js/pages/planning.js', () => ({
  runAffordabilityCheck: jest.fn(),
}));

const { handlePlanChange } = require('../src/renderer/js/handlers/plan.js');
const { aiCategorizeImport, checkDuplicates } = require('../src/renderer/js/utils/export-import.js');

function deferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function flushAsync() {
  return new Promise((resolve) => setImmediate(resolve));
}

describe('handlePlanChange import-modal race conditions', () => {
  let unhandledRejections;
  let rejectionHandler;

  beforeEach(() => {
    global.document = { getElementById: jest.fn(() => null) };
    unhandledRejections = [];
    rejectionHandler = (err) => unhandledRejections.push(err);
    process.on('unhandledRejection', rejectionHandler);
  });

  afterEach(() => {
    process.off('unhandledRejection', rejectionHandler);
    delete global.document;
    jest.clearAllMocks();
  });

  test('AI categorization resolving after the modal was closed does not throw', async () => {
    const ctx = {
      appState: {
        importModalData: { rows: [{ a: 1 }], mapping: {}, useAI: false, aiCategories: null },
      },
    };
    const work = deferred();
    aiCategorizeImport.mockReturnValue(work.promise);

    const e = { target: { classList: { contains: () => false }, dataset: { action: 'import-toggle-ai' }, checked: true } };
    await handlePlanChange(e, ctx);

    // User closes the import modal before the AI call resolves.
    ctx.appState.importModalData = null;
    work.resolve(['Groceries']);
    await flushAsync();

    expect(unhandledRejections).toEqual([]);
    expect(ctx.appState.importModalData).toBeNull();
  });

  test('AI categorization rejecting after the modal was closed does not throw', async () => {
    const ctx = {
      appState: {
        importModalData: { rows: [{ a: 1 }], mapping: {}, useAI: false, aiCategories: null },
      },
      showToast: jest.fn(),
    };
    const work = deferred();
    aiCategorizeImport.mockReturnValue(work.promise);

    const e = { target: { classList: { contains: () => false }, dataset: { action: 'import-toggle-ai' }, checked: true } };
    await handlePlanChange(e, ctx);

    ctx.appState.importModalData = null;
    work.reject(new Error('AI service unavailable'));
    await flushAsync();

    expect(unhandledRejections).toEqual([]);
  });

  test('duplicate re-check resolving after the modal was closed does not throw', async () => {
    const ctx = {
      appState: {
        importModalData: { rows: [{ a: 1 }], mapping: { date: 'Date' } },
      },
    };
    const work = deferred();
    checkDuplicates.mockReturnValue(work.promise);

    const e = {
      target: {
        classList: { contains: (cls) => cls === 'import-mapping-select' },
        dataset: { colHeader: 'Date' },
        value: 'date',
        tagName: 'SELECT',
      },
    };
    await handlePlanChange(e, ctx);

    ctx.appState.importModalData = null;
    work.resolve([false]);
    await flushAsync();

    expect(unhandledRejections).toEqual([]);
  });
});
