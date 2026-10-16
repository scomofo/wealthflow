const crypto = require('crypto');

const SYNC_PROTOCOL_VERSION = 1;

function assertNonEmptyString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${label} must be a non-empty string`);
  }
}

function assertRevision(value, label = 'revision') {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer`);
  }
}

function hashSnapshot(snapshot) {
  const serialized = typeof snapshot === 'string'
    ? snapshot
    : JSON.stringify(snapshot);
  return crypto.createHash('sha256').update(serialized, 'utf8').digest('hex');
}

function createSyncManifest({
  deviceId,
  revision,
  snapshotHash,
  parentHash = null,
  createdAt = new Date().toISOString(),
}) {
  assertNonEmptyString(deviceId, 'deviceId');
  assertRevision(revision);
  assertNonEmptyString(snapshotHash, 'snapshotHash');

  if (parentHash !== null) assertNonEmptyString(parentHash, 'parentHash');
  if (revision === 0 && parentHash !== null) {
    throw new Error('revision 0 cannot have a parentHash');
  }
  if (revision > 0 && parentHash === null) {
    throw new Error('revision > 0 requires a parentHash');
  }

  const parsed = Date.parse(createdAt);
  if (!Number.isFinite(parsed)) throw new Error('createdAt must be a valid ISO date');

  return {
    protocolVersion: SYNC_PROTOCOL_VERSION,
    deviceId: deviceId.trim(),
    revision,
    snapshotHash: snapshotHash.trim(),
    parentHash: parentHash === null ? null : parentHash.trim(),
    createdAt: new Date(parsed).toISOString(),
  };
}

function validateSyncManifest(manifest) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    throw new Error('manifest must be an object');
  }
  if (manifest.protocolVersion !== SYNC_PROTOCOL_VERSION) {
    throw new Error(`unsupported sync protocol version: ${manifest.protocolVersion}`);
  }

  return createSyncManifest(manifest);
}

function compareSyncManifests(localManifest, remoteManifest) {
  const local = validateSyncManifest(localManifest);
  const remote = validateSyncManifest(remoteManifest);

  if (local.snapshotHash === remote.snapshotHash) {
    return {
      action: 'same',
      reason: 'Snapshots are identical.',
    };
  }

  const remoteIsDirectChild =
    remote.revision === local.revision + 1 &&
    remote.parentHash === local.snapshotHash;

  if (remoteIsDirectChild) {
    return {
      action: 'download',
      reason: 'Remote snapshot is the direct descendant of local.',
    };
  }

  const localIsDirectChild =
    local.revision === remote.revision + 1 &&
    local.parentHash === remote.snapshotHash;

  if (localIsDirectChild) {
    return {
      action: 'upload',
      reason: 'Local snapshot is the direct descendant of remote.',
    };
  }

  return {
    action: 'conflict',
    reason: 'Snapshot lineage is ambiguous or divergent; manual resolution is required.',
  };
}

module.exports = {
  SYNC_PROTOCOL_VERSION,
  hashSnapshot,
  createSyncManifest,
  validateSyncManifest,
  compareSyncManifests,
};
