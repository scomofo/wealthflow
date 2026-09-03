// Regression coverage for finding M16: the "row + column mapping -> signed
// CAD amount" transform (read a single "amount" column, or derive one from
// separate "debit"/"credit" columns) was reimplemented as four
// near-identical copies across two files — export-import.js's
// checkDuplicates() and applyImport(), and import-modal.js's
// buildPreviewRow() and computeStats() — which had to be kept in manual
// sync by hand. computeSignedAmount() is now the single implementation all
// four call.
global.window = { wealthflow: {} }; // export-import.js reads window.wealthflow at module load

const { computeSignedAmount } = require('../src/renderer/js/utils/export-import.js');

describe('computeSignedAmount', () => {
  test('reads a single "amount" column directly', () => {
    expect(computeSignedAmount({ Amount: '1,234.56' }, { amount: 'Amount' })).toBeCloseTo(1234.56, 2);
  });

  test('a positive amount column stays positive (income)', () => {
    expect(computeSignedAmount({ Amount: '$500.00' }, { amount: 'Amount' })).toBe(500);
  });

  test('derives a negative amount from a debit column', () => {
    expect(computeSignedAmount({ Debit: '150.00', Credit: '' }, { debit: 'Debit', credit: 'Credit' })).toBe(-150);
  });

  test('derives a positive amount from a credit column', () => {
    expect(computeSignedAmount({ Debit: '', Credit: '2,000.00' }, { debit: 'Debit', credit: 'Credit' })).toBe(2000);
  });

  test('both debit and credit empty/zero yields exactly 0, not -0 or NaN', () => {
    const result = computeSignedAmount({ Debit: '0', Credit: '0' }, { debit: 'Debit', credit: 'Credit' });
    expect(result).toBe(0);
    expect(Object.is(result, -0)).toBe(false);
  });

  test('no amount/debit/credit mapping at all yields 0', () => {
    expect(computeSignedAmount({ Description: 'Something' }, { description: 'Description' })).toBe(0);
  });

  test('a malformed numeric string does not throw and falls back to 0', () => {
    expect(computeSignedAmount({ Amount: 'not-a-number' }, { amount: 'Amount' })).toBe(0);
  });
});

describe('import-modal.js uses the shared computeSignedAmount, not its own copy', () => {
  test('buildPreviewRow/computeStats import computeSignedAmount from export-import.js', () => {
    const fs = require('fs');
    const path = require('path');
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'src', 'renderer', 'js', 'components', 'import-modal.js'),
      'utf8'
    );
    expect(source).toMatch(/import\s*\{\s*computeSignedAmount\s*\}\s*from\s*['"]\.\.\/utils\/export-import\.js['"]/);
    // The old inline debit/credit calculation must be gone, not just
    // supplemented by the import.
    expect(source).not.toMatch(/credit > 0 \? credit : \(debit > 0 \? -debit : 0\)/);
  });
});
