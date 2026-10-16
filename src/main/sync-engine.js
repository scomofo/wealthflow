const { compareSyncManifests } = require('./sync-protocol');
const { encryptSyncPackage, decryptSyncPackage } = require('./sync-crypto');
const { SyncTransportConflictError } = require('./sync-transport');

class SyncEngine {
  constructor({ database, journal, transport, passphrase, deviceRegistry = null }) {
    this.database = database;
    this.journal = journal;
    this.transport = transport;
    this.passphrase = passphrase;
    this.deviceRegistry = deviceRegistry;
  }

  async syncOnce() {
    const snapshot = this.database.exportAllData();
    const local = this.journal.recordCommittedSnapshot(snapshot);
    const pending = this.journal.createPendingUpload(snapshot);
    const remote = await this.transport.read();

    if (!remote.exists) {
      const envelope = encryptSyncPackage(pending, this.passphrase);
      try {
        const result = await this.transport.write(envelope, { createOnly: true });
        this.journal.markUploadComplete(local.snapshotHash);
        this.deviceRegistry?.recordSync(this.deviceRegistry.read().localDeviceId);
        return { state: 'same', action: 'uploaded', etag: result.etag, local, remote: null };
      } catch (error) {
        if (error instanceof SyncTransportConflictError) return { state: 'conflict', action: 'review', local, remote: null };
        throw error;
      }
    }

    const remotePackage = decryptSyncPackage(remote.envelope, this.passphrase);
    if (!remotePackage.manifest || !remotePackage.snapshot) throw new Error('Remote sync package is incomplete.');
    const comparison = compareSyncManifests(local, remotePackage.manifest);

    if (comparison.action === 'same') {
      this.journal.markUploadComplete(local.snapshotHash);
      return { state: 'same', action: 'none', etag: remote.etag, local, remote: remotePackage.manifest };
    }
    if (comparison.action === 'upload') {
      const envelope = encryptSyncPackage(pending, this.passphrase);
      try {
        const result = await this.transport.write(envelope, { expectedEtag: remote.etag });
        this.journal.markUploadComplete(local.snapshotHash);
        this.deviceRegistry?.recordSync(this.deviceRegistry.read().localDeviceId);
        return { state: 'same', action: 'uploaded', etag: result.etag, local, remote: remotePackage.manifest };
      } catch (error) {
        if (error instanceof SyncTransportConflictError) return { state: 'conflict', action: 'review', local, remote: remotePackage.manifest };
        throw error;
      }
    }
    if (comparison.action === 'download') {
      return { state: 'remote-newer', action: 'review', etag: remote.etag, local, remote: remotePackage.manifest, remotePackage };
    }
    return { state: 'conflict', action: 'review', etag: remote.etag, local, remote: remotePackage.manifest, remotePackage };
  }
}

module.exports = { SyncEngine };
