// src/contexts/AuthContext.js
import { createContext, useState, useEffect, useCallback } from "react";
import { jwtDecode } from "jwt-decode";
import api from "../api.js";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../constants.js";

export const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem(ACCESS_TOKEN);
    localStorage.removeItem(REFRESH_TOKEN);
    setUser(null);
  }, []);

  const refreshToken = useCallback(async () => {
    try {
      const refresh = localStorage.getItem(REFRESH_TOKEN);
      if (!refresh) throw new Error("No refresh token");

      const { data } = await api.post("/api/token/refresh/", { refresh });
      localStorage.setItem(ACCESS_TOKEN, data.access);
      const decoded = jwtDecode(data.access);
      
      setUser({
        ...decoded,
        is_super_admin: decoded.is_super_admin || false,
        is_admin: decoded.is_admin || false,
        roles: decoded.roles || []
      });
      return true;
    } catch (error) {
      logout();
      return false;
    }
  }, [logout]);

  useEffect(() => {
    const checkUser = async () => {
      const token = localStorage.getItem(ACCESS_TOKEN);
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const decoded = jwtDecode(token);
        if (decoded.exp * 1000 < Date.now()) {
          await refreshToken();
        } else {
          setUser({
            ...decoded,
            is_super_admin: decoded.is_super_admin || false,
            is_admin: decoded.is_admin || false,
            roles: decoded.roles || []
          });
        }
      } catch (error) {
        logout();
      }
      setIsLoading(false);
    };

    checkUser();
  }, [refreshToken, logout]);

  const hasRole = (requiredRoles) => {
    if (!user) return false;
    if (user.is_super_admin) return true;
    if (!requiredRoles || requiredRoles.length === 0) return true;
    
    return requiredRoles.some(role => {
      if (role === 'admin') return user.is_admin;
      return user.roles.includes(role);
    });
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      setUser, 
      logout, 
      isLoading, 
      hasRole,
      refreshToken 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;