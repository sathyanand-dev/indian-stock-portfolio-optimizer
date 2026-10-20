import { env } from '../config/env.js';
import { TRADING_DAYS } from '../config/constants.js';
import { maxDrawdown, mean, percentile, std } from '../lib/math.js';
import { badRequest } from '../lib/errors.js';
import * as marketData from './marketData.service.js';

export function calculatePerformanceMetrics(
  returns,
  benchmarkReturns = null,
  riskFreeRate = env.RISK_FREE_RATE,
) {
  const r = returns.filter((x) => Number.isFinite(x));
  if (!r.length) throw badRequest('No valid returns data provided');

  const totalReturn = r.reduce((acc, x) => acc * (1 + x), 1) - 1;
  const annualizedReturn = (1 + totalReturn) ** (TRADING_DAYS / r.length) - 1;
  const volatility = std(r) * Math.sqrt(TRADING_DAYS);

  const dailyRf = riskFreeRate / TRADING_DAYS;
  const excess = r.map((x) => x - dailyRf);
  const excessStd = std(excess);
  const sharpeRatio = excessStd ? (mean(excess) / excessStd) * Math.sqrt(TRADING_DAYS) : 0;

  const downside = r.filter((x) => x < 0);
  const downsideDeviation = downside.length ? std(downside) * Math.sqrt(TRADING_DAYS) : 0;
  const sortinoRatio = downsideDeviation ? (annualizedReturn - riskFreeRate) / downsideDeviation : 0;

  const mdd = maxDrawdown(r);
  const calmarRatio = mdd !== 0 ? annualizedReturn / Math.abs(mdd) : 0;
  const var95 = percentile(r, 5);
  const tail = r.filter((x) => x <= var95);
  const cvar95 = tail.length ? mean(tail) : var95;

  let beta = null;
  let alpha = null;
  if (benchmarkReturns && benchmarkReturns.length === r.length) {
    const b = benchmarkReturns;
    const cov = mean(r.map((x, i) => (x - mean(r)) * (b[i] - mean(b))));
    const bVar = mean(b.map((x) => (x - mean(b)) ** 2));
    beta = bVar ? cov / bVar : 0;
    const benchmarkReturn = mean(b) * TRADING_DAYS;
    alpha = annualizedReturn - (riskFreeRate + beta * (benchmarkReturn - riskFreeRate));
  }

  return {
    total_return: totalReturn,
    annualized_return: annualizedReturn,
    volatility,
    sharpe_ratio: sharpeRatio,
    sortino_ratio: sortinoRatio,
    max_drawdown: mdd,
    calmar_ratio: calmarRatio,
    beta,
    alpha,
    var_95: var95,
    cvar_95: cvar95,
  };
}

export function calculateRiskMetrics(returns, benchmarkReturns = null) {
  const r = returns.filter((x) => Number.isFinite(x));
  const volatility = std(r) * Math.sqrt(TRADING_DAYS);
  const mdd = maxDrawdown(r);
  const var95 = percentile(r, 5);
  const tail = r.filter((x) => x <= var95);
  const cvar95 = tail.length ? mean(tail) : var95;
  const downside = r.filter((x) => x < 0);
  const downsideDeviation = downside.length ? std(downside) * Math.sqrt(TRADING_DAYS) : 0;

  let trackingError = null;
  if (benchmarkReturns && benchmarkReturns.length === r.length) {
    const active = r.map((x, i) => x - benchmarkReturns[i]);
    trackingError = std(active) * Math.sqrt(TRADING_DAYS);
  }

  return {
    volatility,
    max_drawdown: mdd,
    var_95: var95,
    cvar_95: cvar95,
    downside_deviation: downsideDeviation,
    tracking_error: trackingError,
  };
}

function alignPortfolioReturns(symbols, weights, period = '1y') {
  if (symbols.length !== weights.length) {
    throw badRequest('symbols and weights length mismatch');
  }
  const weightSum = weights.reduce((a, b) => a + b, 0) || 1;
  const w = weights.map((x) => x / weightSum);

  return Promise.all(symbols.map((s) => marketData.getHistoricalData(s, period))).then(
    (histories) => {
      let common = new Set(histories[0].dates);
      for (let i = 1; i < histories.length; i += 1) {
        const set = new Set(histories[i].dates);
        common = new Set([...common].filter((d) => set.has(d)));
      }
      const dates = [...common].sort();
      if (dates.length < 30) throw badRequest('Insufficient overlapping history');

      const priceMaps = histories.map((h) =>
        Object.fromEntries(h.dates.map((d, i) => [d, h.prices[i]])),
      );

      const portfolioReturns = [];
      const values = [];
      let value = 1;
      values.push({ date: dates[0], value });

      for (let t = 1; t < dates.length; t += 1) {
        let daily = 0;
        for (let i = 0; i < symbols.length; i += 1) {
          const prev = priceMaps[i][dates[t - 1]];
          const curr = priceMaps[i][dates[t]];
          daily += w[i] * ((curr - prev) / prev);
        }
        portfolioReturns.push(daily);
        value *= 1 + daily;
        values.push({ date: dates[t], value });
      }

      return { dates: dates.slice(1), portfolioReturns, values, weights: w };
    },
  );
}

export async function analyzePortfolioPerformance({
  symbols,
  weights,
  startDate,
  endDate,
  benchmark = '^NSEI',
  period = '1y',
}) {
  const { dates, portfolioReturns, values, weights: w } = await alignPortfolioReturns(
    symbols,
    weights,
    period,
  );

  let benchmarkReturns = null;
  try {
    const bench = await marketData.getHistoricalData(benchmark, period);
    const map = Object.fromEntries(bench.dates.map((d, i) => [d, bench.prices[i]]));
    benchmarkReturns = [];
    for (let i = 0; i < dates.length; i += 1) {
      const d = dates[i];
      const prevDate = values[i].date;
      if (map[d] && map[prevDate]) {
        benchmarkReturns.push((map[d] - map[prevDate]) / map[prevDate]);
      } else {
        benchmarkReturns.push(0);
      }
    }
  } catch {
    benchmarkReturns = null;
  }

  const performance = calculatePerformanceMetrics(portfolioReturns, benchmarkReturns);
  const risk = calculateRiskMetrics(portfolioReturns, benchmarkReturns);

  const invested = 1;
  const currentValue = values[values.length - 1]?.value || 1;

  return {
    performance_analysis: {
      ...performance,
      current_value: currentValue,
      invested_value: invested,
      start_date: startDate || values[0]?.date,
      end_date: endDate || values[values.length - 1]?.date,
    },
    risk_analysis: risk,
    historical_performance: values.map((v, i) => ({
      date: v.date,
      portfolio_value: v.value,
      return: i === 0 ? 0 : portfolioReturns[i - 1],
    })),
    weights: Object.fromEntries(symbols.map((s, i) => [s, w[i]])),
    symbols,
  };
}
