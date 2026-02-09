"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  login as authLogin,
  logout as authLogout,
  getCurrentUser,
  isAuthenticated as checkAuth,
  isSuperAdmin as checkSuperAdmin,
  hasPermission as checkPermission,
  getUserFullName,
  getUserInitials,
} from "@/lib/auth";

const AuthContext = createContext({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  isSuperAdmin: false,
  login: async () => {},
  logout: async () => {},
  hasPermission: () => false,
  refreshUser: () => {},
});

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize user from storage
  useEffect(() => {
    const storedUser = getCurrentUser();
    if (storedUser) setUser(storedUser);
    setIsLoading(false);
  }, []);

  const refreshUser = useCallback(() => {
    const storedUser = getCurrentUser();
    setUser(storedUser);
  }, []);

  // ✅ now supports rememberMe
  const login = useCallback(async (loginValue, password, rememberMe = false) => {
    setIsLoading(true);
    try {
      const result = await authLogin(loginValue, password, rememberMe);
      if (result.success) {
        setUser(result.user);
        return { success: true, user: result.user };
      }
      return { success: false, error: result.error || "Login failed" };
    } catch (error) {
      return { success: false, error: error.message || "Login failed" };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await authLogout();
      setUser(null);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const hasPermission = useCallback((permissionPath) => {
    return checkPermission(permissionPath);
  }, []);

  const value = {
    user,
    isLoading,
    loading: isLoading,
    isAuthenticated: checkAuth(),
    isSuperAdmin: checkSuperAdmin(),
    login,
    logout,
    hasPermission,
    refreshUser,
    fullName: user ? getUserFullName(user) : "",
    initials: user ? getUserInitials(user) : "?",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;