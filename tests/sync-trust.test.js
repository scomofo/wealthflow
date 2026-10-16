const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadTrustModel() {
  let source = fs.readFileSync(path.join(__dirname, '../src/renderer/js/sync-trust.js'), 'utf8');
  source = source.replace(/export function /g, 'function ');
  source += '\nmodule.exports = { buildSyncTrustView, safeHost };';
  const module = { exports: {} };
  vm.runInNewContext(source, { module, exports: module.exports, URL });
  return module.exports;
}
const { buildSyncTrustView, safeHost } = loadTrustModel();

describe('sync trust surface', () => {
  test('shows only the endpoint host, never paths', () => {
    expect(safeHost('https://sync.example.ca/private/user/object.json')).toBe('sync.example.ca');
  });
  test('separates synchronized financial data from device-local secrets', () => {
    const view = buildSyncTrustView({ enabled:true, encryption:'aes-256-gcm', endpoint:'https://sync.example.ca/object', devices:[] });
    expect(view.encryption).toBe('AES-256-GCM');
    expect(view.syncedItems.join(' ')).toMatch(/financial database/);
    expect(view.localOnlyItems.join(' ')).toMatch(/API key/);
    expect(view.localOnlyItems.join(' ')).toMatch(/passphrase/);
  });
  test('surfaces pending and conflict state without implying success', () => {
    const view = buildSyncTrustView({ enabled:true, pending:true, state:'conflict' });
    expect(view.pending).toBe(true); expect(view.conflict).toBe(true); expect(view.lastSuccessAt).toBeNull();
  });
});
