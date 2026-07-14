import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  getActivityDayDetail,
  getActivityHeatmap,
} from "../services/activity.service.js";
import { requireUserId } from "../utils/requireUser.js";
import { sendSuccess } from "../utils/response.js";
import { parseOrThrow } from "../utils/validation.js";
import { activityDayParamsSchema } from "../validators/activity.validators.js";

export const activityController = {
  getHeatmap: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const activity = await getActivityHeatmap(userId);
    sendSuccess(res, { activity });
  }),

  getDay: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const { date } = parseOrThrow(activityDayParamsSchema, req.params);
    const day = await getActivityDayDetail(userId, date);
    sendSuccess(res, { day });
  }),
};
