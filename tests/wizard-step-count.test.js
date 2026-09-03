// Regression coverage for the wizard step-count drift described in the app
// review (finding L9): the advisor wizard's step bound was hardcoded as the
// literal 8 in three places in handlers/home.js, independently of the
// actual STEPS array defined in pages/advisor-wizard.js. Adding or removing
// a step in STEPS would silently desync navigation from the real step
// count with no compile error — verified below by mocking STEPS to a
// different length than the real 8 and confirming home.js's bound moves
// with it, rather than staying pinned to a hardcoded 8.
jest.mock('../src/renderer/js/pages/advisor-wizard.js', () => ({
  STEPS: [{ key: 'a' }, { key: 'b' }, { key: 'c' }], // length 3, not the real 8
}));

const { STEPS } = require('../src/renderer/js/pages/advisor-wizard.js');
const { handleHomeAction } = require('../src/renderer/js/handlers/home.js');

function makeCtx(startStep) {
  let step = startStep;
  return {
    State: { updateSettings: jest.fn().mockResolvedValue() },
    render: jest.fn(),
    showToast: jest.fn(),
    uid: jest.fn(),
    appState: {},
    navigate: jest.fn(),
    getWizardStep: () => step,
    setWizardStep: (s) => { step = s; },
  };
}

describe('advisor wizard step navigation tracks STEPS.length, not a hardcoded count', () => {
  test('wizard-next stops at the mocked last step (index 2), not index 7', async () => {
    expect(STEPS.length).toBe(3);
    const ctx = makeCtx(STEPS.length - 1); // step 2, the last step of the mocked 3
    await handleHomeAction('wizard-next', {}, ctx);

    expect(ctx.State.updateSettings).not.toHaveBeenCalled();
    expect(ctx.getWizardStep()).toBe(2);
  });

  test('wizard-next still advances one step before the mocked bound', async () => {
    const ctx = makeCtx(1);
    await handleHomeAction('wizard-next', {}, ctx);

    expect(ctx.getWizardStep()).toBe(2);
    expect(ctx.State.updateSettings).toHaveBeenCalledWith({ last_wizard_step: 2 });
  });

  test('wizard-skip stops at the mocked last step', async () => {
    const ctx = makeCtx(2);
    await handleHomeAction('wizard-skip', {}, ctx);

    expect(ctx.State.updateSettings).not.toHaveBeenCalled();
    expect(ctx.getWizardStep()).toBe(2);
  });
});
