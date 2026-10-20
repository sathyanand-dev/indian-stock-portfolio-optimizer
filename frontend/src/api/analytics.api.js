import apiClient from './client';

export async function getPerformanceMetrics(
  symbols,
  weights,
  period = '1y'
) {
  const response = await apiClient.post('/api/v1/analytics/performance', {
    symbols,
    weights,
    period,
  });
  return response.data;
}
