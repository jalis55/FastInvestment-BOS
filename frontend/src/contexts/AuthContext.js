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

  // Add this function to update user profile data
  const updateUserProfile = useCallback((newProfileData) => {
    setUser(prev => ({
      ...prev,
      ...newProfileData,
      // Preserve these special fields if not being updated
      is_super_admin: prev?.is_super_admin || false,
      is_admin: prev?.is_admin || false,
      roles: prev?.roles || []
    }));
  }, []);

  const refreshToken = useCallback(async () => {
    try {
      const refresh = localStorage.getItem(REFRESH_TOKEN);
      if (!refresh) throw new Error("No refresh token");

      const { data } = await api.post("/api/token/refresh/", { refresh });
      localStorage.setItem(ACCESS_TOKEN, data.access);
      const decoded = jwtDecode(data.access);
      
      setUser(prev => ({
        ...decoded,
        // Preserve the profile image when refreshing token
        profile_image: prev?.profile_image || decoded.profile_image,
        is_super_admin: decoded.is_super_admin || false,
        is_admin: decoded.is_admin || false,
        roles: decoded.roles || []
      }));
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

  const hasRole = useCallback((requiredRoles = []) => {
    if (!user) return false;
    if (user.is_super_admin) return true;
    if (!requiredRoles || requiredRoles.length === 0) return true;
    
    if (requiredRoles.includes('admin') && user.is_admin) return true;
    if (requiredRoles.includes('user') && !user.is_admin) return true;
    return requiredRoles.some(role => user.roles?.includes(role));
  }, [user]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      setUser, 
      logout, 
      isLoading, 
      hasRole,
      refreshToken,
      updateUserProfile // Add this to the context value
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;