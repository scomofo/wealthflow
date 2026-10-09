describe('tax calculator renders the shared Alberta credit model', () => {
  let calculator;
  beforeEach(() => {
    jest.resetModules();
    calculator = require('../src/renderer/js/pages/tax-calculator.js');
  });

  test('shows worked-example totals, labeled eligibility inputs and scope', () => {
    calculator.updateTaxInput('employment', '100000');
    const html = calculator.renderTaxCalculator({});
    expect(html).toContain('$21,137.07');
    expect(html).toContain('2026 Credit Breakdown');
    expect(html).toContain('Alberta supplemental entitlement');
    expect(html).toContain('for="tax-age"');
    expect(html).toContain('data-field="disabilityApproved"');
    expect(html).toContain('Combined Bracket Rate');
    expect(html).toContain('credits, refundable benefits, OAS recovery, AMT and self-employment');
  });

  test('boolean controls remain booleans and activate the spouse credit', () => {
    calculator.updateTaxInput('employment', '100000');
    calculator.updateTaxInput('ageAtYearEnd', '45');
    calculator.updateTaxInput('disabilityApproved', true);
    calculator.updateTaxInput('spouseAmountEligible', true);
    const html = calculator.renderTaxCalculator({});
    expect(html).toContain('$14,121.47');
    expect(html).toContain('$38.02');
    expect(html).toMatch(/data-field="disabilityApproved" checked/);
    expect(html.match(/id="tax-spouse"/g)).toHaveLength(1);
    calculator.updateTaxInput('pensionSplitting', true);
    const withSplit = calculator.renderTaxCalculator({});
    expect(withSplit.match(/id="tax-spouse"/g)).toHaveLength(1);
    expect(withSplit.match(/id="tax-pension"/g)).toHaveLength(1);
    calculator.updateTaxInput('spouseAmountEligible', false);
    expect(calculator.renderTaxCalculator({})).not.toContain('$14,121.47');
  });

  test('counts standalone pension income and shows RRSP age-credit savings', () => {
    calculator.updateTaxInput('pensionIncome', 60000);
    calculator.updateTaxInput('ageAtYearEnd', 65);
    calculator.updateTaxInput('rrspDeduction', 10000);
    const html = calculator.renderTaxCalculator({});
    expect(html).toContain('$4,766.36');
    expect(html).toContain('$2,626.00');
    expect(html).toContain('26.3% effective benefit');
  });

  test('ignores unknown fields, rejects invalid values and keeps chosen Alberta province', () => {
    calculator.initTaxInputs('BC');
    calculator.updateTaxInput('province', 'AB');
    calculator.initTaxInputs('BC');
    calculator.updateTaxInput('other', 'Infinity');
    calculator.updateTaxInput('__proto__', { other: 100000 });
    calculator.updateTaxInput('unrecognized', '<script>');
    const html = calculator.renderTaxCalculator({});
    expect(html).toContain('value="AB" selected');
    expect(html).toContain('2026 Credit Breakdown');
    expect(html).not.toContain('Infinity');
    expect(html).not.toContain('<script>');
  });

  test('changing province removes Alberta inputs and shows the secondary coverage limit', () => {
    calculator.updateTaxInput('province', 'ON');
    const html = calculator.renderTaxCalculator({});
    expect(html).not.toContain('id="tax-age"');
    expect(html).not.toContain('2026 Credit Breakdown');
    expect(html).toContain('currently modeled for Alberta only');
  });
});
