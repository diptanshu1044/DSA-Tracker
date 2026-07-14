import { apiRequest } from "@/lib/api";
import type {
  AuthPayload,
  ForgotPasswordPayload,
  User,
} from "@/types/api";

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface ForgotPasswordInput {
  email: string;
}

export interface ResetPasswordInput {
  token: string;
  password: string;
}

export const authApi = {
  register(data: RegisterInput) {
    return apiRequest<AuthPayload>({
      method: "POST",
      url: "/auth/register",
      data,
    });
  },

  login(data: LoginInput) {
    return apiRequest<AuthPayload>({
      method: "POST",
      url: "/auth/login",
      data,
    });
  },

  refresh(refreshToken?: string) {
    return apiRequest<AuthPayload>({
      method: "POST",
      url: "/auth/refresh",
      data: refreshToken ? { refreshToken } : {},
    });
  },

  logout() {
    return apiRequest<void>({
      method: "POST",
      url: "/auth/logout",
    });
  },

  me() {
    return apiRequest<{ user: User }>({
      method: "GET",
      url: "/auth/me",
    });
  },

  session() {
    return apiRequest<AuthPayload>({
      method: "GET",
      url: "/auth/session",
    });
  },

  exchangeOAuthCode(code: string) {
    return apiRequest<AuthPayload>({
      method: "POST",
      url: "/auth/google/exchange",
      data: { code },
    });
  },

  updateProfile(data: { name: string }) {
    return apiRequest<{ user: User }>({
      method: "PATCH",
      url: "/auth/me",
      data,
    });
  },

  deleteAccount() {
    return apiRequest<void>({
      method: "DELETE",
      url: "/auth/me",
    });
  },

  forgotPassword(data: ForgotPasswordInput) {
    return apiRequest<ForgotPasswordPayload | void>({
      method: "POST",
      url: "/auth/forgot-password",
      data,
    });
  },

  resetPassword(data: ResetPasswordInput) {
    return apiRequest<{ user: User }>({
      method: "POST",
      url: "/auth/reset-password",
      data,
    });
  },

  googleAuthUrl(): string {
    const base =
      process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";
    return `${base}/auth/google`;
  },
};
