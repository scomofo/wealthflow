const https = require('https');
const { logger } = require('./logger');

class StockService {
  constructor() {
    this._cache = new Map();
    this._cacheTTL = 15 * 60 * 1000; // 15 minutes
  }

  // Singleton
  static get instance() {
    if (!StockService._instance) {
      StockService._instance = new StockService();
    }
    return StockService._instance;
  }

  /**
   * Make an HTTPS GET request and return parsed JSON.
   * Uses Node's built-in https module — no external dependencies.
   */
  _httpsGet(url) {
    return new Promise((resolve, reject) => {
      const req = https.get(url, {
        headers: { 'User-Agent': 'WealthFlow/1.0' },
        timeout: 10000,
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (err) {
            reject(new Error(`Failed to parse JSON response: ${err.message}`));
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timed out after 10 seconds'));
      });

      req.on('error', (err) => {
        reject(err);
      });
    });
  }

  /**
   * Fetch a stock quote for the given symbol.
   * Auto-appends .TO for TSX symbols (if symbol doesn't contain a dot).
   * Returns { symbol, price, change, changePercent, currency, lastUpdated }
   * or { symbol, error } on failure.
   */
  async fetchQuote(symbol) {
    if (!symbol || typeof symbol !== 'string') {
      return { symbol: symbol || '', error: 'Invalid symbol' };
    }
    if (!/^[A-Za-z0-9.]{1,10}$/.test(symbol)) {
      return { symbol, error: 'Invalid symbol format' };
    }

    // Try to find the right exchange for the symbol
    // If symbol has a dot (e.g., CVO.TO, ZUAG.F), use as-is
    // Otherwise, try the symbol directly first (US markets), then fall back to .TO (TSX)
    let querySymbol = symbol.toUpperCase();
    if (!symbol.includes('.')) {
      // Check cache for both variants
      const usCached = this._cache.get(querySymbol);
      const caCached = this._cache.get(querySymbol + '.TO');
      if (usCached && (Date.now() - usCached.timestamp) < this._cacheTTL) {
        return usCached.data;
      }
      if (caCached && (Date.now() - caCached.timestamp) < this._cacheTTL) {
        return caCached.data;
      }
      // Try US first, fall back to .TO
      const usResult = await this._tryFetchQuote(querySymbol);
      if (usResult && !usResult.error) {
        this._cache.set(querySymbol, { data: usResult, timestamp: Date.now() });
        return usResult;
      }
      querySymbol = querySymbol + '.TO';
    }

    // Check cache
    const cached = this._cache.get(querySymbol);
    if (cached && (Date.now() - cached.timestamp) < this._cacheTTL) {
      logger.info('Stock quote cache hit', { symbol: querySymbol });
      return cached.data;
    }
    if (cached) this._cache.delete(querySymbol); // clean up expired

    // Periodic full cache cleanup (every 100 fetches)
    if (!this._fetchCount) this._fetchCount = 0;
    this._fetchCount++;
    if (this._fetchCount % 100 === 0) {
      const now = Date.now();
      for (const [key, val] of this._cache) {
        if (now - val.timestamp >= this._cacheTTL) this._cache.delete(key);
      }
    }

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(querySymbol)}?range=1d&interval=1d`;

    logger.info('Fetching stock quote', { symbol: querySymbol, url });

    try {
      const json = await this._httpsGet(url);

      // Validate response structure
      const result = json?.chart?.result?.[0];
      if (!result) {
        const errorMsg = json?.chart?.error?.description || 'No data returned for symbol';
        logger.warn('Stock quote empty response', { symbol: querySymbol, error: errorMsg });
        return { symbol: querySymbol, error: errorMsg };
      }

      const meta = result.meta;
      const price = meta.regularMarketPrice;
      const previousClose = meta.chartPreviousClose || meta.previousClose;
      const change = previousClose ? +(price - previousClose).toFixed(4) : 0;
      const changePercent = previousClose ? +((change / previousClose) * 100).toFixed(2) : 0;

      const data = {
        symbol: querySymbol,
        price,
        change,
        changePercent,
        currency: meta.currency || 'CAD',
        lastUpdated: new Date().toISOString(),
      };

      // Update cache
      this._cache.set(querySymbol, { data, timestamp: Date.now() });

      logger.info('Stock quote fetched', { symbol: querySymbol, price, change, changePercent });
      return data;

    } catch (err) {
      logger.error('Stock quote fetch error', { symbol: querySymbol, error: err.message });
      return { symbol: querySymbol, error: err.message };
    }
  }

  /**
   * Try fetching a quote for a symbol. Returns the data object or null on failure.
   */
  async _tryFetchQuote(querySymbol) {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(querySymbol)}?range=1d&interval=1d`;
    try {
      const json = await this._httpsGet(url);
      const result = json?.chart?.result?.[0];
      if (!result) return null;
      const meta = result.meta;
      const price = meta.regularMarketPrice;
      if (!price) return null;
      const previousClose = meta.chartPreviousClose || meta.previousClose;
      const change = previousClose ? +(price - previousClose).toFixed(4) : 0;
      const changePercent = previousClose ? +((change / previousClose) * 100).toFixed(2) : 0;
      return { symbol: querySymbol, price, change, changePercent, currency: meta.currency || 'USD', lastUpdated: new Date().toISOString() };
    } catch {
      return null;
    }
  }

  /**
   * Fetch exchange rate between two currencies (e.g., USD to CAD).
   */
  async fetchExchangeRate(from = 'USD', to = 'CAD') {
    const pair = `${from.toUpperCase()}${to.toUpperCase()}=X`;

    const cached = this._cache.get(pair);
    if (cached && (Date.now() - cached.timestamp) < this._cacheTTL) {
      return cached.data;
    }

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(pair)}?range=1d&interval=1d`;

    try {
      const json = await this._httpsGet(url);
      const result = json?.chart?.result?.[0];
      if (!result) return { from, to, rate: null, error: 'No exchange rate data' };

      const rate = result.meta.regularMarketPrice;
      const data = { from, to, rate, lastUpdated: new Date().toISOString() };
      this._cache.set(pair, { data, timestamp: Date.now() });
      logger.info('Exchange rate fetched', { pair, rate });
      return data;
    } catch (err) {
      logger.error('Exchange rate fetch error', { pair, error: err.message });
      return { from, to, rate: null, error: err.message };
    }
  }

  /**
   * Fetch quotes for multiple symbols sequentially with a 200ms delay between calls.
   * Returns an array of results (mix of successful quotes and error objects).
   */
  async fetchBatchQuotes(symbols) {
    if (!Array.isArray(symbols) || symbols.length === 0) {
      return [];
    }

    const results = [];
    for (let i = 0; i < symbols.length; i++) {
      const quote = await this.fetchQuote(symbols[i]);
      results.push(quote);

      // 200ms delay between calls to avoid rate limiting (skip after last)
      if (i < symbols.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    return results;
  }
}

module.exports = { StockService };
