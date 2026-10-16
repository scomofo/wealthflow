const fs = require('fs');
const os = require('os');
const path = require('path');
const { SyncDeviceRegistry } = require('../src/main/sync-devices');

describe('sync device registry', () => {
  let root;
  beforeEach(() => { root = fs.mkdtempSync(path.join(os.tmpdir(), 'wealthflow-devices-')); });
  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  test('creates and persists a stable local device identity', () => {
    const registry = new SyncDeviceRegistry({ rootDir: root, deviceName: 'Office PC' });
    const one = registry.ensureLocal(new Date('2026-10-01T00:00:00Z'));
    const two = registry.ensureLocal(new Date('2026-10-02T00:00:00Z'));
    expect(two.id).toBe(one.id);
    expect(registry.list(new Date('2026-10-02T00:00:00Z'))[0]).toMatchObject({ name: 'Office PC', isLocal: true, stale: false });
  });

  test('tracks remote devices and last successful sync', () => {
    const registry = new SyncDeviceRegistry({ rootDir: root });
    registry.ensureLocal();
    registry.recordSeen({ id: 'laptop-1', name: 'Laptop' }, new Date('2026-09-01T00:00:00Z'));
    registry.recordSync('laptop-1', new Date('2026-09-05T00:00:00Z'));
    const laptop = registry.list(new Date('2026-09-06T00:00:00Z')).find((d) => d.id === 'laptop-1');
    expect(laptop.lastSyncAt).toBe('2026-09-05T00:00:00.000Z');
  });

  test('marks devices stale after 30 days', () => {
    const registry = new SyncDeviceRegistry({ rootDir: root });
    registry.ensureLocal(new Date('2026-08-01T00:00:00Z'));
    registry.recordSeen({ id: 'old', name: 'Old laptop' }, new Date('2026-08-01T00:00:00Z'));
    expect(registry.list(new Date('2026-09-01T00:00:00Z')).find((d) => d.id === 'old').stale).toBe(true);
  });

  test('removes remote devices without deleting their historical record', () => {
    const registry = new SyncDeviceRegistry({ rootDir: root });
    registry.ensureLocal();
    registry.recordSeen({ id: 'tablet', name: 'Tablet' });
    expect(registry.remove('tablet')).toBe(true);
    expect(registry.list().some((d) => d.id === 'tablet')).toBe(false);
    expect(JSON.parse(fs.readFileSync(path.join(root, 'sync-devices.json'), 'utf8')).devices.find((d) => d.id === 'tablet').removedAt).toBeTruthy();
  });

  test('does not allow the local device to remove itself', () => {
    const registry = new SyncDeviceRegistry({ rootDir: root });
    const local = registry.ensureLocal();
    expect(() => registry.remove(local.id)).toThrow(/cannot remove itself/i);
  });
});
