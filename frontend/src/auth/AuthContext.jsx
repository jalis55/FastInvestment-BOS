import { AUTH_EXPIRED_EVENT } from '../api/client';
import { queryCache } from '../api/query-cache';
// src/auth/AuthContext.jsx
import {
  useCallback,
  useEffect,
  useState,
} from 'react';
import API from '../api/axios';

import { AuthContext } from './context';

/* ------------------------------------------------------------------ */
/* Provider                                                           */
/* ------------------------------------------------------------------ */
export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const applySession = useCallback((sessionData) => {
    if (!sessionData?.authenticated || !sessionData?.user) {
      setUser(null);
      setUserData(null);
      return false;
    }

    const currentUser = sessionData.user;
    setUser({
      id: currentUser.id,
      is_admin: Boolean(currentUser.is_admin),
      is_super_admin: Boolean(currentUser.is_super_admin),
      roles: currentUser.role ? [currentUser.role] : [],
    });
    setUserData(currentUser);
    return true;
  }, []);

  const ensureCsrfCookie = useCallback(async () => {
    await API.get('/api/session/', { skipAuthRefresh: true });
  }, []);

  const fetchSession = useCallback(async ({ allowRefresh = false } = {}) => {
    try {
      const { data } = await API.get('/api/session/', { skipAuthRefresh: true });
      if (applySession(data)) {
        return true;
      }

      if (allowRefresh) {
        try {
          await API.post('/api/token/refresh/', {}, { skipAuthRefresh: true });
          const refreshedSession = await API.get('/api/session/', { skipAuthRefresh: true });
          return applySession(refreshedSession.data);
        } catch {
          setUser(null);
          setUserData(null);
          return false;
        }
      }

      return false;
    } catch (error) {
      if (error?.response?.status !== 401) {
        console.error('Failed to fetch current session:', error);
      }
      setUser(null);
      setUserData(null);
      return false;
    }
  }, [applySession]);

  useEffect(() => {
    const expire = () => applySession(null);
    window.addEventListener(AUTH_EXPIRED_EVENT, expire);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, expire);
  }, [applySession]);

  /* Hydrate on mount */
  useEffect(() => {
    let active = true;
    // Defer hydration so StrictMode's first, discarded effect never starts a request.
    const timer = setTimeout(() => {
      fetchSession({ allowRefresh: true }).finally(() => { if (active) setIsLoading(false); });
    }, 0);
    return () => { active = false; clearTimeout(timer); };
  }, [fetchSession]);

  const hasRole = useCallback(
    (requiredRoles = []) => {
      if (!user) return false;
      if (user.is_super_admin) return true;
      if (!requiredRoles || requiredRoles.length === 0) return true;

      if (requiredRoles.includes('admin') && user.is_admin) return true;
      if (requiredRoles.includes('user') && !user.is_admin) return true;

      return requiredRoles.some((role) => user.roles?.includes(role));
    },
    [user]
  );

  /* Auth actions */
  const login = async (email, password) => {
    try {
      await ensureCsrfCookie();
      const { data, status } = await API.post('/api/token/', { email, password });
      if (status === 200) {
        queryCache.clear();
        applySession(data);
      }
      return status;
    }
    catch (error) {
      return error?.response?.status || error.message;
    }
  };

  const register = async (email, password) => {
    const { status } = await API.post('/api/user-register/', { email, password });
    return status;
  };

  const logout = async () => {
    await ensureCsrfCookie();
    await API.post('/api/logout/');
    queryCache.clear();
    applySession(null);
  };

  const value = {
    user,
    userData,
    setUserData,
    isLoading,
    loading: isLoading,
    login,
    register,
    logout,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
