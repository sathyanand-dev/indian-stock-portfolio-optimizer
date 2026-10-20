import apiClient from './client';

export async function listNotifications({ limit = 30, unreadOnly = false } = {}) {
  const response = await apiClient.get('/api/v1/notifications', {
    params: { limit, ...(unreadOnly ? { unread: 'true' } : {}) },
  });
  return response.data;
}

export async function markNotificationRead(id) {
  const response = await apiClient.post(`/api/v1/notifications/${id}/read`);
  return response.data;
}

export async function markAllNotificationsRead() {
  const response = await apiClient.post('/api/v1/notifications/read-all');
  return response.data;
}

export async function clearNotifications() {
  const response = await apiClient.delete('/api/v1/notifications');
  return response.data;
}

export async function sendTestEmail() {
  const response = await apiClient.post('/api/v1/notifications/test-email');
  return response.data;
}
