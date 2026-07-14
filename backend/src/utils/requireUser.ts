import type { Request } from "express";
import { AppError } from "./AppError.js";

export function requireUserId(req: Request): string {
  if (!req.userId) {
    throw new AppError("Authentication required", 401);
  }
  return req.userId;
}
