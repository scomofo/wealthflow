const fs = require('fs');
const os = require('os');
const path = require('path');

const { LocalSyncJournal } = require('../src/main/sync-journal');
const { hashSnapshot } = require('../src/main/sync-protocol');

describe('LocalSyncJournal', () => {
  let root;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'wealthflow-sync-journal-'));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  test('records committed snapshot lineage and ignores identical snapshots', () => {
    const journal = new LocalSyncJournal({ rootDir: root, deviceId: 'desktop-1' });
    const firstSnapshot = { transactions: [{ id: 'a', amount: 10 }] };
    const secondSnapshot = { transactions: [{ id: 'a', amount: 15 }] };

    const first = journal.recordCommittedSnapshot(firstSnapshot, {
      createdAt: '2026-10-16T12:00:00Z',
    });
    expect(first.revision).toBe(0);
    expect(first.parentHash).toBeNull();

    const same = journal.recordCommittedSnapshot(firstSnapshot, {
      createdAt: '2026-10-16T12:05:00Z',
    });
    expect(same).toEqual(first);

    const second = journal.recordCommittedSnapshot(secondSnapshot, {
      createdAt: '2026-10-16T12:10:00Z',
    });
    expect(second.revision).toBe(1);
    expect(second.parentHash).toBe(first.snapshotHash);

    const persisted = journal.readJournal();
    expect(persisted.entries).toHaveLength(2);
    expect(persisted.latest).toEqual(second);
  });

  test('creates a retryable pending upload package without mutating journal history', () => {
    const journal = new LocalSyncJournal({ rootDir: root, deviceId: 'desktop-1' });
    const snapshot = { goals: [{ id: 'g1', current: 500 }] };

    const manifest = journal.recordCommittedSnapshot(snapshot);
    const before = journal.readJournal();

    const pending = journal.createPendingUpload(snapshot);
    expect(pending.manifest.snapshotHash).toBe(manifest.snapshotHash);
    expect(journal.readPendingUpload().snapshot).toEqual(snapshot);
    expect(journal.readJournal()).toEqual(before);
  });

  test('rejects pending upload creation for data that does not match committed state', () => {
    const journal = new LocalSyncJournal({ rootDir: root, deviceId: 'desktop-1' });
    journal.recordCommittedSnapshot({ debts: [{ id: 'd1', balance: 1000 }] });

    expect(() => journal.createPendingUpload({
      debts: [{ id: 'd1', balance: 900 }],
    })).toThrow('snapshot does not match latest committed journal entry');
  });

  test('leaves pending package intact until upload acknowledgement matches its hash', () => {
    const journal = new LocalSyncJournal({ rootDir: root, deviceId: 'desktop-1' });
    const snapshot = { settings: { province: 'AB' } };
    const manifest = journal.recordCommittedSnapshot(snapshot);
    journal.createPendingUpload(snapshot);

    expect(() => journal.markUploadComplete('wrong-hash'))
      .toThrow('upload completion hash does not match pending package');
    expect(journal.readPendingUpload()).not.toBeNull();

    expect(journal.markUploadComplete(manifest.snapshotHash)).toBe(true);
    expect(journal.readPendingUpload()).toBeNull();
    expect(journal.markUploadComplete(manifest.snapshotHash)).toBe(false);
  });

  test('detects tampering or partial-write corruption in pending package', () => {
    const journal = new LocalSyncJournal({ rootDir: root, deviceId: 'desktop-1' });
    const snapshot = { investments: [{ id: 'i1', shares: 2 }] };
    journal.recordCommittedSnapshot(snapshot);
    journal.createPendingUpload(snapshot);

    const pendingPath = path.join(root, 'pending-upload.json');
    const parsed = JSON.parse(fs.readFileSync(pendingPath, 'utf8'));
    parsed.snapshot.investments[0].shares = 200;
    fs.writeFileSync(pendingPath, JSON.stringify(parsed));

    expect(() => journal.readPendingUpload())
      .toThrow('pending upload snapshot hash does not match manifest');
  });

  test('a failed atomic rename does not replace the existing journal', () => {
    const journal = new LocalSyncJournal({ rootDir: root, deviceId: 'desktop-1' });
    const firstSnapshot = { transactions: [{ id: 'a', amount: 10 }] };
    journal.recordCommittedSnapshot(firstSnapshot);
    const beforeBytes = fs.readFileSync(path.join(root, 'sync-journal.json'));

    const renameSpy = jest.spyOn(fs, 'renameSync').mockImplementation(() => {
      throw new Error('simulated rename failure');
    });

    expect(() => journal.recordCommittedSnapshot({
      transactions: [{ id: 'a', amount: 20 }],
    })).toThrow('simulated rename failure');

    renameSpy.mockRestore();

    const afterBytes = fs.readFileSync(path.join(root, 'sync-journal.json'));
    expect(afterBytes.equals(beforeBytes)).toBe(true);
    expect(hashSnapshot(firstSnapshot)).toBe(journal.readJournal().latest.snapshotHash);
  });
});
