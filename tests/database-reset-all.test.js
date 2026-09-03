// Regression coverage for finding M12: the "Reset All Data" button's own
// copy said "This will permanently delete all your data and reset the
// app," but its handler only called updateSettings() with a handful of
// fields (name/theme/level/xp/province) — every transaction, budget, goal,
// debt, investment, bill, and advisor-profile field was left completely
// intact. resetAllData() actually clears every user-data table and resets
// settings/singleton profile tables to their fresh-install defaults.
const fs = require('fs');
const os = require('os');
const path = require('path');

let currentTempDir;
process.resourcesPath = os.tmpdir();

jest.mock('electron', () => ({
  app: { getPath: jest.fn(() => currentTempDir) },
  safeStorage: { isEncryptionAvailable: jest.fn(() => false) },
}));

const { WealthFlowDatabase } = require('../src/main/database.js');

function flushPendingSave(database) {
  if (database._saveTimer) {
    clearTimeout(database._saveTimer);
    database._saveTimer = null;
  }
}

describe('WealthFlowDatabase.resetAllData', () => {
  let db;

  beforeEach(async () => {
    currentTempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wealthflow-reset-'));
    db = new WealthFlowDatabase();
    await db.init();
  });

  afterEach(() => {
    flushPendingSave(db);
    db.close();
  });

  test('clears every user-data table', () => {
    db.addTransaction({ id: 't1', description: 'Test', amount: 100, category: 'Other', date: '2026-01-01' });
    db.addBudget({ id: 'b1', category: 'Food', amount: 500 });
    db.addGoal({ id: 'g1', name: 'Vacation', target: 5000 });
    db.addDebt({ id: 'd1', name: 'Visa', balance: 2000 });
    db.addInvestment({ id: 'i1', symbol: 'XEQT', shares: 10, current_price: 30 });
    db.addBill({ id: 'bill1', title: 'Rent', amount: 1500, type: 'expense', date: '2026-01-01', next_due_date: '2026-02-01' });
    db.updateAdvisorPersonal({ full_name: 'Alex Example' });

    db.resetAllData();

    expect(db.listTransactions()).toHaveLength(0);
    expect(db.listBudgets()).toHaveLength(0);
    expect(db.listGoals()).toHaveLength(0);
    expect(db.listDebts()).toHaveLength(0);
    expect(db.listInvestments()).toHaveLength(0);
    expect(db.listBills()).toHaveLength(0);
    expect(db.getAdvisorPersonal().full_name).toBe('');
  });

  test('resets settings to fresh-install defaults, not just a handful of fields', () => {
    db.updateSettings({
      user_name: 'Alex', dark_mode: false, onboarded: true, level: 5, xp: 900, province: 'BC',
      monthly_income: 8000, total_debt: 20000, ai_api_key: 'sk-ant-secret-key',
      profile_completed: true, bill_notify_days: 7,
    });

    db.resetAllData();

    const settings = db.getSettings();
    expect(settings.user_name).toBe('');
    expect(settings.onboarded).toBe(false);
    expect(settings.level).toBe(1);
    expect(settings.xp).toBe(0);
    expect(settings.province).toBe('ON');
    expect(settings.monthly_income).toBe(0);
    expect(settings.total_debt).toBe(0);
    expect(settings.ai_api_key).toBe('');
    expect(settings.profile_completed).toBe(false);
    expect(settings.bill_notify_days).toBe(3);
  });

  test('the settings row still exists after reset (updateSettings can still target id=1)', () => {
    db.resetAllData();
    expect(() => db.updateSettings({ user_name: 'Fresh Start' })).not.toThrow();
    expect(db.getSettings().user_name).toBe('Fresh Start');
  });

  test('singleton advisor profile rows still exist after reset (id=1 row was recreated, not left missing)', () => {
    db.resetAllData();
    expect(db.getAdvisorPersonal()).not.toBeNull();
    expect(db.getAdvisorEmployment()).not.toBeNull();
    expect(db.getPrincipalResidence()).not.toBeNull();
  });
});
