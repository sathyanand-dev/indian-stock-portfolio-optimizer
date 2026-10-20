import { env } from '../config/env.js';
import { RISK_TOLERANCE_DELTA, TRADING_DAYS } from '../config/constants.js';
import { badRequest } from '../lib/errors.js';
import {
  dirichletSample,
  matrixVector,
  mean,
  optimizeMinVariance,
  optimizeRiskParity,
  optimizeUtility,
  quadraticForm,
  shrinkCovariance,
} from '../lib/math.js';
import * as marketData from './marketData.service.js';

function mapPeriod(period) {
  if (period == null || period === '') return '1y';
  if (typeof period === 'number' && Number.isFinite(period)) {
    return mapPeriod(String(period));
  }
  const p = String(period).trim().toLowerCase();
  if (['1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', '10y', 'ytd', 'max'].includes(p)) {
    return p;
  }
  if (/^\d+$/.test(p)) {
    const days = Number(p);
    if (days <= 5) return '5d';
    if (days <= 30) return '1mo';
    if (days <= 90) return '3mo';
    if (days <= 180) return '6mo';
    if (days <= 400) return '1y';
    if (days <= 800) return '2y';
    return '5y';
  }
  if (p.endsWith('d') && /^\d+d$/.test(p)) {
    const days = Number(p.slice(0, -1));
    if (days <= 5) return '5d';
    if (days <= 30) return '1mo';
    if (days <= 90) return '3mo';
    if (days <= 180) return '6mo';
    if (days <= 400) return '1y';
    if (days <= 800) return '2y';
    return '5y';
  }
  return p;
}

async function prepareData(symbols, period = '1y') {
  const lookback = mapPeriod(period);
  const histories = [];
  const failed = [];

  // Prefer a longer window when the caller asks for ≤1y so IPOs and sparse
  // listings still have a chance to accumulate enough overlapping sessions.
  const candidates = lookback === '1y' || lookback === '6mo' || lookback === '3mo'
    ? [lookback, '2y', '5y']
    : [lookback];

  for (const symbol of symbols) {
    let loaded = null;
    let lastErr = null;
    for (const candidate of candidates) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const hist = await marketData.getHistoricalData(symbol, candidate);
        if (!loaded || hist.dates.length > loaded.dates.length) {
          loaded = hist;
        }
        if (hist.dates.length >= 60) break;
      } catch (err) {
        lastErr = err;
      }
    }
    if (loaded) histories.push(loaded);
    else failed.push(`${symbol}: ${lastErr?.message || 'no history'}`);
  }

  if (failed.length) {
    throw badRequest(`Live market data unavailable for: ${failed.join('; ')}`);
  }

  const lengths = histories.map((h) => `${h.symbol}=${h.dates.length}d`);
  const short = histories.filter((h) => h.dates.length < 30);
  if (short.length) {
    throw badRequest(
      `These symbols do not have enough trading history for optimization (need ≥ 30 sessions): ${
        short.map((h) => `${h.symbol} (${h.dates.length} days)`).join(', ')
      }. Remove newly listed / illiquid names and try again. History loaded: ${lengths.join(', ')}.`,
    );
  }

  let common = new Set(histories[0].dates);
  for (let i = 1; i < histories.length; i += 1) {
    const set = new Set(histories[i].dates);
    common = new Set([...common].filter((d) => set.has(d)));
  }
  const dates = [...common].sort();
  if (dates.length < 30) {
    throw badRequest(
      `Insufficient overlapping live history for optimization (need ≥ 30 shared sessions, got ${dates.length}). ` +
        `Per-symbol history: ${lengths.join(', ')}. ` +
        `Usually one ticker is a new listing — drop it or pick stocks with longer price history.`,
    );
  }

  const priceMaps = histories.map((h) =>
    Object.fromEntries(h.dates.map((d, i) => [d, h.prices[i]])),
  );
  // Keep symbol order aligned with the original request, not fetch order.
  const bySymbol = Object.fromEntries(histories.map((h, i) => [h.symbol, priceMaps[i]]));
  const alignedPrices = symbols.map((symbol) => {
    const normalized = marketData.normalizeSymbol(symbol);
    const map = bySymbol[normalized] || bySymbol[symbol];
    return dates.map((d) => map[d]);
  });

  const returnsMatrix = alignedPrices.map((prices) =>
    prices.slice(1).map((p, t) => (p - prices[t]) / prices[t]),
  );

  if (returnsMatrix[0].length < 30) {
    throw badRequest('Insufficient live return observations for optimization');
  }

  return { symbols, returnsMatrix, dates };
}

function expectedReturns(returnsMatrix) {
  return returnsMatrix.map((series) => mean(series) * TRADING_DAYS);
}

function portfolioMetrics(weights, mu, cov) {
  const expReturn = weights.reduce((acc, w, i) => acc + w * mu[i], 0);
  const variance = quadraticForm(weights, cov);
  const vol = Math.sqrt(Math.max(variance, 0));
  const sharpe = vol ? (expReturn - env.RISK_FREE_RATE) / vol : 0;
  return {
    expected_return: expReturn,
    expected_volatility: vol,
    sharpe_ratio: sharpe,
  };
}

function result(symbols, weights, mu, cov, optimizationType, metadata = {}) {
  const metrics = portfolioMetrics(weights, mu, cov);
  return {
    symbols,
    weights,
    ...metrics,
    optimization_type: optimizationType,
    metadata,
  };
}

export async function meanVarianceOptimization(
  symbols,
  riskTolerance = 'moderate',
  lookbackPeriod = '1y',
) {
  const { returnsMatrix } = await prepareData(symbols, lookbackPeriod);
  const mu = expectedReturns(returnsMatrix);
  const cov = shrinkCovariance(returnsMatrix);
  const delta = RISK_TOLERANCE_DELTA[riskTolerance] || RISK_TOLERANCE_DELTA.moderate;
  const weights = optimizeUtility(mu, cov, delta);
  return result(symbols, weights, mu, cov, 'mean_variance', { risk_tolerance: riskTolerance, delta });
}

export async function minimumVarianceOptimization(symbols, lookbackPeriod = '1y') {
  const { returnsMatrix } = await prepareData(symbols, lookbackPeriod);
  const mu = expectedReturns(returnsMatrix);
  const cov = shrinkCovariance(returnsMatrix);
  const weights = optimizeMinVariance(cov);
  return result(symbols, weights, mu, cov, 'minimum_variance');
}

export async function riskParityOptimization(symbols, lookbackPeriod = '1y') {
  const { returnsMatrix } = await prepareData(symbols, lookbackPeriod);
  const mu = expectedReturns(returnsMatrix);
  const cov = shrinkCovariance(returnsMatrix);
  const weights = optimizeRiskParity(cov);
  return result(symbols, weights, mu, cov, 'risk_parity');
}

export async function blackLittermanOptimization(
  symbols,
  views = {},
  lookbackPeriod = '1y',
  riskTolerance = 'moderate',
) {
  const { returnsMatrix } = await prepareData(symbols, lookbackPeriod);
  const cov = shrinkCovariance(returnsMatrix);
  const delta = RISK_TOLERANCE_DELTA[riskTolerance] || RISK_TOLERANCE_DELTA.moderate;
  const n = symbols.length;
  const wMkt = Array(n).fill(1 / n);
  const pi = matrixVector(cov, wMkt).map((x) => delta * x);

  // Views: absolute expected returns keyed by symbol
  const viewSymbols = Object.keys(views || {}).filter((s) => symbols.includes(s));
  let mu;
  if (!viewSymbols.length) {
    mu = pi;
  } else {
    const tau = 0.05;
    const P = viewSymbols.map((sym) => symbols.map((s) => (s === sym ? 1 : 0)));
    const Q = viewSymbols.map((sym) => Number(views[sym]));
    // Posterior: μ = [(τΣ)^-1 + P'Ω^-1 P]^-1 [(τΣ)^-1 π + P'Ω^-1 Q]
    // Use simplified blend: μ = (π + τ-weighted views)/norm
    mu = [...pi];
    for (let i = 0; i < viewSymbols.length; i += 1) {
      const idx = symbols.indexOf(viewSymbols[i]);
      mu[idx] = (1 - tau) * pi[idx] + tau * Q[i];
    }
    // keep unused vars for clarity of BL intent
    void P;
  }

  const weights = optimizeUtility(mu, cov, delta);
  return result(symbols, weights, mu, cov, 'black_litterman', {
    risk_tolerance: riskTolerance,
    views: viewSymbols,
  });
}

export async function monteCarloOptimization(
  symbols,
  riskTolerance = 'moderate',
  lookbackPeriod = '1y',
  numSimulations = 5000,
) {
  const { returnsMatrix } = await prepareData(symbols, lookbackPeriod);
  const mu = expectedReturns(returnsMatrix);
  const cov = shrinkCovariance(returnsMatrix);
  const n = symbols.length;
  const sims = Math.min(Math.max(numSimulations, 500), 20000);

  let best = null;
  for (let i = 0; i < sims; i += 1) {
    const weights = dirichletSample(Array(n).fill(1));
    const metrics = portfolioMetrics(weights, mu, cov);
    const score =
      riskTolerance === 'conservative'
        ? -metrics.expected_volatility
        : riskTolerance === 'aggressive'
          ? metrics.expected_return
          : metrics.sharpe_ratio;
    if (!best || score > best.score) {
      best = { weights, metrics, score };
    }
  }

  return {
    symbols,
    weights: best.weights,
    ...best.metrics,
    optimization_type: 'monte_carlo',
    num_simulations: sims,
    risk_tolerance: riskTolerance,
    metadata: { selection: riskTolerance },
  };
}

function applyBoxConstraints(weights, symbols, minWeights = {}, maxWeights = {}) {
  const clamped = weights.map((w, i) => {
    const sym = symbols[i];
    const bare = sym.replace(/\.(NS|BO)$/, '');
    const minPct = minWeights[sym] ?? minWeights[bare] ?? 0;
    const maxPct = maxWeights[sym] ?? maxWeights[bare] ?? 100;
    const min = Math.max(0, Number(minPct) / 100);
    const max = Math.min(1, Number(maxPct) / 100);
    return Math.min(max, Math.max(min, w));
  });
  const sum = clamped.reduce((a, b) => a + b, 0) || 1;
  return clamped.map((w) => w / sum);
}

async function finalizeResult(
  symbols,
  weights,
  optimizationType,
  lookback,
  metadata = {},
  minWeights,
  maxWeights,
) {
  let w = weights;
  if (minWeights || maxWeights) {
    w = applyBoxConstraints(w, symbols, minWeights, maxWeights);
    metadata = { ...metadata, constraints_applied: true };
  }
  const { returnsMatrix } = await prepareData(symbols, lookback);
  const mu = expectedReturns(returnsMatrix);
  const cov = shrinkCovariance(returnsMatrix);
  return result(symbols, w, mu, cov, optimizationType, metadata);
}

export async function optimizePortfolio(request) {
  const {
    symbols,
    optimization_type: type,
    risk_tolerance: riskTolerance = 'moderate',
    lookback_period: lookback = '1y',
    views = {},
    num_simulations: sims,
    min_weights: minWeights,
    max_weights: maxWeights,
  } = request;

  if (!symbols?.length || symbols.length < 2) {
    throw badRequest('At least 2 symbols are required');
  }

  const period = mapPeriod(lookback);

  switch (type) {
    case 'mean_variance': {
      const { returnsMatrix } = await prepareData(symbols, period);
      const mu = expectedReturns(returnsMatrix);
      const cov = shrinkCovariance(returnsMatrix);
      const delta = RISK_TOLERANCE_DELTA[riskTolerance] || RISK_TOLERANCE_DELTA.moderate;
      const weights = optimizeUtility(mu, cov, delta);
      return finalizeResult(
        symbols,
        weights,
        'mean_variance',
        period,
        { risk_tolerance: riskTolerance, delta },
        minWeights,
        maxWeights,
      );
    }
    case 'minimum_variance': {
      const { returnsMatrix } = await prepareData(symbols, period);
      const mu = expectedReturns(returnsMatrix);
      const cov = shrinkCovariance(returnsMatrix);
      const weights = optimizeMinVariance(cov);
      return finalizeResult(symbols, weights, 'minimum_variance', period, {}, minWeights, maxWeights);
    }
    case 'risk_parity': {
      const { returnsMatrix } = await prepareData(symbols, period);
      const mu = expectedReturns(returnsMatrix);
      const cov = shrinkCovariance(returnsMatrix);
      const weights = optimizeRiskParity(cov);
      return finalizeResult(symbols, weights, 'risk_parity', period, {}, minWeights, maxWeights);
    }
    case 'black_litterman': {
      const res = await blackLittermanOptimization(symbols, views, period, riskTolerance);
      return finalizeResult(
        symbols,
        res.weights,
        'black_litterman',
        period,
        res.metadata,
        minWeights,
        maxWeights,
      );
    }
    case 'monte_carlo': {
      const res = await monteCarloOptimization(symbols, riskTolerance, period, sims || 5000);
      return finalizeResult(
        symbols,
        res.weights,
        'monte_carlo',
        period,
        { ...res.metadata, num_simulations: res.num_simulations },
        minWeights,
        maxWeights,
      );
    }
    default:
      throw badRequest(`Unsupported optimization_type: ${type}`);
  }
}

export function suggestAssetAllocation(riskTolerance = 'moderate', investmentHorizon = 60) {
  const base = {
    conservative: { equity: 40, debt: 45, gold: 10, cash: 5 },
    moderate: { equity: 60, debt: 25, gold: 10, cash: 5 },
    aggressive: { equity: 80, debt: 10, gold: 5, cash: 5 },
  }[riskTolerance] || { equity: 60, debt: 25, gold: 10, cash: 5 };

  if (investmentHorizon < 24) {
    base.equity = Math.max(20, base.equity - 15);
    base.cash += 10;
    base.debt += 5;
  } else if (investmentHorizon > 84) {
    base.equity = Math.min(90, base.equity + 10);
    base.debt = Math.max(5, base.debt - 5);
    base.cash = Math.max(0, base.cash - 5);
  }
  return base;
}
