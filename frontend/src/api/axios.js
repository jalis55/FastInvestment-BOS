
import axios from 'axios';
import { getRefreshToken, setTokens, clearTokens } from '../auth/AuthContext';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL ,
  // || 'http://127.0.0.1:8001/', // <-- fix
});

/* Attach access token on every request */
API.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('access');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

/* Auto-refresh on 401 */
let isRefreshing = false;
let subscribers = [];

const onRefreshed = (token) =>
  subscribers.forEach((cb) => cb(token));

API.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribers.push((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(API(originalRequest));
          });
        });
      }
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // inside the 401 handler
        const { data } = await axios.post(
          '/api/token/refresh/',
          { refresh: getRefreshToken() },        // <-- key expected by simplejwt
          { baseURL: API.defaults.baseURL }
        );
        setTokens(data.access, data.refresh);    // <-- correct keys
        onRefreshed(data.access);
        return API(originalRequest);
      } catch {
        clearTokens();
        window.location.href = '/login';
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