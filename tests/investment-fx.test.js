const fs = require('fs');
const os = require('os');
const path = require('path');

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wealthflow-fx-'));
process.resourcesPath = tempRoot;

jest.mock('electron', () => ({
  app: { getPath: jest.fn(() => tempRoot) },
  safeStorage: { isEncryptionAvailable: jest.fn(() => false) },
}));

const { WealthFlowDatabase } = require('../src/main/database.js');
const {
  getPortfolioTotals,
  investmentValueCad,
} = require('../src/renderer/js/pages/investments.js');
const Growth = require('../src/renderer/js/state/growth.js');

describe('investment FX persistence and calculations', () => {
  let database;

  beforeEach(async () => {
    const dbPath = path.join(tempRoot, 'wealthflow.db');
    for (const p of [dbPath, dbPath + '.bak', dbPath + '.tmp']) {
      if (fs.existsSync(p)) fs.rmSync(p, { force: true });
    }
    database = new WealthFlowDatabase();
    await database.init();
  });

  afterEach(() => {
    if (database) database.close();
  });

  test('persists holding currency and USD/CAD conversion rate', () => {
    database.addInvestment({
      id: 'usd1', symbol: 'AAPL', name: 'Apple', shares: 10,
      avg_cost: 150, current_price: 200, type: 'stock',
      account_type: 'tfsa', currency: 'USD', exchange_rate_to_cad: 1.35,
    });

    const stored = database.listInvestments()[0];
    expect(stored.currency).toBe('USD');
    expect(stored.exchange_rate_to_cad).toBeCloseTo(1.35, 6);

    database.updateInvestment({ ...stored, current_price: 210, exchange_rate_to_cad: 1.36 });
    const updated = database.listInvestments()[0];
    expect(updated.current_price).toBe(210);
    expect(updated.exchange_rate_to_cad).toBeCloseTo(1.36, 6);
  });

  test('financial snapshot and net worth convert USD holdings to CAD', () => {
    database.addInvestment({
      id: 'cad', symbol: 'XEQT.TO', shares: 10, avg_cost: 25, current_price: 30,
      currency: 'CAD', exchange_rate_to_cad: 1,
    });
    database.addInvestment({
      id: 'usd', symbol: 'AAPL', shares: 10, avg_cost: 100, current_price: 100,
      currency: 'USD', exchange_rate_to_cad: 1.35,
    });

    const financials = database.computeFinancials();
    expect(financials.totalInv).toBeCloseTo(300 + 1350, 2);
    expect(financials.netWorth).toBeCloseTo(1650, 2);

    const snapshot = database.snapshotNetWorth();
    expect(snapshot.total_investments).toBeCloseTo(1650, 2);
  });

  test('renderer portfolio totals use persisted FX rates', () => {
    const investments = [
      { shares: 10, current_price: 30, avg_cost: 25, currency: 'CAD' },
      { shares: 10, current_price: 100, avg_cost: 80, currency: 'USD', exchange_rate_to_cad: 1.35 },
    ];
    expect(investmentValueCad(investments[1])).toBeCloseTo(1350, 2);
    const totals = getPortfolioTotals(investments);
    expect(totals.valueCad).toBeCloseTo(1650, 2);
    expect(totals.costCadAtCurrentFx).toBeCloseTo(1330, 2);
  });
});

describe('stock refresh market and FX handling', () => {
  test('forces TSX symbols for CAD holdings and stores USD/CAD rate for USD quotes', async () => {
    const state = {
      investments: [
        { id: 'cad', symbol: 'SHOP', shares: 1, current_price: 100, currency: 'CAD', type: 'stock' },
        { id: 'usd', symbol: 'AAPL', shares: 1, current_price: 100, currency: 'USD', type: 'stock' },
      ],
      counts: { investments: 2 },
    };
    const api = {
      fetchExchangeRate: jest.fn(async () => ({ from: 'USD', to: 'CAD', rate: 1.37 })),
      fetchBatchQuotes: jest.fn(async symbols => [
        { symbol: symbols[0], price: 110, currency: 'CAD' },
        { symbol: symbols[1], price: 220, currency: 'USD' },
      ]),
      updateInvestment: jest.fn(async () => {}),
    };
    Growth.initGrowth(state, api);

    await Growth.refreshStockPrices();

    expect(api.fetchBatchQuotes).toHaveBeenCalledWith(['SHOP.TO', 'AAPL']);
    expect(api.fetchExchangeRate).toHaveBeenCalledWith('USD', 'CAD');
    expect(state.investments[0]).toMatchObject({ current_price: 110, currency: 'CAD', exchange_rate_to_cad: 1 });
    expect(state.investments[1]).toMatchObject({ current_price: 220, currency: 'USD', exchange_rate_to_cad: 1.37 });
    expect(api.updateInvestment).toHaveBeenCalledTimes(2);
  });
});

describe('investment currency UI and validation', () => {
  test('investment modal offers explicit CAD/USD selection', () => {
    const { getModalConfig } = require('../src/renderer/js/components/modal.js');
    const { html } = getModalConfig('inv', { symbol: 'AAPL', currency: 'USD' });
    expect(html).toContain('id="m-currency"');
    expect(html).toContain('<option value="USD" selected>USD</option>');
  });
});
