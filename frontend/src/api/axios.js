import axios from 'axios';

const baseUrl =import.meta.env.VITE_API_URL;

const API = axios.create({
  baseURL: baseUrl ,
  withCredentials: true,
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
        await axios.post(
          '/api/token/refresh/',
          {},
          { baseURL: API.defaults.baseURL, withCredentials: true }
        );
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
