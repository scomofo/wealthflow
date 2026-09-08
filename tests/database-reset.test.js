const fs = require('fs');
const os = require('os');
const path = require('path');

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wealthflow-reset-'));
process.resourcesPath = tempRoot;

jest.mock('electron', () => ({
  app: { getPath: jest.fn(() => tempRoot) },
  safeStorage: { isEncryptionAvailable: jest.fn(() => false) },
}));

const { WealthFlowDatabase } = require('../src/main/database.js');
const { DEFAULT_AI_MODEL } = require('../src/main/constants.js');

describe('WealthFlowDatabase resetAllData', () => {
  let database;
  const dbPath = path.join(tempRoot, 'wealthflow.db');
  const docsPath = path.join(tempRoot, 'documents');

  beforeEach(async () => {
    for (const p of [dbPath, dbPath + '.bak', dbPath + '.tmp']) {
      if (fs.existsSync(p)) fs.rmSync(p, { force: true });
    }
    fs.rmSync(docsPath, { recursive: true, force: true });
    database = new WealthFlowDatabase();
    await database.init();
  });

  afterEach(() => {
    if (database?.db) database.close();
  });

  test('clears financial, profile, action and document data and restores settings defaults', () => {
    database.addTransaction({
      id: 'tx1', description: 'Private purchase', amount: -100,
      category: 'Shopping', date: '2026-09-01',
    });
    database.addBudget({ id: 'b1', category: 'Shopping', amount: 500 });
    database.addGoal({ id: 'g1', name: 'Private goal', target: 1000, current: 100 });
    database.updateSettings({ user_name: 'Private Name', ai_api_key: 'secret-key', onboarded: true });
    database.updateAdvisorPersonal({ full_name: 'Private Name', province: 'AB' });
    database.addRecommendedAction({ id: 'ra1', workflow_type: 'monthly_action_planner', title: 'Private action' });
    database.upsertNextBestAction({
      id: 'nba1', action_key: 'private_action', title: 'Private NBA',
      description: 'private', rationale: 'private', category: 'planning',
      score: 50, priority: 'medium', source_type: 'rule',
    });
    database.addAdvisorDocument({
      id: 'doc1', filename: 'private.txt', original_name: 'private.txt', file_size: 7,
    });
    fs.mkdirSync(docsPath, { recursive: true });
    fs.writeFileSync(path.join(docsPath, 'private.txt'), 'private');

    expect(database.resetAllData()).toBe(true);

    expect(database.listTransactions()).toEqual([]);
    expect(database.listBudgets()).toEqual([]);
    expect(database.listGoals()).toEqual([]);
    expect(database.listRecommendedActions()).toEqual([]);
    expect(database.listNextBestActions()).toEqual([]);
    expect(database.listAdvisorDocuments()).toEqual([]);
    expect(fs.existsSync(docsPath)).toBe(false);

    const settings = database.getSettings();
    expect(settings.user_name).toBe('');
    expect(settings.ai_api_key).toBe('');
    expect(settings.ai_model).toBe(DEFAULT_AI_MODEL);
    expect(settings.onboarded).toBe(false);
    expect(settings.personalization_profile).toBe('{}');
    expect(database.getAdvisorPersonal().full_name).toBe('');
    expect(database.getPrincipalResidence().address).toBe('');
  });

  test('replaces the old recovery backup with the reset database', async () => {
    database.addTransaction({
      id: 'tx-secret', description: 'Should not survive reset', amount: -5,
      category: 'Other', date: '2026-09-01',
    });
    database.save();
    database.resetAllData();
    expect(fs.existsSync(dbPath + '.bak')).toBe(true);

    database.close();
    database = null;
    fs.writeFileSync(dbPath, Buffer.from('not a sqlite database'));

    const recovered = new WealthFlowDatabase();
    await recovered.init();
    try {
      expect(recovered.listTransactions()).toEqual([]);
      expect(recovered.getSettings().user_name).toBe('');
    } finally {
      recovered.close();
    }
  });
});

describe('reset-all wiring', () => {
  test('renderer invokes the real database reset instead of only resetting settings', () => {
    const home = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'js', 'handlers', 'home.js'), 'utf8');
    const ipc = fs.readFileSync(path.join(__dirname, '..', 'src', 'main', 'ipc-handlers.js'), 'utf8');
    const preload = fs.readFileSync(path.join(__dirname, '..', 'src', 'main', 'preload.js'), 'utf8');

    const start = home.indexOf("case 'reset-all'");
    const end = home.indexOf("case 'nav-to-advisor'", start);
    const resetBlock = home.slice(start, end);
    expect(resetBlock).toContain('State.resetAllData()');
    expect(resetBlock).not.toContain('State.updateSettings');
    expect(ipc).toContain("safeHandle('db:reset-all'");
    expect(preload).toContain("resetAllData: () => ipcRenderer.invoke('db:reset-all')");
  });
});
