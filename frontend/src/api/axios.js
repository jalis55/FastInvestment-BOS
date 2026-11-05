import { AUTH_EXPIRED_EVENT, createApiClient } from './client';
import { queryCache } from './query-cache';

function getCsrfToken() {
  const cookie = document.cookie.split('; ').find((entry) => entry.startsWith('csrftoken='));
  return cookie ? decodeURIComponent(cookie.slice('csrftoken='.length)) : '';
}

const API = createApiClient({
  baseURL: import.meta.env.VITE_API_URL || '/',
  getCsrfToken,
  onExpired: () => {
    queryCache.clear();
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
  },
  onMutation: () => queryCache.invalidate(),
});

export default API;
