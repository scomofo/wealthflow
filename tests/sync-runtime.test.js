const { readSyncRuntimeConfig } = require('../src/main/sync-runtime');

describe('sync runtime configuration',()=>{
  test('is absent by default',()=>expect(readSyncRuntimeConfig({})).toBeNull());
  test('requires endpoint and passphrase together',()=>{
    expect(()=>readSyncRuntimeConfig({WEALTHFLOW_SYNC_ENDPOINT:'https://example.test/sync'})).toThrow(/both/);
    expect(()=>readSyncRuntimeConfig({WEALTHFLOW_SYNC_PASSPHRASE:'long enough passphrase'})).toThrow(/both/);
  });
  test('keeps auth separate and applies a safe device label default',()=>{
    expect(readSyncRuntimeConfig({
      WEALTHFLOW_SYNC_ENDPOINT:'https://example.test/sync',
      WEALTHFLOW_SYNC_PASSPHRASE:'long enough passphrase',
      WEALTHFLOW_SYNC_AUTH:'Bearer x'
    })).toEqual({
      endpoint:'https://example.test/sync',
      passphrase:'long enough passphrase',
      authorization:'Bearer x',
      deviceName:'This computer'
    });
  });
});
