import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { getDashboard } from "../services/dashboard.service.js";
import { requireUserId } from "../utils/requireUser.js";
import { sendSuccess } from "../utils/response.js";

export const dashboardController = {
  get: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const dashboard = await getDashboard(userId);
    sendSuccess(res, { dashboard });
  }),
};
