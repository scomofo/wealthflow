const fs = require('fs');
const os = require('os');
const path = require('path');

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wealthflow-db-'));
process.resourcesPath = tempRoot;

jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => tempRoot),
  },
  safeStorage: {
    isEncryptionAvailable: jest.fn(() => false),
  },
}));

const { WealthFlowDatabase } = require('../src/main/database.js');

describe('WealthFlowDatabase onboarding settings', () => {
  let database;

  beforeEach(async () => {
    const dbPath = path.join(tempRoot, 'wealthflow.db');
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    database = new WealthFlowDatabase();
    await database.init();
  });

  afterEach(() => {
    if (database) database.close();
  });

  test('persists first-run financial fields from onboarding', () => {
    database.updateSettings({
      monthly_income: 5000,
      monthly_expenses: 3200,
      total_debt: 12000,
      savings_buffer: 1500,
      first_action_completed: true,
    });

    const settings = database.getSettings();

    expect(settings.monthly_income).toBe(5000);
    expect(settings.monthly_expenses).toBe(3200);
    expect(settings.total_debt).toBe(12000);
    expect(settings.savings_buffer).toBe(1500);
    expect(settings.first_action_completed).toBe(true);
  });

  test('uses onboarding financial fields as computeFinancials fallback', () => {
    database.updateSettings({
      monthly_income: 5000,
      monthly_expenses: 3200,
      total_debt: 12000,
      savings_buffer: 1500,
    });

    const financials = database.computeFinancials();

    expect(financials.income).toBe(5000);
    expect(financials.expenses).toBe(3200);
    expect(financials.totalDebt).toBe(12000);
    expect(financials.totalSaved).toBe(1500);
    expect(financials.savingsRate).toBe(36);
  });
});
