// Regression coverage for the stock-service.js status-code bug:
// _httpsGet ignored res.statusCode and always tried to JSON.parse the
// response body — a rate-limit or error response (often HTML, not JSON)
// surfaced as a generic "Failed to parse JSON response" instead of naming
// the actual HTTP status, which is what the caller actually needs to know
// (e.g. to distinguish a rate limit from a bad symbol from a network
// error).
const { EventEmitter } = require('events');

let nextResponse = { statusCode: 200, body: '{}' };

jest.mock('https', () => ({
  get: jest.fn((url, options, callback) => {
    const res = new EventEmitter();
    res.statusCode = nextResponse.statusCode;
    const req = new EventEmitter();
    req.destroy = jest.fn();
    callback(res);
    process.nextTick(() => {
      res.emit('data', Buffer.from(nextResponse.body));
      res.emit('end');
    });
    return req;
  }),
}));

const { StockService } = require('../src/main/stock-service.js');

describe('StockService HTTP status handling', () => {
  let service;

  beforeEach(() => {
    service = new StockService();
  });

  test('a 429 rate-limit response reports the status code, not a JSON parse failure', async () => {
    nextResponse = { statusCode: 429, body: '<html>Too Many Requests</html>' };

    const result = await service.fetchQuote('SHOP.TO');

    expect(result.error).toMatch(/429/);
    expect(result.error).not.toMatch(/Failed to parse JSON/);
  });

  test('a 500 error response reports the status code', async () => {
    nextResponse = { statusCode: 500, body: 'Internal Server Error' };

    const result = await service.fetchQuote('SHOP.TO');

    expect(result.error).toMatch(/500/);
  });

  test('a successful 200 response still parses normally', async () => {
    nextResponse = {
      statusCode: 200,
      body: JSON.stringify({
        chart: { result: [{ meta: { regularMarketPrice: 100, chartPreviousClose: 95, currency: 'CAD' } }] },
      }),
    };

    const result = await service.fetchQuote('SHOP.TO');

    expect(result.error).toBeUndefined();
    expect(result.price).toBe(100);
  });
});
