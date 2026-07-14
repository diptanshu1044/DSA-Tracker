import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";
import type { JwtPayload, JwtTokenType } from "../types/index.js";
import { AppError } from "./AppError.js";

type TokenClaims = Omit<JwtPayload, "type">;

function signTypedToken(
  claims: TokenClaims,
  type: JwtTokenType,
  secret: string,
  expiresIn: SignOptions["expiresIn"],
): string {
  const options: SignOptions = { expiresIn };
  return jwt.sign({ ...claims, type }, secret, options);
}

export function signAccessToken(claims: TokenClaims): string {
  return signTypedToken(
    claims,
    "access",
    env.JWT_SECRET,
    env.JWT_ACCESS_EXPIRES_IN as SignOptions["expiresIn"],
  );
}

export function signRefreshToken(claims: TokenClaims): string {
  return signTypedToken(
    claims,
    "refresh",
    env.JWT_REFRESH_SECRET,
    env.JWT_REFRESH_EXPIRES_IN as SignOptions["expiresIn"],
  );
}

export function verifyAccessToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  if (decoded.type !== "access") {
    throw new AppError("Invalid access token", 401);
  }
  return decoded;
}

export function verifyRefreshToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;
  if (decoded.type !== "refresh") {
    throw new AppError("Invalid refresh token", 401);
  }
  return decoded;
}

/** @deprecated Use signAccessToken */
export function signToken(claims: TokenClaims): string {
  return signAccessToken(claims);
}

/** @deprecated Use verifyAccessToken */
export function verifyToken(token: string): JwtPayload {
  return verifyAccessToken(token);
}
