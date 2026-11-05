import axios from 'axios';

export const AUTH_EXPIRED_EVENT = 'auth:expired';

export function createApiClient({ baseURL, getCsrfToken = () => '', onExpired = () => {}, onMutation = () => {} } = {}) {
  const client = axios.create({
    baseURL, withCredentials: true, timeout: 15000,
    xsrfCookieName: 'csrftoken', xsrfHeaderName: 'X-CSRFToken',
  });
  let refreshPromise;
  client.interceptors.request.use((config) => {
    if (!['get', 'head', 'options', 'trace'].includes((config.method || 'get').toLowerCase())) {
      const token = getCsrfToken();
      if (token) config.headers['X-CSRFToken'] = token;
    }
    return config;
  });
  client.interceptors.response.use((response) => {
    const { method = 'get', url = '' } = response.config;
    if (!['get', 'head', 'options'].includes(method.toLowerCase()) && !/\/api\/(token|logout)/.test(url)) onMutation();
    return response;
  }, async (error) => {
    const request = error.config;
    if (error.response?.status !== 401 || !request || request._retry || request.skipAuthRefresh || /\/api\/(token|logout)/.test(request.url || '')) throw error;
    // Mark every waiting request before joining the refresh, so a retried 401 cannot loop.
    request._retry = true;
    if (!refreshPromise) {
      refreshPromise = client.post('/api/token/refresh/', {}, { skipAuthRefresh: true })
        .catch((refreshError) => {
          if ([400, 401, 403].includes(refreshError.response?.status)) onExpired();
          throw refreshError;
        })
        .finally(() => { refreshPromise = null; });
    }
    await refreshPromise;
    return client(request);
  });
  return client;
}
