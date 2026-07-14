import type { Response } from "express";
import { env } from "../config/env.js";
import { parseDurationMs } from "./duration.js";

export const ACCESS_COOKIE = "access_token";
export const REFRESH_COOKIE = "refresh_token";

/** Legacy cookie name — still cleared on logout for older clients */
const LEGACY_TOKEN_COOKIE = "token";

const ACCESS_MAX_AGE_MS = parseDurationMs(
  env.JWT_ACCESS_EXPIRES_IN,
  15 * 60 * 1000,
);
const REFRESH_MAX_AGE_MS = parseDurationMs(
  env.JWT_REFRESH_EXPIRES_IN,
  7 * 24 * 60 * 60 * 1000,
);

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE || env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge,
    path: "/",
  };
}

export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
): void {
  res.cookie(ACCESS_COOKIE, accessToken, cookieOptions(ACCESS_MAX_AGE_MS));
  res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions(REFRESH_MAX_AGE_MS));
}

export function clearAuthCookies(res: Response): void {
  const base = {
    httpOnly: true,
    secure: env.COOKIE_SECURE || env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };

  res.clearCookie(ACCESS_COOKIE, base);
  res.clearCookie(REFRESH_COOKIE, base);
  res.clearCookie(LEGACY_TOKEN_COOKIE, base);
}
