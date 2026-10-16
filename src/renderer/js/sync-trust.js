function safeHost(endpoint) {
  if (!endpoint) return null;
  try { return new URL(endpoint).host; } catch { return null; }
}

function buildSyncTrustView(status) {
  if (!status || typeof status !== 'object') return null;
  const devices = Array.isArray(status.devices) ? status.devices : [];
  return {
    enabled: Boolean(status.enabled),
    encryption: status.encryption === 'aes-256-gcm' ? 'AES-256-GCM' : status.encryption || 'Not configured',
    endpointHost: safeHost(status.endpoint),
    lastSuccessAt: status.lastSuccessAt || null,
    pending: Boolean(status.pending),
    conflict: status.state === 'conflict',
    devices: devices.map((device) => ({
      id: device.id,
      name: String(device.name || 'Unknown device').slice(0, 80),
      isLocal: Boolean(device.isLocal),
      stale: Boolean(device.stale),
      lastSyncAt: device.lastSyncAt || null,
    })),
    syncedItems: [
      'financial database records',
      'budgets, goals, debts and transactions',
      'registered-account planning data',
      'saved WealthFlow settings that are part of the portable database',
    ],
    localOnlyItems: [
      'Anthropic API key',
      'cloud provider authorization credentials',
      'sync encryption passphrase / recovery secret',
      'advisor document files stored outside the database',
    ],
  };
}

module.exports = { buildSyncTrustView, safeHost };
