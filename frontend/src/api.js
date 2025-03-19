import axios from "axios";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "./constants";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(ACCESS_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        const refreshToken = localStorage.getItem(REFRESH_TOKEN);
        if (!refreshToken) throw new Error("No refresh token");

        const { data } = await axios.post(`${process.env.REACT_APP_API_URL}/api/token/refresh/`, {
          refresh: refreshToken,
        });

        localStorage.setItem(ACCESS_TOKEN, data.access);
        error.config.headers.Authorization = `Bearer ${data.access}`;
        return api(error.config);
      } catch (refreshError) {
        localStorage.removeItem(ACCESS_TOKEN);
        localStorage.removeItem(REFRESH_TOKEN);
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
