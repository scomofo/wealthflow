// Regression coverage for finding M6: most mutating IPC channels
// (db:*:add/update/upsert/delete and friends) passed the renderer's raw
// payload straight to a database method with no validation at all — unlike
// db:transactions:add and db:settings:update, which already called the
// existing validate() helper. A malformed payload (null, a string where an
// object was expected, a missing id) would reach database.js unchecked,
// surfacing as a confusing downstream crash instead of a clear IPC error.
//
// This drives registerIpcHandlers() end-to-end with a mocked electron and a
// stubbed database, capturing the real ipcMain.handle registrations, then
// invokes a representative cross-section of the newly-validated channels
// (spanning object-add, object-update, id-delete, and two-arg shapes across
// several different DB entities) with invalid input.
jest.mock('electron', () => ({
  ipcMain: { handle: jest.fn(), on: jest.fn() },
  BrowserWindow: { fromWebContents: jest.fn() },
  dialog: {},
  app: { getPath: jest.fn(() => '/tmp/wealthflow-test') },
  shell: {},
  Notification: { isSupported: jest.fn(() => false) },
  nativeTheme: { shouldUseDarkColors: false },
}));

function makeStubDatabase() {
  const db = {};
  const methods = [
    'addBudget', 'updateBudget', 'deleteBudget',
    'addGoal', 'updateGoal', 'deleteGoal',
    'addDebt', 'updateDebt', 'deleteDebt',
    'addInvestment', 'updateInvestment', 'deleteInvestment',
    'addBill', 'updateBill', 'deleteBill',
    'updateChallenge', 'updateEducation',
    'upsertContributionRoom', 'deleteContributionRoom',
    'addContribution', 'deleteContribution',
    'addRESPBeneficiary', 'updateRESPBeneficiary', 'deleteRESPBeneficiary',
    'addGIC', 'deleteGIC',
    'addRecurringLog', 'addImportHistory',
    'updateAdvisorPersonal', 'updateAdvisorEmployment', 'updateAdvisorRisk',
    'updateAdvisorRegistered', 'updateAdvisorInsurance',
    'upsertAdvisorGoal', 'deleteAdvisorGoal',
    'addAdvisorAsset', 'updateAdvisorAsset', 'deleteAdvisorAsset',
    'addAdvisorDocument', 'deleteAdvisorDocument',
    'addCommunityPost', 'addUndoEntry', 'deleteUndoEntry',
    'saveMonthlyReport', 'addRecommendedAction', 'completeRecommendedAction',
    'deleteRecommendedAction', 'completeNextBestAction', 'dismissNextBestAction',
    'snoozeNextBestAction', 'updateTransaction',
    // read-only / other methods called during setup or by unrelated handlers
    'getSettings', 'listTransactions', 'listBudgets', 'listGoals', 'listDebts',
    'listInvestments', 'listBills', 'listChallenges', 'listCommunityPosts',
    'listEducation', 'listContributionRoom', 'listContributions',
    'listRESPBeneficiaries', 'listGICs', 'computeFinancials', 'getCounts',
    'listRecurringLog', 'listNetWorthHistory', 'listImportHistory',
    'getAdvisorPersonal', 'getAdvisorEmployment', 'getAdvisorRisk',
    'getAdvisorRegistered', 'getAdvisorInsurance', 'listAdvisorGoals',
    'listAdvisorAssets', 'listAdvisorDocuments', 'getAdvisorProfile',
    'getPrincipalResidence', 'listMonthlyReports', 'getLastUndoEntries',
    'listRecommendedActions', 'listNextBestActions',
    'getPersonalizationProfile', 'updatePersonalizationProfile',
  ];
  for (const m of methods) db[m] = jest.fn();
  db.getSettings.mockReturnValue({});
  return db;
}

const { ipcMain } = require('electron');
const { registerIpcHandlers } = require('../src/main/ipc-handlers.js');

describe('mutating IPC channels validate their input', () => {
  let handlers;
  let database;

  beforeAll(() => {
    database = makeStubDatabase();
    registerIpcHandlers(database, {});
    handlers = new Map(ipcMain.handle.mock.calls.map(([channel, fn]) => [channel, fn]));
  });

  test.each([
    ['db:budgets:add', 'addBudget'],
    ['db:goals:add', 'addGoal'],
    ['db:debts:update', 'updateDebt'],
    ['db:investments:add', 'addInvestment'],
    ['db:bills:update', 'updateBill'],
    ['db:resp-beneficiaries:add', 'addRESPBeneficiary'],
    ['db:advisor:personal:update', 'updateAdvisorPersonal'],
  ])('%s rejects a null payload and does not reach the database', async (channel, dbMethod) => {
    const handler = handlers.get(channel);
    expect(handler).toBeDefined();
    await expect(handler({}, null)).rejects.toThrow();
    expect(database[dbMethod]).not.toHaveBeenCalled();
  });

  test.each([
    ['db:budgets:delete', 'deleteBudget'],
    ['db:goals:delete', 'deleteGoal'],
    ['db:investments:delete', 'deleteInvestment'],
    ['db:gics:delete', 'deleteGIC'],
    ['actions:complete-next-best', 'completeNextBestAction'],
  ])('%s rejects an empty-string id and does not reach the database', async (channel, dbMethod) => {
    const handler = handlers.get(channel);
    await expect(handler({}, '')).rejects.toThrow();
    expect(database[dbMethod]).not.toHaveBeenCalled();
  });

  test('a valid payload still reaches the database normally', async () => {
    const handler = handlers.get('db:budgets:add');
    await handler({}, { id: 'b1', category: 'Food', amount: 500 });
    expect(database.addBudget).toHaveBeenCalledWith({ id: 'b1', category: 'Food', amount: 500 });
  });

  test('a valid id still reaches the database normally', async () => {
    const handler = handlers.get('db:goals:delete');
    await handler({}, 'g1');
    expect(database.deleteGoal).toHaveBeenCalledWith('g1');
  });
});
