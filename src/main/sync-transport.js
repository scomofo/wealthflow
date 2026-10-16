class SyncTransportConflictError extends Error {
  constructor(message = 'Remote sync object changed since it was read.') {
    super(message);
    this.name = 'SyncTransportConflictError';
  }
}

function assertHttpsEndpoint(endpoint) {
  let url;
  try { url = new URL(endpoint); } catch { throw new Error('Sync endpoint must be a valid HTTPS URL.'); }
  if (url.protocol !== 'https:') throw new Error('Sync endpoint must use HTTPS.');
  if (url.username || url.password) throw new Error('Put sync credentials in the authorization header, not the URL.');
  return url.toString();
}

class HttpsSyncTransport {
  constructor({ endpoint, authorization = null, fetchImpl = globalThis.fetch }) {
    this.endpoint = assertHttpsEndpoint(endpoint);
    if (typeof fetchImpl !== 'function') throw new Error('HTTPS sync transport requires fetch support.');
    this.authorization = authorization;
    this.fetchImpl = fetchImpl;
  }

  headers(extra = {}) {
    return {
      Accept: 'application/json',
      ...(this.authorization ? { Authorization: this.authorization } : {}),
      ...extra,
    };
  }

  async read() {
    let response;
    try {
      response = await this.fetchImpl(this.endpoint, {
        method: 'GET',
        headers: this.headers(),
        redirect: 'error',
      });
    } catch (error) {
      throw new Error('Cloud sync could not reach the configured HTTPS endpoint.', { cause: error });
    }
    if (response.status === 404) return { exists: false, etag: null, envelope: null };
    if (!response.ok) throw new Error(`Cloud sync download failed with HTTP ${response.status}.`);

    let envelope;
    try { envelope = await response.json(); }
    catch (error) { throw new Error('Cloud sync returned invalid JSON.', { cause: error }); }
    if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) {
      throw new Error('Cloud sync returned an invalid encrypted envelope.');
    }
    return {
      exists: true,
      etag: response.headers.get('etag'),
      envelope,
    };
  }

  async write(envelope, { expectedEtag = null, createOnly = false } = {}) {
    if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) {
      throw new Error('Encrypted sync envelope must be an object.');
    }
    const concurrency = createOnly
      ? { 'If-None-Match': '*' }
      : expectedEtag
        ? { 'If-Match': expectedEtag }
        : {};
    let response;
    try {
      response = await this.fetchImpl(this.endpoint, {
        method: 'PUT',
        headers: this.headers({ 'Content-Type': 'application/json', ...concurrency }),
        body: JSON.stringify(envelope),
        redirect: 'error',
      });
    } catch (error) {
      throw new Error('Cloud sync could not upload to the configured HTTPS endpoint.', { cause: error });
    }
    if (response.status === 409 || response.status === 412) throw new SyncTransportConflictError();
    if (!response.ok) throw new Error(`Cloud sync upload failed with HTTP ${response.status}.`);
    return { etag: response.headers.get('etag') };
  }
}

module.exports = { HttpsSyncTransport, SyncTransportConflictError, assertHttpsEndpoint };
