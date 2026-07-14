import type { Request, Response, NextFunction } from "express";
import { ACCESS_COOKIE } from "../utils/cookies.js";
import { verifyAccessToken } from "../utils/jwt.js";
import { AppError } from "../utils/AppError.js";

function extractAccessToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  const cookieToken =
    (req.cookies?.[ACCESS_COOKIE] as string | undefined) ??
    (req.cookies?.token as string | undefined);

  return cookieToken ?? null;
}

export function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  try {
    const token = extractAccessToken(req);

    if (!token) {
      throw new AppError("Authentication required", 401);
    }

    const decoded = verifyAccessToken(token);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    next(new AppError("Invalid or expired token", 401));
  }
}

export function optionalAuthenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  try {
    const token = extractAccessToken(req);
    if (!token) {
      next();
      return;
    }

    const decoded = verifyAccessToken(token);
    req.userId = decoded.userId;
    next();
  } catch {
    next();
  }
}
