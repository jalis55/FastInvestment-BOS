import { createContext, useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import api from "../api.js";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../constants.js";

export const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const token = localStorage.getItem(ACCESS_TOKEN);
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      try {
        const decoded = jwtDecode(token);
        if (decoded.exp * 1000 < Date.now()) {
          await refreshToken();
        } else {
          setUser(decoded);
        }
      } catch {
        setUser(null);
      }
      setIsLoading(false);
    };

    const refreshToken = async () => {
      try {
        const refresh = localStorage.getItem(REFRESH_TOKEN);
        if (!refresh) throw new Error("No refresh token");

        const { data } = await api.post("/api/token/refresh/", { refresh });
        localStorage.setItem(ACCESS_TOKEN, data.access);
        setUser(jwtDecode(data.access));
      } catch {
        logout();
      }
    };

    checkUser();
  }, []);

  const logout = () => {
    localStorage.removeItem(ACCESS_TOKEN);
    localStorage.removeItem(REFRESH_TOKEN);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;