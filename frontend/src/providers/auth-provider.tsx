"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import type { User } from "@/types/api";
import { authApi } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth-store";
import { ApiError } from "@/lib/api";

interface AuthContextValue {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setUser: (user: User | null) => void;
  clearAuth: () => void;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const setAuth = useAuthStore((s) => s.setAuth);
  const setUser = useAuthStore((s) => s.setUser);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const refreshProfile = useCallback(async () => {
    try {
      const { user: profile } = await authApi.me();
      setUser(profile);
      return profile;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearAuth();
      }
      return null;
    }
  }, [setUser, clearAuth]);

  useEffect(() => {
    if (!isHydrated || !accessToken) return;
    void refreshProfile();
  }, [isHydrated, accessToken, refreshProfile]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // always clear local session
    } finally {
      clearAuth();
    }
  }, [clearAuth]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      refreshToken,
      isAuthenticated,
      isLoading: !isHydrated,
      setAuth,
      setUser,
      clearAuth,
      logout,
      refreshProfile,
    }),
    [
      user,
      accessToken,
      refreshToken,
      isAuthenticated,
      isHydrated,
      setAuth,
      setUser,
      clearAuth,
      logout,
      refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
