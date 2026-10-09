jest.mock('../src/renderer/js/utils/export-import.js', () => ({}));
jest.mock('../src/renderer/js/utils/qif-export.js', () => ({}));
jest.mock('../src/renderer/js/components/import-modal.js', () => ({}));
jest.mock('../src/renderer/js/pages/planning.js', () => ({}));

const { handlePlanInput, handlePlanChange } = require('../src/renderer/js/handlers/plan.js');

function target(field, options = {}) {
  return { classList: { contains: cls => cls === 'tax-input' }, dataset: { field }, tagName: 'INPUT', type: 'checkbox', value: 'on', ...options };
}

describe('tax calculator DOM event wiring', () => {
  afterEach(() => { delete global.document; });

  test('checkbox input event does not commit the default value "on"', () => {
    const updateTaxInput = jest.fn();
    const debouncedPageRender = jest.fn();
    const handled = handlePlanInput({ target: target('disabilityApproved', { checked: true }) }, { updateTaxInput, debouncedPageRender });
    expect(handled).toBe(true);
    expect(updateTaxInput).not.toHaveBeenCalled();
    expect(debouncedPageRender).not.toHaveBeenCalled();
  });

  test('checkbox change sends checked and restores focus after conditional rerender', async () => {
    const updateTaxInput = jest.fn();
    const control = { dataset: { field: 'spouseAmountEligible' }, focus: jest.fn() };
    const page = { innerHTML: '', querySelectorAll: () => [control] };
    global.document = { getElementById: () => page };
    const renderTaxCalculator = jest.fn(() => '<input>');
    const State = { getState: () => ({}) };
    await handlePlanChange({ target: target('spouseAmountEligible', { checked: true }) }, { State, getSection: () => 'tax-calc', updateTaxInput, renderTaxCalculator });
    expect(updateTaxInput).toHaveBeenCalledWith('spouseAmountEligible', true);
    expect(page.innerHTML).toBe('<input>');
    expect(control.focus).toHaveBeenCalledTimes(1);
  });

  test('numeric input still uses debounced rendering', () => {
    const updateTaxInput = jest.fn();
    const debouncedPageRender = jest.fn();
    handlePlanInput({ target: target('ageAtYearEnd', { type: 'number', value: '65' }) }, { updateTaxInput, debouncedPageRender });
    expect(updateTaxInput).toHaveBeenCalledWith('ageAtYearEnd', '65');
    expect(debouncedPageRender).toHaveBeenCalledWith('tax-calc', expect.any(Function));
  });
});
