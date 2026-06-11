jest.mock('../src/renderer/js/components/sidebar.js', () => ({
  setExpandedGroup: jest.fn(),
}));
jest.mock('../src/renderer/js/components/import-modal.js', () => ({
  renderImportModal: jest.fn(),
}));
jest.mock('../src/renderer/js/components/ai-decision-card.js', () => ({
  renderDecisionCard: jest.fn(),
}));
jest.mock('../src/renderer/js/utils/action-momentum.js', () => ({
  buildCompletionToast: jest.fn(),
  getNextActionAfterCompletion: jest.fn(),
}));
jest.mock('../src/renderer/js/utils/proactive-routing.js', () => ({
  findRelatedActionForNudge: jest.fn(),
  getNudgeFallbackRoute: jest.fn(),
}));

const { handleSharedAction } = require('../src/renderer/js/handlers/shared.js');

describe('handleSharedAction refresh actions', () => {
  beforeEach(() => {
    global.document = {
      querySelectorAll: jest.fn(() => []),
    };
  });

  afterEach(() => {
    delete global.document;
  });

  test('surfaces command center partial refresh errors and still renders', async () => {
    const ctx = {
      State: {
        refreshCommandCenterIntelligence: jest.fn().mockResolvedValue({
          errors: [
            { step: 'proactiveNudges', message: 'nudge service unavailable' },
          ],
        }),
      },
      render: jest.fn(),
      showToast: jest.fn(),
    };

    const handled = await handleSharedAction('generate-next-best-actions', {}, ctx);

    expect(handled).toBe(true);
    expect(ctx.State.refreshCommandCenterIntelligence).toHaveBeenCalledWith('manual');
    expect(ctx.render).toHaveBeenCalledTimes(1);
    expect(ctx.showToast).toHaveBeenCalledWith('Refreshing actions...', 'info');
    expect(ctx.showToast).toHaveBeenCalledWith(
      expect.stringContaining('Some command center intelligence could not refresh'),
      'error',
    );
  });

  test('refreshes command center intelligence after sample onboarding setup', async () => {
    const ctx = {
      State: {
        updateSettings: jest.fn().mockResolvedValue(),
        seedSampleData: jest.fn().mockResolvedValue(),
        getState: jest.fn(() => ({ budgets: [] })),
        refreshCommandCenterIntelligence: jest.fn().mockResolvedValue({}),
      },
      uid: jest.fn(() => 'id-1'),
      render: jest.fn(),
      SAMPLE_DATA: { transactions: [] },
    };

    const handled = await handleSharedAction('start-sample', {}, ctx);

    expect(handled).toBe(true);
    expect(ctx.State.updateSettings).toHaveBeenCalledWith({ last_wizard_step: 4 });
    expect(ctx.State.seedSampleData).toHaveBeenCalledWith(ctx.SAMPLE_DATA);
    expect(ctx.State.refreshCommandCenterIntelligence).toHaveBeenCalledWith('onboarding_completed');
    expect(ctx.render).toHaveBeenCalledTimes(1);
  });

  test('refreshes command center intelligence after empty onboarding setup', async () => {
    const ctx = {
      State: {
        updateSettings: jest.fn().mockResolvedValue(),
        loadAll: jest.fn().mockResolvedValue(),
        addBudget: jest.fn().mockResolvedValue(),
        refreshCommandCenterIntelligence: jest.fn().mockResolvedValue({}),
      },
      uid: jest.fn(() => 'id-1'),
      render: jest.fn(),
    };

    const handled = await handleSharedAction('start-empty', {}, ctx);

    expect(handled).toBe(true);
    expect(ctx.State.updateSettings).toHaveBeenCalledWith({ last_wizard_step: 4 });
    expect(ctx.State.loadAll).toHaveBeenCalledTimes(1);
    expect(ctx.State.refreshCommandCenterIntelligence).toHaveBeenCalledWith('onboarding_completed');
    expect(ctx.render).toHaveBeenCalledTimes(1);
  });
});
