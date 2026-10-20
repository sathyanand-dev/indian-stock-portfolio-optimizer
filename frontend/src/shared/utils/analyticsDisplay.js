/** Normalize API metrics that may be ratios (0.15) or percents (15). */
export function asRatio(value) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return null;
  }
  const n = Number(value);
  return Math.abs(n) > 5 ? n / 100 : n;
}

export function enrichPortfolioAnalytics(analytics) {
  if (!analytics?.performance_analysis) return analytics;

  const pa = { ...analytics.performance_analysis };
  const totalReturnRatio = asRatio(pa.total_return);

  if (pa.total_return_percentage == null && totalReturnRatio != null) {
    pa.total_return_percentage = totalReturnRatio;
  }

  const risk = analytics.risk_analysis || {};
  pa.sharpe_ratio = pa.sharpe_ratio ?? risk.sharpe_ratio;
  pa.volatility = pa.volatility ?? risk.volatility;
  pa.max_drawdown = pa.max_drawdown ?? risk.max_drawdown;
  pa.var_95 = pa.var_95 ?? risk.var_95;
  pa.cvar_95 = pa.cvar_95 ?? risk.cvar_95;

  return { ...analytics, performance_analysis: pa };
}

export function portfolioCostBasis(portfolio) {
  if (portfolio?.investment_amount) return Number(portfolio.investment_amount);
  return (
    portfolio?.holdings?.reduce(
      (sum, h) => sum + (Number(h.quantity) || 0) * (Number(h.avg_purchase_price) || 0),
      0,
    ) || 0
  );
}

export function portfolioDisplayValue(portfolio) {
  const pa = portfolio?.analytics?.performance_analysis;
  const live = pa?.current_value;
  if (live != null && Number.isFinite(Number(live)) && Number(live) > 0) {
    return Number(live);
  }
  return portfolioCostBasis(portfolio);
}
