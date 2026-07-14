export type AuthProvider = "local" | "google";

export type JwtTokenType = "access" | "refresh";

export type AttemptType = "SELF" | "HINT" | "VIDEO";

export type ConfidenceLevel = "LOW" | "MEDIUM" | "HIGH";

export type ReviewHistoryType = "INITIAL" | "REVIEW";

export interface JwtPayload {
  userId: string;
  email: string;
  type: JwtTokenType;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  provider: AuthProvider;
}

export type { PaginationMeta } from "../utils/pagination.js";
