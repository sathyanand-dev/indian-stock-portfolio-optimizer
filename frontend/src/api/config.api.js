import apiClient from './client';

/** Public capability flags (Google client ID, whether SMTP is configured, etc.). */
export async function getServerConfig() {
  const response = await apiClient.get('/api/v1/config');
  return response.data;
}
