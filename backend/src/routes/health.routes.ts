import { Router } from "express";
import type { Request, Response } from "express";
import mongoose from "mongoose";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { isMailConfigured } from "../services/mail.service.js";

const router = Router();

router.get(
  "/",
  asyncHandler(async (_req: Request, res: Response) => {
    const mongoReady = mongoose.connection.readyState === 1;
    let mongoPingOk = false;

    if (mongoReady) {
      try {
        await mongoose.connection.db?.admin().ping();
        mongoPingOk = true;
      } catch {
        mongoPingOk = false;
      }
    }

    const healthy = mongoReady && mongoPingOk;
    res.status(healthy ? 200 : 503).json({
      success: healthy,
      message: healthy ? "API is healthy" : "API is degraded",
      data: {
        status: healthy ? "ok" : "degraded",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        mongo: {
          connected: mongoReady,
          ping: mongoPingOk,
        },
        mailConfigured: isMailConfigured(),
      },
    });
  }),
);

export default router;
