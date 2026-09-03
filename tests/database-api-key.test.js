// The decrypted Anthropic API key must never leave the main process (not
// over IPC, not in a JSON export), and a stored key that can't currently be
// decrypted must never be treated as a usable key or get silently corrupted
// by round-tripping through decrypt+encrypt on the next settings save.
const fs = require('fs');
const os = require('os');
const path = require('path');

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wealthflow-apikey-'));
process.resourcesPath = tempRoot;

// A simple reversible "encryption" so encryptString/decryptString round-trip
// realistically, unlike the other test files which disable encryption
// entirely — this is the one place that path needs real coverage.
let encryptionAvailable = true;
function fakeEncrypt(plaintext) {
  return Buffer.from('FAKE:' + plaintext, 'utf8');
}
function fakeDecrypt(buffer) {
  const str = buffer.toString('utf8');
  if (!str.startsWith('FAKE:')) throw new Error('not a valid encrypted buffer');
  return str.slice(5);
}

jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => tempRoot),
  },
  safeStorage: {
    isEncryptionAvailable: jest.fn(() => encryptionAvailable),
    encryptString: jest.fn((plaintext) => fakeEncrypt(plaintext)),
    decryptString: jest.fn((buffer) => fakeDecrypt(buffer)),
  },
}));

const { WealthFlowDatabase, maskApiKey } = require('../src/main/database.js');

function flushPendingSave(database) {
  if (database._saveTimer) {
    clearTimeout(database._saveTimer);
    database._saveTimer = null;
  }
}

describe('WealthFlowDatabase API key encryption', () => {
  let database;

  beforeEach(async () => {
    encryptionAvailable = true;
    const dbPath = path.join(tempRoot, 'wealthflow.db');
    for (const p of [dbPath, dbPath + '.bak', dbPath + '.tmp']) {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
    database = new WealthFlowDatabase();
    await database.init();
    flushPendingSave(database);
  });

  afterEach(() => {
    if (database) database.close();
  });

  test('round-trips a key through encryption and decryption', () => {
    database.updateSettings({ ai_api_key: 'sk-ant-real-secret-key-12345' });
    flushPendingSave(database);

    const settings = database.getSettings();
    expect(settings.ai_api_key).toBe('sk-ant-real-secret-key-12345');

    const rawRow = database.getOne('SELECT ai_api_key FROM settings WHERE id = 1');
    expect(rawRow.ai_api_key.startsWith('enc:')).toBe(true);
    expect(rawRow.ai_api_key).not.toContain('sk-ant-real-secret-key-12345');
  });

  test('saving unrelated fields does not touch or corrupt the stored key', () => {
    database.updateSettings({ ai_api_key: 'sk-ant-original-key' });
    flushPendingSave(database);
    const rawAfterFirstSave = database.getOne('SELECT ai_api_key FROM settings WHERE id = 1').ai_api_key;

    database.updateSettings({ user_name: 'Alex' });
    flushPendingSave(database);
    const rawAfterSecondSave = database.getOne('SELECT ai_api_key FROM settings WHERE id = 1').ai_api_key;

    expect(rawAfterSecondSave).toBe(rawAfterFirstSave);
    expect(database.getSettings().ai_api_key).toBe('sk-ant-original-key');
  });

  test('a key that cannot currently be decrypted is never surfaced as usable, and is left untouched on the next save', () => {
    database.updateSettings({ ai_api_key: 'sk-ant-original-key' });
    flushPendingSave(database);
    const rawEncrypted = database.getOne('SELECT ai_api_key FROM settings WHERE id = 1').ai_api_key;

    // Simulate the OS keychain becoming unavailable (different machine/user,
    // keychain reset) after the key was encrypted.
    encryptionAvailable = false;

    const settings = database.getSettings();
    expect(settings.ai_api_key).toBe(''); // never the raw ciphertext blob

    // Saving something unrelated while undecryptable must not corrupt the
    // stored ciphertext by re-encrypting the empty/garbage "decrypted" value.
    database.updateSettings({ user_name: 'Alex' });
    flushPendingSave(database);
    const rawAfterSave = database.getOne('SELECT ai_api_key FROM settings WHERE id = 1').ai_api_key;
    expect(rawAfterSave).toBe(rawEncrypted);

    // Once encryption is available again, the original key decrypts fine.
    encryptionAvailable = true;
    expect(database.getSettings().ai_api_key).toBe('sk-ant-original-key');
  });

  test('a legacy plaintext key is transparently upgraded to encrypted form on the next save', () => {
    database.run("UPDATE settings SET ai_api_key = 'legacy-plaintext-key' WHERE id = 1");
    flushPendingSave(database);

    expect(database.getSettings().ai_api_key).toBe('legacy-plaintext-key');

    // Any save (even one that doesn't touch the key) should upgrade it.
    database.updateSettings({ user_name: 'Alex' });
    flushPendingSave(database);

    const rawRow = database.getOne('SELECT ai_api_key FROM settings WHERE id = 1');
    expect(rawRow.ai_api_key.startsWith('enc:')).toBe(true);
    expect(database.getSettings().ai_api_key).toBe('legacy-plaintext-key');
  });

  test('exportAllData never includes the decrypted (or raw) API key', () => {
    database.updateSettings({ ai_api_key: 'sk-ant-should-not-leak' });
    flushPendingSave(database);

    const exported = database.exportAllData();

    expect(exported.settings.ai_api_key).toBeUndefined();
    expect(JSON.stringify(exported)).not.toContain('sk-ant-should-not-leak');
    expect(exported.settings.hasApiKey).toBe(true);
    expect(exported.settings.apiKeyMasked).toBe(maskApiKey('sk-ant-should-not-leak'));
  });

  test('maskApiKey never reveals the middle of the key', () => {
    expect(maskApiKey('')).toBe('');
    expect(maskApiKey('sk-ant-api03-abcdefghijklmnopqrstuvwxyz')).toBe('sk-ant…wxyz');
    expect(maskApiKey('short')).toBe('••••');
  });
});
