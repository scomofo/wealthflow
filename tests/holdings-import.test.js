const { resolveHoldingCostBasis } = require('../src/renderer/js/utils/holdings-import.js');
const { resolveBankMapping } = require('../src/renderer/js/utils/bank-presets.js');

describe('resolveHoldingCostBasis', () => {
  test('converts CAD book value into native USD cost per share using the supplied FX rate', () => {
    expect(resolveHoldingCostBasis({ quantity: 10, bookValueCad: 1500, currency: 'USD', exchangeRateToCad: 1.35 }))
      .toEqual({ avgCost: 1500 / 10 / 1.35, exchangeRateToCad: 1.35 });
  });

  test('derives USD/CAD from CAD market value and native USD price when available', () => {
    expect(resolveHoldingCostBasis({
      quantity: 10, bookValueCad: 1500, currency: 'USD', price: 200,
      marketValue: 2700, marketValueCurrency: 'CAD',
    })).toEqual({ avgCost: 1500 / 10 / 1.35, exchangeRateToCad: 1.35 });
  });

  test('prefers an existing stored FX rate over inferring from market value', () => {
    expect(resolveHoldingCostBasis({
      quantity: 10, bookValueCad: 1500, currency: 'USD', existingExchangeRateToCad: 1.3,
      price: 200, marketValue: 2700, marketValueCurrency: 'CAD',
    })).toEqual({ avgCost: 1500 / 10 / 1.3, exchangeRateToCad: 1.3 });
  });

  test('does not silently treat CAD book value as USD when no FX rate is available', () => {
    expect(resolveHoldingCostBasis({ quantity: 10, bookValueCad: 1500, currency: 'USD', price: 200 }))
      .toEqual({ error: expect.stringContaining('Cannot convert Book Value (CAD)') });
  });

  test('CAD holdings keep their CAD cost basis without an FX rate', () => {
    expect(resolveHoldingCostBasis({ quantity: 10, bookValueCad: 1500, currency: 'CAD' }))
      .toEqual({ avgCost: 150, exchangeRateToCad: 1 });
  });

  test('rejects invalid quantities and book values', () => {
    expect(resolveHoldingCostBasis({ quantity: 0, bookValueCad: 100 })).toHaveProperty('error');
    expect(resolveHoldingCostBasis({ quantity: 1, bookValueCad: -100 })).toHaveProperty('error');
  });
});


describe('Wealthsimple holdings FX column mapping', () => {
  test('maps an explicit USD/CAD rate when supplied and tolerates exports without it', () => {
    const baseHeaders = ['Account Name', 'Symbol', 'Market Price', 'Quantity', 'Book Value (CAD)', 'Market Price Currency', 'Market Value', 'Market Value Currency'];
    const withRate = resolveBankMapping('WEALTHSIMPLE_HOLDINGS', [...baseHeaders, 'Exchange Rate to CAD']);
    const withoutRate = resolveBankMapping('WEALTHSIMPLE_HOLDINGS', baseHeaders);
    expect(withRate.exchangeRateToCad).toBe('Exchange Rate to CAD');
    expect(withoutRate.exchangeRateToCad).toBeNull();
  });
});
