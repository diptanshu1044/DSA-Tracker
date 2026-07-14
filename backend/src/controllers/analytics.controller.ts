import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { getAnalytics } from "../services/analytics.service.js";
import { AppError } from "../utils/AppError.js";
import { sendSuccess } from "../utils/response.js";

function requireUserId(req: Request): string {
  if (!req.userId) {
    throw new AppError("Authentication required", 401);
  }
  return req.userId;
}

export const analyticsController = {
  get: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const analytics = await getAnalytics(userId);
    sendSuccess(res, { analytics });
  }),
};
