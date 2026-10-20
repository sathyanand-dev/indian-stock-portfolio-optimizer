import apiClient from './client';

export async function runBacktest(request) {
  const response = await apiClient.post(
    '/api/v1/backtesting/backtest',
    request
  );
  return response.data;
}

export async function comparePortfolios(portfolios, startDate, endDate) {
  const response = await apiClient.post('/api/v1/backtesting/compare', {
    portfolios,
    start_date: startDate,
    end_date: endDate,
  });
  const data = response.data;
  if (data?.strategies) {
    const normalized = {};
    for (const row of data.strategies) {
      normalized[row.name] = {
        ...row,
        annual_return: row.annual_return ?? row.annualized_return,
      };
    }
    return normalized;
  }
  return data;
}
