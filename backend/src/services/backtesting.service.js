import { env } from '../config/env.js';
import { TRADING_DAYS } from '../config/constants.js';
import { badRequest } from '../lib/errors.js';
import { mean, normalSample, percentile, std } from '../lib/math.js';
import { calculatePerformanceMetrics } from './analytics.service.js';
import * as marketData from './marketData.service.js';

function rebalanceDays(frequency) {
  switch (frequency) {
    case 'daily':
      return 1;
    case 'weekly':
      return 5;
    case 'quarterly':
      return 63;
    case 'monthly':
    default:
      return 21;
  }
}

export async function backtestPortfolio({
  symbols,
  weights,
  start_date: startDate,
  end_date: endDate,
  benchmark = '^NSEI',
  rebalance_frequency: rebalanceFrequency = 'monthly',
  initial_amount: initialAmount = 100000,
  transaction_cost: transactionCost = 0.001,
}) {
  if (!symbols?.length || symbols.length !== weights?.length) {
    throw badRequest('symbols and weights are required and must match');
  }

  const weightSum = weights.reduce((a, b) => a + b, 0) || 1;
  const target = weights.map((w) => w / weightSum);

  const histories = await Promise.all(
    symbols.map((s) => marketData.getHistoricalData(s, '5y')),
  );

  let common = new Set(histories[0].dates);
  for (let i = 1; i < histories.length; i += 1) {
    const set = new Set(histories[i].dates);
    common = new Set([...common].filter((d) => set.has(d)));
  }
  let dates = [...common].sort();
  if (startDate) dates = dates.filter((d) => d >= startDate);
  if (endDate) dates = dates.filter((d) => d <= endDate);
  if (dates.length < 30) throw badRequest('Insufficient history for backtest window');

  const priceMaps = histories.map((h) =>
    Object.fromEntries(h.dates.map((d, i) => [d, h.prices[i]])),
  );

  let value = initialAmount;
  let holdings = target.map((w, i) => (w * value) / priceMaps[i][dates[0]]);
  const every = rebalanceDays(rebalanceFrequency);
  const portfolioReturns = [];
  const daily = [];
  const drawdowns = [];

  let peak = value;

  for (let t = 1; t < dates.length; t += 1) {
    const prevValue = value;
    value = holdings.reduce((acc, qty, i) => acc + qty * priceMaps[i][dates[t]], 0);

    if (t % every === 0) {
      const cost = value * transactionCost;
      value -= cost;
      holdings = target.map((w, i) => (w * value) / priceMaps[i][dates[t]]);
    }

    const ret = prevValue ? (value - prevValue) / prevValue : 0;
    portfolioReturns.push(ret);
    peak = Math.max(peak, value);
    const dd = (value - peak) / peak;
    daily.push({ date: dates[t], portfolio_value: value, return: ret });
    if (dd < -0.05) {
      drawdowns.push({ date: dates[t], drawdown: dd });
    }
  }

  let benchmarkReturns = null;
  try {
    const bench = await marketData.getHistoricalData(benchmark, '5y');
    const map = Object.fromEntries(bench.dates.map((d, i) => [d, bench.prices[i]]));
    benchmarkReturns = [];
    for (let t = 1; t < dates.length; t += 1) {
      if (map[dates[t]] && map[dates[t - 1]]) {
        benchmarkReturns.push((map[dates[t]] - map[dates[t - 1]]) / map[dates[t - 1]]);
      } else {
        benchmarkReturns.push(0);
      }
    }
  } catch {
    benchmarkReturns = portfolioReturns.map(() => 0);
  }

  const metrics = calculatePerformanceMetrics(portfolioReturns, benchmarkReturns);

  return {
    portfolio_returns: portfolioReturns,
    benchmark_returns: benchmarkReturns,
    dates: dates.slice(1),
    performance_metrics: metrics,
    drawdown_periods: drawdowns.slice(0, 50),
    sector_allocation: Object.fromEntries(symbols.map((s, i) => [s, target[i]])),
    // Frontend-friendly aliases
    total_return: metrics.total_return,
    annual_return: metrics.annualized_return,
    volatility: metrics.volatility,
    sharpe_ratio: metrics.sharpe_ratio,
    max_drawdown: metrics.max_drawdown,
    daily_returns: daily,
  };
}

export async function monteCarloSimulation({
  symbols,
  weights,
  horizon_days: horizonDays = 252,
  num_simulations: numSimulations = 1000,
  initial_investment: initialInvestment = 100000,
}) {
  if (!symbols?.length || symbols.length !== weights?.length) {
    throw badRequest('symbols and weights required');
  }

  const histories = await Promise.all(
    symbols.map((s) => marketData.getHistoricalData(s, '2y')),
  );

  const weightSum = weights.reduce((a, b) => a + b, 0) || 1;
  const w = weights.map((x) => x / weightSum);

  // Build portfolio daily returns from overlapping history
  let common = new Set(histories[0].dates);
  for (let i = 1; i < histories.length; i += 1) {
    const set = new Set(histories[i].dates);
    common = new Set([...common].filter((d) => set.has(d)));
  }
  const dates = [...common].sort();
  const maps = histories.map((h) =>
    Object.fromEntries(h.dates.map((d, i) => [d, h.prices[i]])),
  );
  const portReturns = [];
  for (let t = 1; t < dates.length; t += 1) {
    let r = 0;
    for (let i = 0; i < symbols.length; i += 1) {
      r += w[i] * ((maps[i][dates[t]] - maps[i][dates[t - 1]]) / maps[i][dates[t - 1]]);
    }
    portReturns.push(r);
  }

  const mu = mean(portReturns);
  const sigma = std(portReturns);
  const finals = [];

  for (let s = 0; s < numSimulations; s += 1) {
    let value = initialInvestment;
    for (let d = 0; d < horizonDays; d += 1) {
      value *= 1 + mu + sigma * normalSample();
    }
    finals.push(value);
  }

  finals.sort((a, b) => a - b);
  return {
    final_values: finals,
    statistics: {
      mean: mean(finals),
      median: percentile(finals, 50),
      p5: percentile(finals, 5),
      p95: percentile(finals, 95),
      std: std(finals),
      risk_free_rate: env.RISK_FREE_RATE,
      trading_days: TRADING_DAYS,
    },
    parameters: {
      symbols,
      weights: w,
      horizon_days: horizonDays,
      num_simulations: numSimulations,
      initial_investment: initialInvestment,
    },
  };
}

export async function stressTest({ symbols, weights }) {
  const scenarios = [
    { name: 'Market Crash -20%', shock: -0.2 },
    { name: 'Severe Crash -40%', shock: -0.4 },
    { name: 'Rate Spike', shock: -0.12 },
    { name: 'Mild Correction -10%', shock: -0.1 },
    { name: 'Rally +15%', shock: 0.15 },
  ];

  const weightSum = weights.reduce((a, b) => a + b, 0) || 1;
  const w = weights.map((x) => x / weightSum);

  return {
    scenarios: scenarios.map((s) => ({
      name: s.name,
      portfolio_impact: s.shock,
      estimated_loss_pct: s.shock * 100,
      contribution: Object.fromEntries(symbols.map((sym, i) => [sym, w[i] * s.shock])),
    })),
  };
}
