// Regression coverage for finding M11: refreshStockPrices() previously
// never fetched a USD/CAD exchange rate at all, even though
// window.wealthflow.fetchExchangeRate() (backed by StockService, already
// used elsewhere) was available the whole time — nothing in the renderer
// ever called it.
const { initGrowth, refreshStockPrices } = require('../src/renderer/js/state/growth.js');

function makeState(investments) {
  return { investments, usdCadRate: 1 };
}

describe('refreshStockPrices exchange rate handling', () => {
  test('fetches and stores the USD/CAD rate when a USD holding exists', async () => {
    const state = makeState([
      { id: 'i1', symbol: 'VOO', currency: 'USD', shares: 1, current_price: 100 },
    ]);
    const api = {
      fetchBatchQuotes: jest.fn().mockResolvedValue([]),
      fetchExchangeRate: jest.fn().mockResolvedValue({ from: 'USD', to: 'CAD', rate: 1.38 }),
      updateInvestment: jest.fn(),
    };
    initGrowth(state, api);

    await refreshStockPrices();

    expect(api.fetchExchangeRate).toHaveBeenCalledWith('USD', 'CAD');
    expect(state.usdCadRate).toBe(1.38);
  });

  test('does not fetch a rate when every holding is already CAD', async () => {
    const state = makeState([
      { id: 'i1', symbol: 'XEQT', currency: 'CAD', shares: 1, current_price: 50 },
    ]);
    const api = {
      fetchBatchQuotes: jest.fn().mockResolvedValue([]),
      fetchExchangeRate: jest.fn(),
      updateInvestment: jest.fn(),
    };
    initGrowth(state, api);

    await refreshStockPrices();

    expect(api.fetchExchangeRate).not.toHaveBeenCalled();
  });

  test('keeps the last known-good rate when a refresh fails, instead of resetting to 1', async () => {
    const state = makeState([
      { id: 'i1', symbol: 'VOO', currency: 'USD', shares: 1, current_price: 100 },
    ]);
    state.usdCadRate = 1.35; // a previously fetched rate
    const api = {
      fetchBatchQuotes: jest.fn().mockResolvedValue([]),
      fetchExchangeRate: jest.fn().mockResolvedValue({ from: 'USD', to: 'CAD', rate: null, error: 'No exchange rate data' }),
      updateInvestment: jest.fn(),
    };
    initGrowth(state, api);

    await refreshStockPrices();

    expect(state.usdCadRate).toBe(1.35);
  });
});
