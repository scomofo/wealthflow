const {
  renderPlanning,
  runAffordabilityCheck,
  updatePlanInput,
} = require('../src/renderer/js/pages/planning.js');

const state = {
  debts: [],
  goals: [],
  transactions: [],
  settings: {},
};

const financials = {
  income: 5000,
  expenses: 3000,
  totalSaved: 12000,
  totalDebt: 2000,
};

function resetAffordabilityInputs() {
  updatePlanInput('affordabilityName', '');
  updatePlanInput('affordabilityAmount', '');
  updatePlanInput('affordabilityFrequency', 'one_time');
  updatePlanInput('affordabilityCategory', 'Other');
  updatePlanInput('affordabilityTiming', 'now');
}

describe('planning affordability workflow', () => {
  beforeEach(() => {
    resetAffordabilityInputs();
  });

  test('renders the affordability card and action trigger', () => {
    const html = renderPlanning(state);

    expect(html).toContain('Can I afford this?');
    expect(html).toContain('data-action="run-affordability-check"');
    expect(html).toContain('data-field="affordabilityAmount"');
  });

  test('renders a deterministic decision result after running the check', () => {
    updatePlanInput('affordabilityName', 'New bike');
    updatePlanInput('affordabilityAmount', '500');

    const result = runAffordabilityCheck(state, financials);
    const html = renderPlanning(state);

    expect(result.workflow_type).toBe('affordability_check');
    expect(result._deterministic).toBe(true);
    expect(html).toContain('Yes - this looks affordable.');
    expect(html).toContain('Buy New bike only if planned bills are covered');
  });

  test('clears the rendered result when affordability inputs change', () => {
    updatePlanInput('affordabilityAmount', '500');
    runAffordabilityCheck(state, financials);

    expect(renderPlanning(state)).toContain('Yes - this looks affordable.');

    updatePlanInput('affordabilityAmount', '');

    expect(renderPlanning(state)).not.toContain('Yes - this looks affordable.');
  });
});
