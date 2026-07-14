import { Router } from "express";
import type { Request, Response } from "express";
import { sendSuccess } from "../utils/response.js";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  sendSuccess(
    res,
    {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
    "API is healthy",
  );
});

export default router;
