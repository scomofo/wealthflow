const fs = require('fs');
const os = require('os');
const path = require('path');

const { LocalSyncJournal } = require('../src/main/sync-journal');
const { compareSyncManifests } = require('../src/main/sync-protocol');
const { encryptSyncPackage, decryptSyncPackage } = require('../src/main/sync-crypto');
const { HttpsSyncTransport } = require('../src/main/sync-transport');
const { SyncDeviceRegistry } = require('../src/main/sync-devices');

function tempRoot(label) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `wealthflow-${label}-`));
}

describe('sync recovery drills', () => {
  const passphrase = 'recovery drill passphrase 2026';
  const roots = [];
  afterEach(() => {
    for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
  });

  test('two devices edited offline become an explicit conflict', () => {
    const rootA = tempRoot('device-a'); roots.push(rootA);
    const rootB = tempRoot('device-b'); roots.push(rootB);
    const a = new LocalSyncJournal({ rootDir: rootA, deviceId: 'A' });
    const b = new LocalSyncJournal({ rootDir: rootB, deviceId: 'B' });

    const seed = { transactions: [{ id: 't1', amount: -10 }] };
    const seedA = a.recordCommittedSnapshot(seed);
    fs.writeFileSync(path.join(rootB, 'sync-journal.json'), JSON.stringify({
      version: 1, deviceId: 'B',
      latest: { ...seedA, deviceId: 'B' },
      entries: [{ ...seedA, deviceId: 'B' }],
    }));

    const localA = a.recordCommittedSnapshot({ transactions: [{ id: 't1', amount: -11 }] });
    const localB = b.recordCommittedSnapshot({ transactions: [{ id: 't1', amount: -12 }] });

    expect(compareSyncManifests(localA, localB).action).toBe('conflict');
  });

  test('stale remote ancestry never authorizes a blind overwrite across a revision gap', () => {
    const root = tempRoot('stale'); roots.push(root);
    const journal = new LocalSyncJournal({ rootDir: root, deviceId: 'A' });
    const r0 = journal.recordCommittedSnapshot({ value: 0 });
    journal.recordCommittedSnapshot({ value: 1 });
    const r2 = journal.recordCommittedSnapshot({ value: 2 });
    const stale = { ...r0, deviceId: 'B' };

    expect(compareSyncManifests(r2, stale).action).toBe('conflict');
  });

  test('interrupted upload leaves exact pending data available for retry', async () => {
    const root = tempRoot('retry'); roots.push(root);
    const journal = new LocalSyncJournal({ rootDir: root, deviceId: 'A' });
    const snapshot = { goals: [{ id: 'g1', current: 300 }] };
    journal.recordCommittedSnapshot(snapshot);
    const pending = journal.createPendingUpload(snapshot);
    const envelope = encryptSyncPackage(pending, passphrase);

    const transport = new HttpsSyncTransport({
      endpoint: 'https://sync.example.test/wealthflow.json',
      fetchImpl: jest.fn().mockRejectedValue(new Error('connection dropped')),
    });

    await expect(transport.write(envelope, { createOnly: true })).rejects.toThrow(/could not upload/i);
    expect(journal.readPendingUpload()).toEqual(pending);
  });

  test('corrupt encrypted remote copy is rejected before restore data is returned', () => {
    const envelope = encryptSyncPackage({ snapshot: { value: 1 } }, passphrase);
    const bytes = Buffer.from(envelope.ciphertext, 'base64');
    bytes[Math.max(0, bytes.length - 1)] ^= 1;
    envelope.ciphertext = bytes.toString('base64');

    expect(() => decryptSyncPackage(envelope, passphrase)).toThrow(/modified|wrong/i);
  });

  test('removed device stays excluded after registry reload', () => {
    const root = tempRoot('devices'); roots.push(root);
    const registry = new SyncDeviceRegistry({ rootDir: root });
    registry.ensureLocal();
    registry.recordSeen({ id: 'retired-laptop', name: 'Retired laptop' });
    registry.remove('retired-laptop');

    const reloaded = new SyncDeviceRegistry({ rootDir: root });
    expect(reloaded.list().some((device) => device.id === 'retired-laptop')).toBe(false);
  });

  test('reinstall can rebuild sync lineage from a verified decrypted package without touching old files', () => {
    const sourceRoot = tempRoot('source'); roots.push(sourceRoot);
    const newRoot = tempRoot('reinstall'); roots.push(newRoot);
    const source = new LocalSyncJournal({ rootDir: sourceRoot, deviceId: 'A' });
    const snapshot = { budgets: [{ id: 'b1', limit: 500 }] };
    source.recordCommittedSnapshot(snapshot);
    const pending = source.createPendingUpload(snapshot);
    const envelope = encryptSyncPackage(pending, passphrase);

    const restoredPackage = decryptSyncPackage(envelope, passphrase);
    const installed = new LocalSyncJournal({ rootDir: newRoot, deviceId: 'NEW' });
    const manifest = installed.recordCommittedSnapshot(restoredPackage.snapshot);

    expect(manifest.snapshotHash).toBe(restoredPackage.manifest.snapshotHash);
    expect(fs.existsSync(path.join(sourceRoot, 'sync-journal.json'))).toBe(true);
    expect(fs.existsSync(path.join(newRoot, 'sync-journal.json'))).toBe(true);
  });
});
