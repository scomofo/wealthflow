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
});
