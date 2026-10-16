const { buildSyncTrustView, safeHost } = require('../src/renderer/js/sync-trust');

describe('sync trust surface', () => {
  test('shows only the endpoint host, never embedded credentials or paths', () => {
    expect(safeHost('https://sync.example.ca/private/user/object.json')).toBe('sync.example.ca');
  });
  test('separates synchronized financial data from device-local secrets', () => {
    const view = buildSyncTrustView({
      enabled: true,
      encryption: 'aes-256-gcm',
      endpoint: 'https://sync.example.ca/object',
      devices: [],
    });
    expect(view.encryption).toBe('AES-256-GCM');
    expect(view.syncedItems.join(' ')).toMatch(/financial database/);
    expect(view.localOnlyItems.join(' ')).toMatch(/API key/);
    expect(view.localOnlyItems.join(' ')).toMatch(/passphrase/);
  });
  test('surfaces pending and conflict state without implying success', () => {
    const view = buildSyncTrustView({ enabled:true, pending:true, state:'conflict' });
    expect(view.pending).toBe(true);
    expect(view.conflict).toBe(true);
    expect(view.lastSuccessAt).toBeNull();
  });
});
