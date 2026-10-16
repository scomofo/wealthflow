const {
  SYNC_PROTOCOL_VERSION,
  hashSnapshot,
  createSyncManifest,
  validateSyncManifest,
  compareSyncManifests,
} = require('../src/main/sync-protocol');

describe('sync protocol', () => {
  const hashA = hashSnapshot({ transactions: [{ id: 'a', amount: 10 }] });
  const hashB = hashSnapshot({ transactions: [{ id: 'a', amount: 20 }] });
  const hashC = hashSnapshot({ transactions: [{ id: 'a', amount: 30 }] });

  test('hashSnapshot is deterministic', () => {
    expect(hashSnapshot({ a: 1 })).toBe(hashSnapshot({ a: 1 }));
    expect(hashSnapshot({ a: 1 })).not.toBe(hashSnapshot({ a: 2 }));
  });

  test('creates a normalized versioned manifest', () => {
    const manifest = createSyncManifest({
      deviceId: ' laptop ',
      revision: 0,
      snapshotHash: hashA,
      createdAt: '2026-10-15T12:00:00-06:00',
    });

    expect(manifest).toEqual({
      protocolVersion: SYNC_PROTOCOL_VERSION,
      deviceId: 'laptop',
      revision: 0,
      snapshotHash: hashA,
      parentHash: null,
      createdAt: '2026-10-15T18:00:00.000Z',
    });
  });

  test('rejects malformed or unsupported manifests', () => {
    expect(() => validateSyncManifest(null)).toThrow('manifest must be an object');
    expect(() => validateSyncManifest({
      protocolVersion: 99,
      deviceId: 'desktop',
      revision: 0,
      snapshotHash: hashA,
      parentHash: null,
      createdAt: '2026-10-15T18:00:00.000Z',
    })).toThrow('unsupported sync protocol version');

    expect(() => createSyncManifest({
      deviceId: 'desktop',
      revision: 1,
      snapshotHash: hashB,
      parentHash: null,
    })).toThrow('revision > 0 requires a parentHash');
  });

  test('returns same for identical snapshots even across devices', () => {
    const local = createSyncManifest({
      deviceId: 'desktop',
      revision: 2,
      snapshotHash: hashB,
      parentHash: hashA,
    });
    const remote = createSyncManifest({
      deviceId: 'laptop',
      revision: 2,
      snapshotHash: hashB,
      parentHash: hashA,
    });

    expect(compareSyncManifests(local, remote).action).toBe('same');
  });

  test('downloads only when remote is the direct descendant', () => {
    const local = createSyncManifest({
      deviceId: 'desktop',
      revision: 1,
      snapshotHash: hashA,
      parentHash: hashSnapshot({ seed: true }),
    });
    const remote = createSyncManifest({
      deviceId: 'laptop',
      revision: 2,
      snapshotHash: hashB,
      parentHash: hashA,
    });

    expect(compareSyncManifests(local, remote).action).toBe('download');
  });

  test('uploads only when local is the direct descendant', () => {
    const remote = createSyncManifest({
      deviceId: 'laptop',
      revision: 1,
      snapshotHash: hashA,
      parentHash: hashSnapshot({ seed: true }),
    });
    const local = createSyncManifest({
      deviceId: 'desktop',
      revision: 2,
      snapshotHash: hashB,
      parentHash: hashA,
    });

    expect(compareSyncManifests(local, remote).action).toBe('upload');
  });

  test('fails closed on divergent same-revision snapshots', () => {
    const local = createSyncManifest({
      deviceId: 'desktop',
      revision: 2,
      snapshotHash: hashB,
      parentHash: hashA,
    });
    const remote = createSyncManifest({
      deviceId: 'laptop',
      revision: 2,
      snapshotHash: hashC,
      parentHash: hashA,
    });

    expect(compareSyncManifests(local, remote)).toEqual({
      action: 'conflict',
      reason: 'Snapshot lineage is ambiguous or divergent; manual resolution is required.',
    });
  });

  test('fails closed when a revision gap cannot prove ancestry', () => {
    const local = createSyncManifest({
      deviceId: 'desktop',
      revision: 1,
      snapshotHash: hashA,
      parentHash: hashSnapshot({ seed: true }),
    });
    const remote = createSyncManifest({
      deviceId: 'laptop',
      revision: 3,
      snapshotHash: hashC,
      parentHash: hashB,
    });

    expect(compareSyncManifests(local, remote).action).toBe('conflict');
  });
});
