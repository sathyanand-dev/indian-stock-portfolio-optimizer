/**
 * Extract a user-facing message from Axios / API errors.
 */
export function getApiErrorMessage(
  error,
  fallback = 'Something went wrong. Please try again.'
) {
  if (!error || typeof error !== 'object') {
    return fallback;
  }

  const detail = error.response?.data?.detail;

  if (typeof detail === 'string' && detail.trim()) {
    return detail;
  }

  if (Array.isArray(detail) && detail.length > 0) {
    return detail
      .map((item) => item.msg || item.message || 'Invalid input')
      .join(', ');
  }

  if (
    typeof error.response?.data?.message === 'string' &&
    error.response.data.message.trim()
  ) {
    return error.response.data.message;
  }

  const status = error.response?.status;
  if (status === 401) {
    return 'Incorrect username or password';
  }
  if (status === 403) {
    return 'You do not have permission to perform this action';
  }
  if (status === 404) {
    return 'The requested resource was not found';
  }
  if (status === 409) {
    return 'This conflicts with existing data. Please try a different value.';
  }
  if (status === 422) {
    return 'Invalid input. Please check your entries and try again.';
  }
  if (status === 429) {
    return 'Too many requests. Please wait a moment and try again.';
  }
  if (typeof status === 'number' && status >= 500) {
    return 'Server error. Please try again later.';
  }

  if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
    return 'Cannot reach the server. Check that the backend is running.';
  }

  if (
    typeof error.message === 'string' &&
    error.message &&
    !error.message.startsWith('Request failed')
  ) {
    return error.message;
  }

  return fallback;
}
