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
  renderImportModal: jest.fn(),
}));

jest.mock('../src/renderer/js/pages/planning.js', () => ({
  runAffordabilityCheck: jest.fn(),
}));

const { handlePlanAction } = require('../src/renderer/js/handlers/plan.js');
const {
  runAffordabilityCheck,
} = require('../src/renderer/js/pages/planning.js');

describe('handlePlanAction affordability check', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('computes financials, runs the affordability check, and renders', async () => {
    const state = { transactions: [] };
    const financials = {
      income: 5000,
      expenses: 3000,
      totalSaved: 12000,
      totalDebt: 2000,
    };
    const result = {
      workflow_type: 'affordability_check',
      summary: 'Yes - this looks affordable.',
      next_actions: [],
    };
    const ctx = {
      State: {
        computeFinancials: jest.fn().mockResolvedValue(financials),
        getState: jest.fn(() => state),
      },
      appState: {},
      showToast: jest.fn(),
      render: jest.fn(),
    };

    runAffordabilityCheck.mockReturnValue(result);

    const handled = await handlePlanAction(
      'run-affordability-check',
      {},
      ctx
    );

    expect(handled).toBe(true);
    expect(ctx.State.computeFinancials).toHaveBeenCalledTimes(1);
    expect(runAffordabilityCheck).toHaveBeenCalledWith(state, financials);
    expect(ctx.appState.activeWorkflowResult).toBe(result);
    expect(ctx.showToast).toHaveBeenCalledWith(
      'Affordability checked',
      'success'
    );
    expect(ctx.render).toHaveBeenCalledTimes(1);
  });
});


describe('handlePlanAction JSON backup feedback', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('does not claim export success when the save dialog is canceled', async () => {
    const { exportJSON } = require('../src/renderer/js/utils/export-import.js');
    exportJSON.mockResolvedValue(false);
    const ctx = { showToast: jest.fn() };

    await handlePlanAction('export-json', {}, ctx);

    expect(ctx.showToast).not.toHaveBeenCalled();
  });

  test('reports export success only after a file was saved', async () => {
    const { exportJSON } = require('../src/renderer/js/utils/export-import.js');
    exportJSON.mockResolvedValue(true);
    const ctx = { showToast: jest.fn() };

    await handlePlanAction('export-json', {}, ctx);

    expect(ctx.showToast).toHaveBeenCalledWith('Backup exported as JSON', 'success');
  });

  test('shows a useful error if writing the backup fails', async () => {
    const { exportJSON } = require('../src/renderer/js/utils/export-import.js');
    exportJSON.mockRejectedValue(new Error('Disk full'));
    const ctx = { showToast: jest.fn() };

    await handlePlanAction('export-json', {}, ctx);

    expect(ctx.showToast).toHaveBeenCalledWith('Backup export failed: Disk full', 'error');
  });
});
