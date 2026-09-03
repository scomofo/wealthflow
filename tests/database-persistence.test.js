// Verifies the atomic-save + backup-recovery behavior added to
// WealthFlowDatabase: save() must never leave a truncated/corrupt
// wealthflow.db behind, and init() must recover from `.bak` when the
// primary file is missing or corrupt.
const fs = require('fs');
const os = require('os');
const path = require('path');

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wealthflow-persist-'));
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

function flushPendingSave(database) {
  if (database._saveTimer) {
    clearTimeout(database._saveTimer);
    database._saveTimer = null;
  }
}

function dbFiles() {
  return {
    dbPath: path.join(tempRoot, 'wealthflow.db'),
    backupPath: path.join(tempRoot, 'wealthflow.db.bak'),
    tmpPath: path.join(tempRoot, 'wealthflow.db.tmp'),
  };
}

describe('WealthFlowDatabase atomic save + backup recovery', () => {
  let database;

  beforeEach(() => {
    const { dbPath, backupPath, tmpPath } = dbFiles();
    for (const p of [dbPath, backupPath, tmpPath]) {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
  });

  afterEach(() => {
    if (database) database.close();
    database = null;
  });

  test('save() writes the db file and never leaves a .tmp file behind', async () => {
    database = new WealthFlowDatabase();
    await database.init();
    flushPendingSave(database);

    const { dbPath, tmpPath } = dbFiles();
    expect(fs.existsSync(dbPath)).toBe(true);
    expect(fs.existsSync(tmpPath)).toBe(false);
  });

  test('init() saves the database exactly once, not twice', async () => {
    // save()'s atomic commit is the rename(tmpPath, dbPath) — counting
    // those is a direct proxy for how many times the whole (small but
    // non-trivial) database was actually written to disk. runMigrations()
    // and init() each used to call save() themselves, writing the
    // identical freshly-migrated database twice on every single startup.
    const renameSpy = jest.spyOn(fs, 'renameSync');
    database = new WealthFlowDatabase();
    await database.init();
    flushPendingSave(database);

    const commits = renameSpy.mock.calls.filter(([, dest]) => dest === dbFiles().dbPath);
    expect(commits.length).toBe(1);
    renameSpy.mockRestore();
  });

  test('save() backs up the prior state to .bak before overwriting the live file', async () => {
    database = new WealthFlowDatabase();
    await database.init();
    flushPendingSave(database);

    const { dbPath, backupPath } = dbFiles();
    const beforeGoal = fs.readFileSync(dbPath);

    database.addGoal({ id: 'g1', name: 'Emergency fund', target: 1000, current: 0 });
    flushPendingSave(database);
    database.save();

    expect(fs.existsSync(backupPath)).toBe(true);
    const backupBytes = fs.readFileSync(backupPath);
    const afterGoalBytes = fs.readFileSync(dbPath);

    expect(backupBytes.equals(beforeGoal)).toBe(true); // .bak = state before the goal was added
    expect(afterGoalBytes.equals(beforeGoal)).toBe(false); // live file = state after
  });

  test('init() recovers from .bak when the primary file is missing', async () => {
    database = new WealthFlowDatabase();
    await database.init();
    database.addGoal({ id: 'g1', name: 'Recovered goal', target: 500, current: 0 });
    flushPendingSave(database);
    database.save(); // now .bak holds the empty pre-goal db, dbPath holds the goal
    database.close();
    database = null;

    const { dbPath, backupPath } = dbFiles();
    // Simulate the primary file having been lost after a crash, leaving only
    // the backup from the save just before the crash.
    fs.copyFileSync(dbPath, backupPath);
    fs.unlinkSync(dbPath);

    const recovered = new WealthFlowDatabase();
    await recovered.init();
    flushPendingSave(recovered);

    const goals = recovered.listGoals();
    expect(goals.find((g) => g.id === 'g1')).toBeDefined();
    recovered.close();
  });

  test('init() recovers from .bak when the primary file is corrupt', async () => {
    database = new WealthFlowDatabase();
    await database.init();
    database.addGoal({ id: 'g1', name: 'Recovered goal', target: 500, current: 0 });
    flushPendingSave(database);
    database.save();
    database.close();
    database = null;

    const { dbPath, backupPath } = dbFiles();
    fs.copyFileSync(dbPath, backupPath);
    fs.writeFileSync(dbPath, Buffer.from('not a sqlite file, simulating a crash mid-write'));

    const recovered = new WealthFlowDatabase();
    await recovered.init();
    flushPendingSave(recovered);

    const goals = recovered.listGoals();
    expect(goals.find((g) => g.id === 'g1')).toBeDefined();
    recovered.close();
  });

  test('a failed save leaves the existing db file untouched and cleans up the .tmp file', async () => {
    database = new WealthFlowDatabase();
    await database.init();
    flushPendingSave(database);

    const { dbPath, tmpPath } = dbFiles();
    const beforeBytes = fs.readFileSync(dbPath);

    const renameSpy = jest.spyOn(fs, 'renameSync').mockImplementation(() => {
      throw new Error('simulated disk failure during rename');
    });

    expect(() => database.save()).toThrow('simulated disk failure during rename');
    renameSpy.mockRestore();

    // The live db file must be exactly what it was before the failed save,
    // and no partial .tmp file should be left on disk.
    expect(fs.readFileSync(dbPath).equals(beforeBytes)).toBe(true);
    expect(fs.existsSync(tmpPath)).toBe(false);
  });

  test('_deferSave() catches a failing save instead of crashing the process', async () => {
    database = new WealthFlowDatabase();
    await database.init();
    flushPendingSave(database);

    const saveSpy = jest.spyOn(database, 'save').mockImplementation(() => {
      throw new Error('simulated write failure');
    });

    expect(() => {
      database.run("UPDATE settings SET user_name = 'x' WHERE id = 1");
    }).not.toThrow();

    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(saveSpy).toHaveBeenCalled();
    saveSpy.mockRestore();
  });
});
