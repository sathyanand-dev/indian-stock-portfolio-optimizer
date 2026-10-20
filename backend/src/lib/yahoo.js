import { badGateway, notFound } from './errors.js';
import { logger } from './logger.js';

const BASE = 'https://query1.finance.yahoo.com';
const MAX_ATTEMPTS = 3;
const RETRY_BASE_MS = 600;

// Yahoo rejects requests that carry a browser-like User-Agent from a server IP,
// so requests are sent with the runtime's default headers only.
async function requestJson(url, label, attempt = 1) {
  const response = await fetch(url);

  if (response.status === 429 || response.status >= 500) {
    if (attempt >= MAX_ATTEMPTS) {
      throw badGateway(`Yahoo Finance is throttling requests for ${label}`);
    }
    const delay = RETRY_BASE_MS * 2 ** (attempt - 1);
    logger.warn(`Yahoo ${response.status} for ${label}, retrying in ${delay}ms`);
    await new Promise((resolve) => setTimeout(resolve, delay));
    return requestJson(url, label, attempt + 1);
  }

  if (response.status === 404) {
    throw notFound(`${label} not found on Yahoo Finance`);
  }

  if (!response.ok) {
    throw badGateway(`Yahoo Finance returned ${response.status} for ${label}`);
  }

  try {
    return await response.json();
  } catch (err) {
    throw badGateway(`Invalid Yahoo Finance response for ${label}: ${err.message}`);
  }
}

/**
 * Fetch OHLCV candles and quote metadata for a symbol.
 *
 * @param {string} symbol Yahoo symbol, already normalized.
 * @param {{ period1: Date, period2: Date, interval?: string }} options
 * @returns {Promise<{ meta: object, quotes: Array<{ date: Date, open: number, high: number, low: number, close: number, volume: number }> }>}
 */
export async function fetchChartData(symbol, { period1, period2, interval = '1d' }) {
  const params = new URLSearchParams({
    period1: String(Math.floor(period1.getTime() / 1000)),
    period2: String(Math.floor(period2.getTime() / 1000)),
    interval,
    events: 'div|split',
    includeAdjustedClose: 'true',
  });

  const payload = await requestJson(
    `${BASE}/v8/finance/chart/${encodeURIComponent(symbol)}?${params.toString()}`,
    symbol,
  );

  if (payload?.chart?.error) {
    const { code, description } = payload.chart.error;
    if (code === 'Not Found') throw notFound(`Symbol ${symbol} not found on Yahoo Finance`);
    throw badGateway(`Yahoo Finance error for ${symbol}: ${description || code}`);
  }

  const result = payload?.chart?.result?.[0];
  if (!result) throw notFound(`No chart data returned for ${symbol}`);

  const timestamps = result.timestamp || [];
  const ohlc = result.indicators?.quote?.[0] || {};
  const adjusted = result.indicators?.adjclose?.[0]?.adjclose;

  const quotes = [];
  for (let i = 0; i < timestamps.length; i += 1) {
    const close = adjusted?.[i] ?? ohlc.close?.[i];
    if (!Number.isFinite(close) || close <= 0) continue;
    quotes.push({
      date: new Date(timestamps[i] * 1000),
      open: Number.isFinite(ohlc.open?.[i]) ? ohlc.open[i] : close,
      high: Number.isFinite(ohlc.high?.[i]) ? ohlc.high[i] : close,
      low: Number.isFinite(ohlc.low?.[i]) ? ohlc.low[i] : close,
      close,
      volume: Number.isFinite(ohlc.volume?.[i]) ? ohlc.volume[i] : 0,
    });
  }

  return { meta: result.meta || {}, quotes };
}

/**
 * Look up instruments by free text. Fuzzy matching is enabled so typos such as
 * "manapuram" still resolve to MANAPPURAM.
 *
 * @param {string} query
 * @param {number} [count]
 * @returns {Promise<Array<{ symbol: string, name: string, exchange: string, quoteType: string }>>}
 */
export async function searchQuotes(query, count = 15) {
  const params = new URLSearchParams({
    q: query,
    quotesCount: String(count),
    newsCount: '0',
    enableFuzzyQuery: 'true',
    quotesQueryId: 'tss_match_phrase_query',
  });

  const payload = await requestJson(
    `${BASE}/v1/finance/search?${params.toString()}`,
    `search "${query}"`,
  );

  return (payload?.quotes || []).map((q) => ({
    symbol: String(q.symbol || '').toUpperCase(),
    name: q.shortname || q.longname || q.symbol || '',
    exchange: String(q.exchange || q.exchDisp || '').toUpperCase(),
    quoteType: String(q.quoteType || q.typeDisp || 'EQUITY').toUpperCase(),
  }));
}

/**
 * Annual / trailing fundamentals from Yahoo's timeseries API (no crumb required).
 *
 * @param {string} symbol
 * @param {string[]} types
 * @param {{ years?: number }} [options]
 * @returns {Promise<Record<string, Array<{ date: string, value: number, fmt?: string }>>>}
 */
export async function fetchFundamentalsTimeseries(symbol, types, { years = 6 } = {}) {
  const period1 = Math.floor((Date.now() - years * 365 * 86400000) / 1000);
  const period2 = Math.floor(Date.now() / 1000);
  const params = new URLSearchParams({
    type: types.join(','),
    period1: String(period1),
    period2: String(period2),
  });

  const payload = await requestJson(
    `${BASE}/ws/fundamentals-timeseries/v1/finance/timeseries/${encodeURIComponent(symbol)}?${params}`,
    `fundamentals ${symbol}`,
  );

  const out = {};
  for (const row of payload?.timeseries?.result || []) {
    const type = row.meta?.type?.[0] || Object.keys(row).find((k) => k !== 'meta' && k !== 'timestamp');
    if (!type) continue;
    const points = (row[type] || [])
      .filter((p) => p && p.reportedValue && Number.isFinite(Number(p.reportedValue.raw)))
      .map((p) => ({
        date: p.asOfDate,
        value: Number(p.reportedValue.raw),
        fmt: p.reportedValue.fmt,
        currency: p.currencyCode || null,
        periodType: p.periodType || null,
      }));
    out[type] = points;
  }
  return out;
}
