import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import type { ApiFailure, ApiResponse, AuthPayload } from "@/types/api";
import {
  readAccessToken,
  readRefreshToken,
  useAuthStore,
} from "@/store/auth-store";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(
    message: string,
    status: number,
    errors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

interface RetryConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = readRefreshToken();
  if (!refreshToken) {
    return null;
  }

  try {
    const response = await axios.post<ApiResponse<AuthPayload>>(
      `${API_URL}/auth/refresh`,
      { refreshToken },
      { withCredentials: true },
    );

    if (!response.data.success) {
      return null;
    }

    const { accessToken, refreshToken: nextRefresh, user } = response.data.data;
    useAuthStore.getState().setAuth(user, accessToken, nextRefresh);
    return accessToken;
  } catch {
    useAuthStore.getState().clearAuth();
    return null;
  }
}

function createClient(): AxiosInstance {
  const client = axios.create({
    baseURL: API_URL,
    withCredentials: true,
    headers: {
      "Content-Type": "application/json",
    },
  });

  client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    if (typeof window !== "undefined") {
      const token = readAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError<ApiFailure>) => {
      const status = error.response?.status ?? 500;
      const original = error.config as RetryConfig | undefined;
      const url = original?.url ?? "";

      const isAuthEndpoint =
        url.includes("/auth/login") ||
        url.includes("/auth/register") ||
        url.includes("/auth/refresh") ||
        url.includes("/auth/forgot-password") ||
        url.includes("/auth/reset-password") ||
        url.includes("/auth/google/exchange");

      if (
        status === 401 &&
        original &&
        !original._retry &&
        !isAuthEndpoint &&
        typeof window !== "undefined"
      ) {
        original._retry = true;

        if (!refreshPromise) {
          refreshPromise = refreshAccessToken().finally(() => {
            refreshPromise = null;
          });
        }

        const newToken = await refreshPromise;
        if (newToken) {
          original.headers.Authorization = `Bearer ${newToken}`;
          return client.request(original);
        }
      }

      const message =
        error.response?.data?.message ??
        error.message ??
        "Something went wrong";
      const errors = error.response?.data?.errors;

      return Promise.reject(new ApiError(message, status, errors));
    },
  );

  return client;
}

export const apiClient = createClient();

export async function apiRequest<T>(
  config: AxiosRequestConfig,
): Promise<T> {
  const response = await apiClient.request<ApiResponse<T>>(config);
  const body = response.data;

  if (!body.success) {
    throw new ApiError(
      body.message ?? "Request failed",
      response.status,
      body.errors,
    );
  }

  // Message-only responses (e.g. logout / delete) omit `data`.
  return ("data" in body ? body.data : undefined) as T;
}
