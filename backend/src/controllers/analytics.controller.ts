import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { getAnalytics } from "../services/analytics.service.js";
import { requireUserId } from "../utils/requireUser.js";
import { sendSuccess } from "../utils/response.js";

export const analyticsController = {
  get: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const analytics = await getAnalytics(userId);
    sendSuccess(res, { analytics });
  }),
};
