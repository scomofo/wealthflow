// Regression coverage for two next_best_actions bugs found in review:
// - upsertNextBestAction matched an existing row by action_key regardless
//   of status, so a completed action's status was never reset back to
//   'open' on the next upsert — once the recurring condition reappeared
//   past the 7-day suppression window, it silently never resurfaced.
// - clearStaleNextBestActions([]) (no active candidates this run, e.g.
//   every issue got resolved) early-returned instead of clearing every
//   still-open action, so stale actions could never be cleared once the
//   rule that generated them stopped firing.
const fs = require('fs');
const os = require('os');
const path = require('path');

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wealthflow-nba-'));
process.resourcesPath = tempRoot;

jest.mock('electron', () => ({
  app: { getPath: jest.fn(() => tempRoot) },
  safeStorage: { isEncryptionAvailable: jest.fn(() => false) },
}));

const { WealthFlowDatabase } = require('../src/main/database.js');

function flushPendingSave(database) {
  if (database._saveTimer) {
    clearTimeout(database._saveTimer);
    database._saveTimer = null;
  }
}

function baseAction(overrides = {}) {
  return {
    id: 'a1',
    action_key: 'budget_overrun_Food',
    title: 'You are over budget on Food',
    priority: 'high',
    score: 75,
    ...overrides,
  };
}

describe('WealthFlowDatabase next-best-actions upsert/stale-clear', () => {
  let database;

  beforeEach(async () => {
    const dbPath = path.join(tempRoot, 'wealthflow.db');
    for (const p of [dbPath, dbPath + '.bak', dbPath + '.tmp']) {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
    database = new WealthFlowDatabase();
    await database.init();
    flushPendingSave(database);
  });

  afterEach(() => {
    if (database) database.close();
  });

  test('a completed action resurfaces to open when its condition recurs', () => {
    database.upsertNextBestAction(baseAction());
    database.completeNextBestAction('a1');
    flushPendingSave(database);

    expect(database.listNextBestActions('open').length).toBe(0);
    expect(database.listNextBestActions('done').length).toBe(1);

    // The rule fires again (same action_key) on a later generateActions() run.
    database.upsertNextBestAction(baseAction({ score: 80 }));
    flushPendingSave(database);

    const open = database.listNextBestActions('open');
    expect(open.length).toBe(1);
    expect(open[0].id).toBe('a1');
    expect(open[0].score).toBe(80);

    const row = database.getOne('SELECT completed_at FROM next_best_actions WHERE id = ?', ['a1']);
    expect(row.completed_at).toBeNull();
  });

  test('a dismissed action does not resurface — dismissing is a deliberate "don\'t show again"', () => {
    database.upsertNextBestAction(baseAction());
    database.dismissNextBestAction('a1');
    flushPendingSave(database);

    database.upsertNextBestAction(baseAction({ score: 80 }));
    flushPendingSave(database);

    expect(database.listNextBestActions('open').length).toBe(0);
    expect(database.listNextBestActions('dismissed').length).toBe(1);
  });

  test('a snoozed action is left snoozed by a re-upsert, not forced back open early', () => {
    database.upsertNextBestAction(baseAction());
    database.snoozeNextBestAction('a1', '2099-01-01');
    flushPendingSave(database);

    database.upsertNextBestAction(baseAction({ score: 80 }));
    flushPendingSave(database);

    expect(database.listNextBestActions('open').length).toBe(0);
    expect(database.listNextBestActions('snoozed').length).toBe(1);
  });

  test('clearStaleNextBestActions([]) clears every open action when no rule fired this run', () => {
    database.upsertNextBestAction(baseAction({ id: 'a1', action_key: 'k1' }));
    database.upsertNextBestAction(baseAction({ id: 'a2', action_key: 'k2' }));
    flushPendingSave(database);
    expect(database.listNextBestActions('open').length).toBe(2);

    database.clearStaleNextBestActions([]);
    flushPendingSave(database);

    expect(database.listNextBestActions('open').length).toBe(0);
  });

  test('clearStaleNextBestActions still only clears actions whose key is no longer active', () => {
    database.upsertNextBestAction(baseAction({ id: 'a1', action_key: 'k1' }));
    database.upsertNextBestAction(baseAction({ id: 'a2', action_key: 'k2' }));
    flushPendingSave(database);

    database.clearStaleNextBestActions(['k1']);
    flushPendingSave(database);

    const open = database.listNextBestActions('open');
    expect(open.length).toBe(1);
    expect(open[0].action_key).toBe('k1');
  });
});
