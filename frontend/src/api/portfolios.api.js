import apiClient from './client';

export async function createPortfolio(portfolio) {
  const response = await apiClient.post('/api/v1/portfolios/', portfolio);
  return response.data;
}

export async function getPortfolios() {
  const response = await apiClient.get('/api/v1/portfolios/');
  return response.data;
}

export async function getPortfolio(id) {
  const response = await apiClient.get(`/api/v1/portfolios/${id}`);
  return response.data;
}

export async function updatePortfolio(id, portfolio) {
  const response = await apiClient.put(`/api/v1/portfolios/${id}`, portfolio);
  return response.data;
}

export async function deletePortfolio(id) {
  await apiClient.delete(`/api/v1/portfolios/${id}`);
}

export async function getPortfolioAnalytics(portfolioId) {
  const response = await apiClient.get(
    `/api/v1/portfolios/${portfolioId}/performance`
  );
  return response.data;
}

export const getPortfolioPerformance = getPortfolioAnalytics;
