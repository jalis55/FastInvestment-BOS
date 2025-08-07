// src/auth/AuthContext.jsx
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { jwtDecode } from 'jwt-decode';
import API from '../api/axios';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

/* ------------------------------------------------------------------ */
/* Token helpers                                                      */
/* ------------------------------------------------------------------ */
const TOKEN_KEY   = 'access';
const REFRESH_KEY = 'refresh';

export const getRefreshToken = () => localStorage.getItem(REFRESH_KEY);
export const setTokens = (access, refresh) => {
  localStorage.setItem(TOKEN_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
};
export const clearTokens = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
};

/* ------------------------------------------------------------------ */
/* Decode JWT                                                         */
/* ------------------------------------------------------------------ */
const decodeUser = (token) => {
  try {
    const decoded = jwtDecode(token);
    return {
      id: decoded.user_id,
      email: decoded.email,
      name: decoded.name,
      is_admin: decoded.is_admin,
      is_super_admin: decoded.is_super_admin,
      roles: decoded.roles || [],
    };
  } catch {
    return null;
  }
};

/* ------------------------------------------------------------------ */
/* Provider                                                           */
/* ------------------------------------------------------------------ */
export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  /* Hydrate on mount */
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    setUser(token ? decodeUser(token) : null);
    setIsLoading(false);
  }, []);

  /* ✅ Stable role-checker via useCallback */
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
    const { data, status } = await API.post('/api/token/', { email, password });
    if (status === 200) {
      setTokens(data.access, data.refresh);
      setUser(decodeUser(data.access));
    }
    return status;
  };

  const register = async (email, password) => {
    const { data, status } = await API.post('/api/user/register/', {
      email,
      password,
    });
    if (status === 201) {
      setTokens(data.access, data.refresh);
      setUser(decodeUser(data.access));
    }
    return status;
  };

  const logout = () => {
    clearTokens();
    setUser(null);
  };

  const value = { user, isLoading, login, register, logout, hasRole };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}