const path = require('path');
const { LocalSyncJournal } = require('./sync-journal');
const { SyncDeviceRegistry } = require('./sync-devices');
const { HttpsSyncTransport } = require('./sync-transport');
const { SyncEngine } = require('./sync-engine');
const { BackgroundSyncCoordinator } = require('./background-sync');

function readSyncRuntimeConfig(env = process.env) {
  const endpoint = env.WEALTHFLOW_SYNC_ENDPOINT || null;
  const passphrase = env.WEALTHFLOW_SYNC_PASSPHRASE || null;
  if (!endpoint && !passphrase) return null;
  if (!endpoint || !passphrase) throw new Error('Cloud sync needs both WEALTHFLOW_SYNC_ENDPOINT and WEALTHFLOW_SYNC_PASSPHRASE.');
  return {
    endpoint,
    passphrase,
    authorization: env.WEALTHFLOW_SYNC_AUTH || null,
    deviceName: env.WEALTHFLOW_DEVICE_NAME || 'This computer',
  };
}

function createSyncRuntime({ database, userDataPath, env = process.env, onState = () => {} }) {
  const config = readSyncRuntimeConfig(env);
  if (!config) return null;
  const syncRoot = path.join(userDataPath, 'sync');
  const devices = new SyncDeviceRegistry({ rootDir: syncRoot, deviceName: config.deviceName });
  const local = devices.ensureLocal();
  const journal = new LocalSyncJournal({ rootDir: syncRoot, deviceId: local.id });
  const transport = new HttpsSyncTransport({ endpoint: config.endpoint, authorization: config.authorization });
  const engine = new SyncEngine({ database, journal, transport, passphrase: config.passphrase, deviceRegistry: devices });
  const coordinator = new BackgroundSyncCoordinator({ syncOnce: () => engine.syncOnce(), onState });
  const unsubscribe = database.onCommittedSave(() => coordinator.markDirty());

  return {
    coordinator,
    config: { endpointHost: new URL(config.endpoint).host, deviceName: config.deviceName },
    dispose() { unsubscribe(); },
  };
}

module.exports = { readSyncRuntimeConfig, createSyncRuntime };
