const fs = require('fs');
const path = require('path');

const {
  hashSnapshot,
  createSyncManifest,
  validateSyncManifest,
} = require('./sync-protocol');

function writeJsonAtomic(filePath, value) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });

  const tmpPath = filePath + '.tmp';
  const data = JSON.stringify(value, null, 2);
  const fd = fs.openSync(tmpPath, 'w');
  try {
    fs.writeSync(fd, data, null, 'utf8');
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(tmpPath, filePath);
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

class LocalSyncJournal {
  constructor({ rootDir, deviceId }) {
    if (!rootDir || typeof rootDir !== 'string') {
      throw new Error('rootDir is required');
    }
    if (!deviceId || typeof deviceId !== 'string') {
      throw new Error('deviceId is required');
    }

    this.rootDir = rootDir;
    this.deviceId = deviceId.trim();
    this.journalPath = path.join(rootDir, 'sync-journal.json');
    this.pendingPath = path.join(rootDir, 'pending-upload.json');
  }

  readJournal() {
    const parsed = readJsonIfExists(this.journalPath);
    if (!parsed) {
      return {
        version: 1,
        deviceId: this.deviceId,
        latest: null,
        entries: [],
      };
    }

    if (parsed.version !== 1) throw new Error('unsupported local sync journal version');
    if (parsed.deviceId !== this.deviceId) throw new Error('journal belongs to another device');
    if (!Array.isArray(parsed.entries)) throw new Error('journal entries must be an array');
    if (parsed.latest !== null) validateSyncManifest(parsed.latest);

    return parsed;
  }

  recordCommittedSnapshot(snapshot, { createdAt = new Date().toISOString() } = {}) {
    const journal = this.readJournal();
    const snapshotHash = hashSnapshot(snapshot);

    if (journal.latest?.snapshotHash === snapshotHash) {
      return journal.latest;
    }

    const nextRevision = journal.latest ? journal.latest.revision + 1 : 0;
    const manifest = createSyncManifest({
      deviceId: this.deviceId,
      revision: nextRevision,
      snapshotHash,
      parentHash: journal.latest?.snapshotHash || null,
      createdAt,
    });

    const nextJournal = {
      version: 1,
      deviceId: this.deviceId,
      latest: manifest,
      entries: [...journal.entries, manifest].slice(-100),
    };

    writeJsonAtomic(this.journalPath, nextJournal);
    return manifest;
  }

  createPendingUpload(snapshot) {
    const journal = this.readJournal();
    if (!journal.latest) {
      throw new Error('cannot create upload package before recording a snapshot');
    }

    const snapshotHash = hashSnapshot(snapshot);
    if (snapshotHash !== journal.latest.snapshotHash) {
      throw new Error('snapshot does not match latest committed journal entry');
    }

    const pending = {
      version: 1,
      manifest: journal.latest,
      snapshot,
      preparedAt: new Date().toISOString(),
    };

    writeJsonAtomic(this.pendingPath, pending);
    return pending;
  }

  readPendingUpload() {
    const parsed = readJsonIfExists(this.pendingPath);
    if (!parsed) return null;
    if (parsed.version !== 1) throw new Error('unsupported pending upload version');
    validateSyncManifest(parsed.manifest);
    if (hashSnapshot(parsed.snapshot) !== parsed.manifest.snapshotHash) {
      throw new Error('pending upload snapshot hash does not match manifest');
    }
    return parsed;
  }

  markUploadComplete(expectedSnapshotHash) {
    const pending = this.readPendingUpload();
    if (!pending) return false;
    if (pending.manifest.snapshotHash !== expectedSnapshotHash) {
      throw new Error('upload completion hash does not match pending package');
    }

    fs.unlinkSync(this.pendingPath);
    return true;
  }
}

module.exports = {
  LocalSyncJournal,
  writeJsonAtomic,
};
