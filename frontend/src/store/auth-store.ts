import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types/api";

const ACCESS_KEY = "access_token";
const REFRESH_KEY = "refresh_token";
const LEGACY_TOKEN_KEY = "token";

export function readAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem(ACCESS_KEY) ?? localStorage.getItem(LEGACY_TOKEN_KEY)
  );
}

export function readRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY);
}

function persistTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
  localStorage.setItem(LEGACY_TOKEN_KEY, accessToken);
}

function clearPersistedTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: User | null) => void;
  clearAuth: () => void;
  setHydrated: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isHydrated: false,
      setAuth: (user, accessToken, refreshToken) => {
        if (typeof window !== "undefined") {
          persistTokens(accessToken, refreshToken);
        }
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
        });
      },
      setTokens: (accessToken, refreshToken) => {
        if (typeof window !== "undefined") {
          persistTokens(accessToken, refreshToken);
        }
        set({ accessToken, refreshToken, isAuthenticated: true });
      },
      setUser: (user) =>
        set({
          user,
          isAuthenticated: Boolean(user),
        }),
      clearAuth: () => {
        if (typeof window !== "undefined") {
          clearPersistedTokens();
        }
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },
      setHydrated: (value) => set({ isHydrated: value }),
    }),
    {
      name: "dsa-tracker-auth",
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      merge: (persisted, current) => {
        const raw = (persisted ?? {}) as Partial<AuthState> & {
          token?: string;
        };
        const accessToken = raw.accessToken ?? raw.token ?? null;
        const refreshToken = raw.refreshToken ?? null;
        const user = raw.user ?? null;
        const hasSession = Boolean(accessToken && refreshToken && user);

        return {
          ...current,
          user: hasSession ? user : null,
          accessToken: hasSession ? accessToken : null,
          refreshToken: hasSession ? refreshToken : null,
          isAuthenticated: hasSession,
        };
      },
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
        if (
          typeof window !== "undefined" &&
          state?.accessToken &&
          state.refreshToken
        ) {
          persistTokens(state.accessToken, state.refreshToken);
        }
      },
    },
  ),
);
