const { HttpsSyncTransport, SyncTransportConflictError } = require('../src/main/sync-transport');

function response(status, body = null, headers = {}) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: (name) => headers[name.toLowerCase()] ?? null },
    json: async () => body,
  };
}

describe('HTTPS sync transport', () => {
  test('rejects insecure or credential-bearing endpoints', () => {
    expect(() => new HttpsSyncTransport({ endpoint: 'http://example.com/sync', fetchImpl: jest.fn() })).toThrow(/HTTPS/);
    expect(() => new HttpsSyncTransport({ endpoint: 'https://user:pass@example.com/sync', fetchImpl: jest.fn() })).toThrow(/authorization header/i);
  });

  test('reads an encrypted envelope and ETag', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(response(200, { ciphertext: 'abc' }, { etag: '"v4"' }));
    const transport = new HttpsSyncTransport({ endpoint: 'https://sync.example.test/object', authorization: 'Bearer secret', fetchImpl });
    await expect(transport.read()).resolves.toEqual({ exists: true, etag: '"v4"', envelope: { ciphertext: 'abc' } });
    expect(fetchImpl).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      method: 'GET',
      headers: expect.objectContaining({ Authorization: 'Bearer secret' }),
      redirect: 'error',
    }));
  });

  test('treats 404 as an empty remote', async () => {
    const transport = new HttpsSyncTransport({ endpoint: 'https://sync.example.test/object', fetchImpl: jest.fn().mockResolvedValue(response(404)) });
    await expect(transport.read()).resolves.toEqual({ exists: false, etag: null, envelope: null });
  });

  test('uses optimistic concurrency for updates and creates', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(response(200, null, { etag: '"v5"' }));
    const transport = new HttpsSyncTransport({ endpoint: 'https://sync.example.test/object', fetchImpl });
    await transport.write({ ciphertext: 'abc' }, { expectedEtag: '"v4"' });
    expect(fetchImpl.mock.calls[0][1].headers['If-Match']).toBe('"v4"');
    await transport.write({ ciphertext: 'def' }, { createOnly: true });
    expect(fetchImpl.mock.calls[1][1].headers['If-None-Match']).toBe('*');
  });

  test('turns server precondition failures into explicit conflicts', async () => {
    const transport = new HttpsSyncTransport({ endpoint: 'https://sync.example.test/object', fetchImpl: jest.fn().mockResolvedValue(response(412)) });
    await expect(transport.write({ ciphertext: 'abc' }, { expectedEtag: '"old"' })).rejects.toBeInstanceOf(SyncTransportConflictError);
  });

  test('fails closed on malformed downloads and network errors', async () => {
    const malformed = new HttpsSyncTransport({ endpoint: 'https://sync.example.test/object', fetchImpl: jest.fn().mockResolvedValue(response(200, null)) });
    await expect(malformed.read()).rejects.toThrow(/invalid encrypted envelope/i);
    const offline = new HttpsSyncTransport({ endpoint: 'https://sync.example.test/object', fetchImpl: jest.fn().mockRejectedValue(new Error('offline')) });
    await expect(offline.read()).rejects.toThrow(/could not reach/i);
  });
});
