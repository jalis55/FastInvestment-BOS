import axios from 'axios';

const baseUrl =import.meta.env.VITE_API_URL;

const getCookie = (name) => {
  if (typeof document === 'undefined') {
    return '';
  }

  const cookie = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${name}=`));

  return cookie ? decodeURIComponent(cookie.split('=').slice(1).join('=')) : '';
};

const API = axios.create({
  baseURL: baseUrl ,
  withCredentials: true,
  xsrfCookieName: 'csrftoken',
  xsrfHeaderName: 'X-CSRFToken',
});

API.interceptors.request.use((config) => {
  const method = (config.method || 'get').toLowerCase();
  const csrfSafeMethod = ['get', 'head', 'options', 'trace'].includes(method);

  if (!csrfSafeMethod) {
    const csrfToken = getCookie('csrftoken');
    if (csrfToken) {
      config.headers = config.headers || {};
      config.headers['X-CSRFToken'] = csrfToken;
    }
  }

  return config;
});

/* Auto-refresh on 401 */
let isRefreshing = false;
let subscribers = [];

const onRefreshed = () => subscribers.forEach((cb) => cb());

API.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest) {
      return Promise.reject(error);
    }

    const requestUrl = originalRequest?.url || '';

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.skipAuthRefresh &&
      !requestUrl.includes('/api/token/refresh/') &&
      !requestUrl.includes('/api/token/')
    ) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribers.push(() => resolve(API(originalRequest)));
        });
      }
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await API.post('/api/token/refresh/', {}, { skipAuthRefresh: true });
        onRefreshed();
        return API(originalRequest);
      } catch {
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
        subscribers = [];
      }
    }
    return Promise.reject(error);
  }
);

export default API;
