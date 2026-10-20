import { env } from '../config/env.js';
import { INDIAN_INDICES, POPULAR_ETFS, POPULAR_STOCKS } from '../config/constants.js';
import { getCache, setCache } from '../lib/cache.js';
import { AppError, badGateway, badRequest, notFound } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { fetchChartData, searchQuotes } from '../lib/yahoo.js';
import { INDIAN_EQUITY_CATALOG, POPULAR_SEARCH_SYMBOLS } from '../data/indianEquities.js';

export function normalizeSymbol(symbol) {
  let s = String(symbol || '').trim().toUpperCase();
  if (!s) throw badRequest('Symbol is required');
  if (['NIFTY_FIN_SERVICE.NS', 'NIFTYFINSERVICE.NS', 'FINNIFTY', '^CNXFIN'].includes(s)) {
    return 'NIFTY_FIN_SERVICE.NS';
  }
  if (!s.endsWith('.NS') && !s.endsWith('.BO') && !s.startsWith('^')) {
    s = `${s}${env.DEFAULT_MARKET_SUFFIX}`;
  }
  return s;
}

function isNseMarketOpen() {
  const now = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }),
  );
  const day = now.getDay();
  if (day === 0 || day === 6) return false;
  const mins = now.getHours() * 60 + now.getMinutes();
  return mins >= 9 * 60 + 15 && mins <= 15 * 60 + 30;
}

function toIsoDate(d) {
  // NSE sessions are in Asia/Kolkata; UTC date keys can mis-align candles near midnight.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d instanceof Date ? d : new Date(d));
}

function periodStart(period = '1y') {
  const now = Date.now();
  const map = {
    '1d': now - 3 * 86400000,
    '5d': now - 12 * 86400000,
    '1mo': now - 40 * 86400000,
    '3mo': now - 110 * 86400000,
    '6mo': now - 200 * 86400000,
    '1y': now - 400 * 86400000,
    '2y': now - 800 * 86400000,
    '5y': now - 1900 * 86400000,
    '10y': now - 3700 * 86400000,
    ytd: new Date(new Date().getFullYear(), 0, 1).getTime(),
    max: new Date('1990-01-01').getTime(),
  };
  return new Date(map[period] || map['1y']);
}

/**
 * Resolve live price and the previous session close from a chart response.
 *
 * Yahoo's `chartPreviousClose` is the close preceding the requested range, not the
 * prior session, so the reference close is taken from the candles instead. The last
 * candle is the current session (partial while the market is open, final afterwards).
 */
function deriveLiveQuote(meta, quotes) {
  const last = quotes[quotes.length - 1];
  const price = Number(meta.regularMarketPrice) > 0
    ? Number(meta.regularMarketPrice)
    : Number(last.close);

  const liveDate = meta.regularMarketTime
    ? toIsoDate(new Date(meta.regularMarketTime * 1000))
    : toIsoDate(last.date);
  const lastIsCurrentSession = toIsoDate(last.date) === liveDate;
  const reference = lastIsCurrentSession && quotes.length > 1
    ? quotes[quotes.length - 2]
    : last;

  return {
    price,
    previousClose: Number(reference.close),
    volume: Number(last.volume || 0),
    asOfDate: toIsoDate(last.date),
  };
}

async function fetchChart(symbol, period = '1y', interval = '1d') {
  try {
    const { meta, quotes } = await fetchChartData(symbol, {
      period1: periodStart(period),
      period2: new Date(),
      interval,
    });
    return { meta, quotes };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw badGateway(`Failed to fetch live market data for ${symbol}: ${err.message}`);
  }
}

export async function getHistoricalData(symbol, period = '1y', interval = '1d') {
  const normalized = normalizeSymbol(symbol);
  const cacheKey = `hist:${normalized}:${period}:${interval}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const { quotes } = await fetchChart(normalized, period, interval);
  if (!quotes.length) throw notFound(`No live historical data found for symbol ${normalized}`);

  const dates = quotes.map((q) => toIsoDate(q.date));
  const prices = quotes.map((q) => Number(q.close));
  const volumes = quotes.map((q) => Number(q.volume || 0));
  const returns = prices.map((p, i) => (i === 0 ? 0 : (p - prices[i - 1]) / prices[i - 1]));

  const data = { symbol: normalized, dates, prices, volumes, returns };
  return setCache(cacheKey, data);
}

export async function getStockQuote(symbol) {
  const normalized = normalizeSymbol(symbol);
  const cacheKey = `quote:${normalized}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const { meta, quotes } = await fetchChart(normalized, '1mo', '1d');
  if (!quotes.length) throw notFound(`No live data found for symbol ${normalized}`);

  const { price, previousClose, volume } = deriveLiveQuote(meta, quotes);
  const change = price - previousClose;
  const changePercent = previousClose ? (change / previousClose) * 100 : 0;

  const data = {
    symbol: normalized,
    current_price: Number(price.toFixed(4)),
    change: Number(change.toFixed(4)),
    change_percent: Number(changePercent.toFixed(4)),
    volume,
    market_cap: null,
    pe_ratio: null,
  };
  return setCache(cacheKey, data);
}

export async function getHistoricalBatch(symbols, period = '1y', interval = '1d') {
  if (!symbols?.length) throw badRequest('symbols required');
  if (symbols.length > 20) throw badRequest('Too many symbols. Maximum 20 allowed.');

  const out = {};
  await Promise.all(
    symbols.map(async (symbol) => {
      try {
        const hist = await getHistoricalData(symbol, period, interval);
        out[hist.symbol] = hist.dates.map((date, i) => ({
          symbol: hist.symbol,
          date,
          close: hist.prices[i],
          open: hist.prices[i],
          high: hist.prices[i],
          low: hist.prices[i],
          volume: hist.volumes[i],
        }));
      } catch {
        // skip failed symbols
      }
    }),
  );
  return out;
}

export async function getMarketIndices() {
  const cacheKey = 'indices:batch:v1';
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const indices = [];
  await Promise.all(
    INDIAN_INDICES.map(async (index) => {
      try {
        const { meta, quotes } = await fetchChart(normalizeSymbol(index.symbol), '1mo', '1d');
        if (!quotes.length) return;

        const { price, previousClose, asOfDate } = deriveLiveQuote(meta, quotes);
        const change = price - previousClose;

        indices.push({
          key: index.key,
          name: index.name,
          symbol: index.symbol,
          price: Number(price.toFixed(2)),
          previous_close: Number(previousClose.toFixed(2)),
          change: Number(change.toFixed(2)),
          change_percent: Number((previousClose ? (change / previousClose) * 100 : 0).toFixed(2)),
          as_of_date: asOfDate,
        });
      } catch (err) {
        logger.warn(`Skipping index ${index.symbol}: ${err.message}`);
      }
    }),
  );

  if (!indices.length) throw badGateway('Could not fetch live index data');

  // Keep stable display order
  const order = Object.fromEntries(INDIAN_INDICES.map((m, i) => [m.symbol, i]));
  indices.sort((a, b) => (order[a.symbol] ?? 99) - (order[b.symbol] ?? 99));

  const payload = {
    market_open: isNseMarketOpen(),
    as_of: new Date().toISOString(),
    indices,
  };
  return setCache(cacheKey, payload, 5);
}

function assetType(symbol, quoteType = 'EQUITY') {
  if (quoteType.includes('ETF')) return 'ETF';
  if (quoteType.includes('INDEX')) return 'INDEX';
  if (['BEES', 'ETF', 'GOLD', 'SILVER'].some((tag) => symbol.includes(tag))) return 'ETF';
  return 'EQUITY';
}

function exchangeOf(symbol, exchange = '') {
  if (symbol.endsWith('.BO')) return 'BSE';
  if (symbol.endsWith('.NS')) return 'NSE';
  return ['NSI', 'NSE'].includes(exchange) ? 'NSE' : 'BSE';
}

function scoreCatalogEntry(symbol, name, queryUpper, queryLower) {
  const bare = symbol.replace(/\.(NS|BO)$/, '');
  const lowerName = name.toLowerCase();

  if (bare === queryUpper) return 1000;
  if (symbol.startsWith(queryUpper)) return 800;
  if (lowerName.startsWith(queryLower)) return 700;
  if (symbol.includes(queryUpper)) return 600;
  if (lowerName.includes(queryLower)) return 500;

  // Multi-word queries such as "hdfc bank" must match every token.
  const tokens = queryLower.split(/\s+/).filter((t) => t.length > 1);
  const haystack = `${lowerName} ${symbol.toLowerCase()}`;
  if (tokens.length && tokens.every((t) => haystack.includes(t))) return 550;

  return 0;
}

/**
 * Search Indian equities and ETFs.
 *
 * The curated catalogue answers common queries instantly; Yahoo's search endpoint
 * then adds the long tail of listed names (and tolerates typos) so anything tradable
 * on NSE/BSE is reachable. Yahoo being unavailable degrades to catalogue-only results
 * rather than failing the request.
 */
export async function searchEquities(query = '', limit = 20) {
  const raw = String(query || '').trim();
  const max = Math.min(Math.max(Number(limit) || 20, 1), 50);

  if (!raw) {
    return POPULAR_SEARCH_SYMBOLS.slice(0, max).map((symbol) => ({
      symbol,
      name: INDIAN_EQUITY_CATALOG[symbol] || symbol,
      exchange: exchangeOf(symbol),
      type: assetType(symbol),
    }));
  }

  const cacheKey = `search:${raw.toLowerCase()}:${max}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const queryUpper = raw.toUpperCase();
  const queryLower = raw.toLowerCase();
  /** @type {Map<string, { symbol: string, name: string, exchange: string, type: string, score: number }>} */
  const matches = new Map();

  const add = (symbol, name, exchange, type, score) => {
    if (!symbol || score <= 0) return;
    // NSE/BSE listings only, and never Yahoo's mutual-fund rows (they start with 0P).
    if (!/\.(NS|BO)$/.test(symbol) && !symbol.startsWith('^')) return;
    if (symbol.startsWith('0P')) return;

    const existing = matches.get(symbol);
    if (!existing || score > existing.score) {
      matches.set(symbol, { symbol, name: name || symbol, exchange, type, score });
    }
  };

  for (const [symbol, name] of Object.entries(INDIAN_EQUITY_CATALOG)) {
    add(
      symbol,
      name,
      exchangeOf(symbol),
      assetType(symbol),
      scoreCatalogEntry(symbol, name, queryUpper, queryLower),
    );
  }

  try {
    const remote = await searchQuotes(raw, Math.max(max * 2, 15));
    for (const hit of remote) {
      const isIndian = /\.(NS|BO)$/.test(hit.symbol) || ['NSI', 'NSE', 'BSE'].includes(hit.exchange);
      if (!isIndian || hit.quoteType === 'MUTUALFUND') continue;

      const bare = hit.symbol.replace(/\.(NS|BO)$/, '');
      let score = 400;
      if (bare === queryUpper) score = 950;
      else if (hit.symbol.startsWith(queryUpper)) score = 750;

      add(
        hit.symbol,
        INDIAN_EQUITY_CATALOG[hit.symbol] || hit.name,
        exchangeOf(hit.symbol, hit.exchange),
        assetType(hit.symbol, hit.quoteType),
        score,
      );
    }
  } catch (err) {
    logger.warn(`Yahoo symbol search unavailable for "${raw}": ${err.message}`);
  }

  // NSE is the primary listing venue and the default suffix elsewhere in the app,
  // so it wins ties against the same company's BSE line.
  const exchangeRank = (symbol) => (symbol.endsWith('.NS') ? 0 : 1);

  const results = [...matches.values()]
    .sort(
      (a, b) => b.score - a.score
        || exchangeRank(a.symbol) - exchangeRank(b.symbol)
        || a.symbol.localeCompare(b.symbol),
    )
    .slice(0, max)
    // eslint-disable-next-line no-unused-vars
    .map(({ score, ...item }) => item);

  return setCache(cacheKey, results, 60);
}

export async function getCorrelationMatrix(symbols, period = '1y') {
  if (!symbols?.length) throw badRequest('symbols required');
  if (symbols.length > 20) throw badRequest('Maximum 20 symbols');

  const series = {};
  for (const symbol of symbols) {
    const hist = await getHistoricalData(symbol, period);
    series[hist.symbol] = hist;
  }

  const keys = Object.keys(series);
  const common = keys.reduce((acc, key, idx) => {
    const set = new Set(series[key].dates);
    return idx === 0 ? set : new Set([...acc].filter((d) => set.has(d)));
  }, new Set());

  const dates = [...common].sort();
  if (dates.length < 10) throw badRequest('Insufficient overlapping history');

  const returns = keys.map((key) => {
    const map = Object.fromEntries(series[key].dates.map((d, i) => [d, series[key].prices[i]]));
    const prices = dates.map((d) => map[d]);
    return prices.slice(1).map((p, i) => (p - prices[i]) / prices[i]);
  });

  const n = keys.length;
  const matrix = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j < n; j += 1) {
      matrix[i][j] = pearson(returns[i], returns[j]);
    }
  }

  return { symbols: keys, correlation_matrix: matrix, period };
}

export async function getReturnsMatrix(symbols, period = '1y') {
  const corr = await getCorrelationMatrix(symbols, period);
  const series = {};
  for (const symbol of corr.symbols) {
    series[symbol] = await getHistoricalData(symbol, period);
  }
  const returns_matrix = corr.symbols.map((symbol) => series[symbol].returns.slice(1));
  const statistics = corr.symbols.map((symbol, i) => {
    const r = returns_matrix[i];
    const mean = r.reduce((a, b) => a + b, 0) / r.length;
    const variance = r.reduce((a, b) => a + (b - mean) ** 2, 0) / r.length;
    return {
      symbol,
      mean_daily_return: mean,
      volatility_daily: Math.sqrt(variance),
      observations: r.length,
    };
  });
  return { symbols: corr.symbols, returns_matrix, statistics, period };
}

export async function getPopular() {
  const all = [...POPULAR_STOCKS, ...POPULAR_ETFS].slice(0, 20);
  const data = {};
  await Promise.all(
    all.map(async (symbol) => {
      try {
        data[symbol] = await getStockQuote(symbol);
      } catch {
        // skip
      }
    }),
  );
  return {
    stocks: Object.fromEntries(Object.entries(data).filter(([k]) => POPULAR_STOCKS.includes(k))),
    etfs: Object.fromEntries(Object.entries(data).filter(([k]) => POPULAR_ETFS.includes(k))),
  };
}

export async function getMarketStatus() {
  const [nifty, sensex, bank] = await Promise.all([
    getStockQuote('^NSEI'),
    getStockQuote('^BSESN'),
    getStockQuote('^NSEBANK'),
  ]);
  return {
    nifty_50: nifty,
    sensex,
    bank_nifty: bank,
    market_open: isNseMarketOpen(),
    market_time: new Date().toISOString(),
    currency: 'INR',
  };
}

function pearson(a, b) {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;
  for (let i = 0; i < n; i += 1) {
    sumX += a[i];
    sumY += b[i];
    sumXY += a[i] * b[i];
    sumX2 += a[i] * a[i];
    sumY2 += b[i] * b[i];
  }
  const num = n * sumXY - sumX * sumY;
  const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  return den === 0 ? 0 : num / den;
}
