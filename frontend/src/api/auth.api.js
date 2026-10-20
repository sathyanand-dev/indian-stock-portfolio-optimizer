import apiClient, { setToken, removeToken, isAuthenticated } from './client';

export async function login({ username, password }) {
  const formData = new URLSearchParams();
  formData.append('username', username);
  formData.append('password', password);

  const response = await apiClient.post('/api/v1/auth/login', formData, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
  return response.data;
}

export async function register(userData) {
  const response = await apiClient.post('/api/v1/auth/register', userData);
  return response.data;
}

export async function getCurrentUser() {
  const response = await apiClient.get('/api/v1/auth/me');
  return response.data;
}

export async function updateCurrentUser(payload) {
  const response = await apiClient.put('/api/v1/auth/me', payload);
  return response.data;
}

export async function deleteCurrentUser() {
  const response = await apiClient.delete('/api/v1/auth/me');
  return response.data;
}

/** Exchanges a Google ID token (from Google Identity Services) for an app token. */
export async function loginWithGoogle(credential) {
  const response = await apiClient.post('/api/v1/auth/google', { credential });
  return response.data;
}

export async function changePassword({ currentPassword, newPassword }) {
  const response = await apiClient.post('/api/v1/auth/change-password', {
    ...(currentPassword ? { current_password: currentPassword } : {}),
    new_password: newPassword,
  });
  return response.data;
}

export async function getPreferences() {
  const response = await apiClient.get('/api/v1/auth/me/preferences');
  return response.data;
}

export async function updatePreferences(payload) {
  const response = await apiClient.put('/api/v1/auth/me/preferences', payload);
  return response.data;
}

export async function resetPreferences() {
  const response = await apiClient.post('/api/v1/auth/me/preferences/reset');
  return response.data;
}

export async function exportAccount() {
  const response = await apiClient.get('/api/v1/auth/me/export');
  return response.data;
}

export { setToken, removeToken, isAuthenticated };
