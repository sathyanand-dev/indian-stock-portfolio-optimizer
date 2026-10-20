import apiClient from './client';

export async function getCompanyResearch(symbol) {
  const response = await apiClient.get(
    `/api/v1/data/company/${encodeURIComponent(symbol)}/research`,
  );
  return response.data;
}
