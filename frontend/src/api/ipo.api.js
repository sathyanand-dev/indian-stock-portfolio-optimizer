import apiClient from './client';

export async function listIpos(status = 'open') {
  const response = await apiClient.get('/api/v1/ipo', {
    params: { status },
  });
  return response.data;
}

export async function getIpo(symbol) {
  const response = await apiClient.get(
    `/api/v1/ipo/${encodeURIComponent(symbol)}`,
  );
  return response.data;
}

export async function getIpoAnalysis(symbol) {
  const response = await apiClient.get(
    `/api/v1/ipo/${encodeURIComponent(symbol)}/analysis`,
  );
  return response.data;
}
