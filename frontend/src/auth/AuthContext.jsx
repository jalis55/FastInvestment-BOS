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
const TOKEN_KEY = 'access';
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
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserData = useCallback(async () => {
    try {
      const response = await API.get('/api/user-profile/');
      if (response.status === 200) {
        setUserData(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      setUserData(null);
    }
  }, []);

  /* Hydrate on mount */
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const decodedUser = token ? decodeUser(token) : null;
    setUser(decodedUser);

    if (decodedUser) {
      fetchUserData().finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [fetchUserData]);

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
    setIsLoading(true);
    try {
      const { data, status } = await API.post('/api/token/', { email, password });
      if (status === 200) {
        setTokens(data.access, data.refresh);
        const decodedUser = decodeUser(data.access);
        setUser(decodedUser);
        await fetchUserData();
      }
      return status;
    }
    catch (error) {
      return error.message
    }
    finally {
      setIsLoading(false);
    }
  };

  const register = async (email, password) => {
    setIsLoading(true);
    try {
      const { data, status } = await API.post('/api/user/register/', {
        email,
        password,
      });
      if (status === 201) {
        setTokens(data.access, data.refresh);
        const decodedUser = decodeUser(data.access);
        setUser(decodedUser);
        await fetchUserData();
      }
      return status;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    clearTokens();
    setUser(null);
    setUserData(null);
  };

  const value = {
    user,
    userData,  // Expose userData in the context
    setUserData,
    isLoading,
    login,
    register,
    logout,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}