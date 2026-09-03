// Debug helper: checks whether Electron's safeStorage can decrypt the
// currently-stored AI API key on this machine.
// Usage: npx electron scripts/debug-safestorage.js
const { app, safeStorage, BrowserWindow } = require('electron');
app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await new Promise(r => setTimeout(r, 500));
  console.log('isEncryptionAvailable:', safeStorage.isEncryptionAvailable());

  const fs = require('fs');
  const path = require('path');
  const initSqlJs = require(path.join(__dirname, '../node_modules/sql.js'));
  const wasmBinary = fs.readFileSync(path.join(__dirname, '../node_modules/sql.js/dist/sql-wasm.wasm'));
  const SQL = await initSqlJs({ wasmBinary });
  const dbPath = path.join(app.getPath('userData'), 'wealthflow.db');
  const db = new SQL.Database(fs.readFileSync(dbPath));
  const r = db.exec("SELECT ai_api_key FROM settings WHERE id = 1");
  const raw = r[0]?.values[0]?.[0] || '';
  // Never print any part of the key itself, even a prefix — this is a
  // debug script whose output can end up in shared logs/screen shares.
  console.log('Raw key present:', !!raw, '| looks encrypted:', raw.startsWith('enc:'));

  if (raw.startsWith('enc:') && safeStorage.isEncryptionAvailable()) {
    const buffer = Buffer.from(raw.slice(4), 'base64');
    const decrypted = safeStorage.decryptString(buffer);
    console.log('Decrypted successfully:', !!decrypted, '| length:', decrypted.length);
  } else {
    console.log('Cannot decrypt');
  }

  db.close();
  win.close();
  app.quit();
});
