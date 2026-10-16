const crypto = require('crypto');

const ENVELOPE_VERSION = 1;
const ALGORITHM = 'aes-256-gcm';
const KEY_BYTES = 32;
const IV_BYTES = 12;
const SALT_BYTES = 16;

function requirePassphrase(passphrase) {
  if (typeof passphrase !== 'string' || passphrase.length < 12) {
    throw new Error('Sync encryption passphrase must be at least 12 characters.');
  }
}

function deriveSyncKey(passphrase, salt) {
  requirePassphrase(passphrase);
  const saltBuffer = Buffer.isBuffer(salt) ? salt : Buffer.from(salt, 'base64');
  if (saltBuffer.length !== SALT_BYTES) throw new Error('Invalid sync encryption salt.');
  return crypto.scryptSync(passphrase, saltBuffer, KEY_BYTES, { N: 1 << 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
}

function encryptSyncPackage(syncPackage, passphrase) {
  requirePassphrase(passphrase);
  if (!syncPackage || typeof syncPackage !== 'object' || Array.isArray(syncPackage)) {
    throw new Error('Sync package must be an object.');
  }

  const salt = crypto.randomBytes(SALT_BYTES);
  const iv = crypto.randomBytes(IV_BYTES);
  const key = deriveSyncKey(passphrase, salt);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const aad = Buffer.from('wealthflow-sync-envelope-v1', 'utf8');
  cipher.setAAD(aad);

  const plaintext = Buffer.from(JSON.stringify(syncPackage), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  key.fill(0);

  return {
    envelopeVersion: ENVELOPE_VERSION,
    algorithm: ALGORITHM,
    kdf: 'scrypt',
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  };
}

function decryptSyncPackage(envelope, passphrase) {
  requirePassphrase(passphrase);
  if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) {
    throw new Error('Encrypted sync envelope must be an object.');
  }
  if (envelope.envelopeVersion !== ENVELOPE_VERSION || envelope.algorithm !== ALGORITHM || envelope.kdf !== 'scrypt') {
    throw new Error('Unsupported encrypted sync envelope.');
  }

  const salt = Buffer.from(envelope.salt || '', 'base64');
  const iv = Buffer.from(envelope.iv || '', 'base64');
  const tag = Buffer.from(envelope.tag || '', 'base64');
  const ciphertext = Buffer.from(envelope.ciphertext || '', 'base64');
  if (salt.length !== SALT_BYTES || iv.length !== IV_BYTES || tag.length !== 16 || !ciphertext.length) {
    throw new Error('Encrypted sync envelope is malformed.');
  }

  const key = deriveSyncKey(passphrase, salt);
  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAAD(Buffer.from('wealthflow-sync-envelope-v1', 'utf8'));
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
    const parsed = JSON.parse(plaintext);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Decrypted sync package is invalid.');
    }
    return parsed;
  } catch (error) {
    throw new Error('Unable to decrypt sync package. The passphrase may be wrong or the package was modified.', { cause: error });
  } finally {
    key.fill(0);
  }
}

module.exports = {
  ENVELOPE_VERSION,
  encryptSyncPackage,
  decryptSyncPackage,
  deriveSyncKey,
};
