const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DEVICE_STATE_VERSION = 1;
const STALE_AFTER_DAYS = 30;

function nowIso(now = new Date()) {
  return new Date(now).toISOString();
}

function writeAtomic(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temp = filePath + '.tmp';
  fs.writeFileSync(temp, JSON.stringify(value, null, 2), 'utf8');
  const fd = fs.openSync(temp, 'r');
  try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  fs.renameSync(temp, filePath);
}

class SyncDeviceRegistry {
  constructor({ rootDir, deviceName = 'This computer' }) {
    this.path = path.join(rootDir, 'sync-devices.json');
    this.deviceName = deviceName;
  }

  read() {
    if (!fs.existsSync(this.path)) {
      const id = crypto.randomUUID();
      return { version: DEVICE_STATE_VERSION, localDeviceId: id, devices: [{ id, name: this.deviceName, firstSeenAt: null, lastSeenAt: null, lastSyncAt: null, removedAt: null }] };
    }
    const data = JSON.parse(fs.readFileSync(this.path, 'utf8'));
    if (data.version !== DEVICE_STATE_VERSION || !data.localDeviceId || !Array.isArray(data.devices)) {
      throw new Error('Sync device state is invalid.');
    }
    return data;
  }

  ensureLocal(now = new Date()) {
    const data = this.read();
    let local = data.devices.find((d) => d.id === data.localDeviceId);
    if (!local) {
      local = { id: data.localDeviceId, name: this.deviceName, firstSeenAt: nowIso(now), lastSeenAt: nowIso(now), lastSyncAt: null, removedAt: null };
      data.devices.push(local);
    } else {
      local.name = local.name || this.deviceName;
      local.firstSeenAt ||= nowIso(now);
      local.lastSeenAt = nowIso(now);
      local.removedAt = null;
    }
    writeAtomic(this.path, data);
    return local;
  }

  recordSeen(device, now = new Date()) {
    if (!device?.id || typeof device.id !== 'string') throw new Error('Device id is required.');
    const data = this.read();
    const existing = data.devices.find((d) => d.id === device.id);
    const next = {
      id: device.id,
      name: String(device.name || 'Unknown device').slice(0, 80),
      firstSeenAt: existing?.firstSeenAt || nowIso(now),
      lastSeenAt: nowIso(now),
      lastSyncAt: device.lastSyncAt || existing?.lastSyncAt || null,
      removedAt: null,
    };
    if (existing) Object.assign(existing, next); else data.devices.push(next);
    writeAtomic(this.path, data);
    return next;
  }

  recordSync(deviceId, now = new Date()) {
    const data = this.read();
    const device = data.devices.find((d) => d.id === deviceId);
    if (!device) throw new Error('Unknown sync device.');
    device.lastSeenAt = nowIso(now);
    device.lastSyncAt = nowIso(now);
    device.removedAt = null;
    writeAtomic(this.path, data);
    return device;
  }

  remove(deviceId, now = new Date()) {
    const data = this.read();
    if (deviceId === data.localDeviceId) throw new Error('This computer cannot remove itself.');
    const device = data.devices.find((d) => d.id === deviceId);
    if (!device) return false;
    device.removedAt = nowIso(now);
    writeAtomic(this.path, data);
    return true;
  }

  list(now = new Date()) {
    const data = this.read();
    const current = new Date(now).getTime();
    return data.devices.filter((d) => !d.removedAt).map((device) => {
      const last = device.lastSyncAt || device.lastSeenAt || device.firstSeenAt;
      const ageDays = last ? Math.floor((current - new Date(last).getTime()) / 86400000) : null;
      return {
        ...device,
        isLocal: device.id === data.localDeviceId,
        stale: ageDays !== null && ageDays >= STALE_AFTER_DAYS,
        ageDays,
      };
    });
  }
}

module.exports = { SyncDeviceRegistry, STALE_AFTER_DAYS, DEVICE_STATE_VERSION };
