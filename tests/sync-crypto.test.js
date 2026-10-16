const {
  encryptSyncPackage,
  decryptSyncPackage,
  deriveSyncKey,
} = require('../src/main/sync-crypto');

describe('encrypted sync packages', () => {
  const passphrase = 'correct horse battery staple';

  test('round-trips a pending sync package without exposing plaintext', () => {
    const input = {
      version: 1,
      manifest: { snapshotHash: 'abc123', revision: 4 },
      snapshot: { transactions: [{ id: 't1', description: 'Private merchant', amount: -42.5 }] },
    };

    const envelope = encryptSyncPackage(input, passphrase);
    expect(JSON.stringify(envelope)).not.toContain('Private merchant');
    expect(decryptSyncPackage(envelope, passphrase)).toEqual(input);
  });

  test('uses a fresh salt and IV for each envelope', () => {
    const one = encryptSyncPackage({ value: 1 }, passphrase);
    const two = encryptSyncPackage({ value: 1 }, passphrase);

    expect(one.salt).not.toBe(two.salt);
    expect(one.iv).not.toBe(two.iv);
    expect(one.ciphertext).not.toBe(two.ciphertext);
  });

  test('fails authentication for a wrong passphrase', () => {
    const envelope = encryptSyncPackage({ value: 1 }, passphrase);
    expect(() => decryptSyncPackage(envelope, 'this passphrase is wrong'))
      .toThrow(/wrong|modified/i);
  });

  test('fails authentication if ciphertext is modified', () => {
    const envelope = encryptSyncPackage({ value: 1 }, passphrase);
    const bytes = Buffer.from(envelope.ciphertext, 'base64');
    bytes[0] ^= 1;
    envelope.ciphertext = bytes.toString('base64');

    expect(() => decryptSyncPackage(envelope, passphrase)).toThrow(/modified/i);
  });

  test('rejects short passphrases and malformed salts', () => {
    expect(() => encryptSyncPackage({ value: 1 }, 'short')).toThrow(/12 characters/);
    expect(() => deriveSyncKey(passphrase, Buffer.alloc(3))).toThrow(/salt/);
  });
});
