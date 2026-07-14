import { Router } from "express";
import activityRoutes from "./activity.routes.js";
import analyticsRoutes from "./analytics.routes.js";
import authRoutes from "./auth.routes.js";
import dashboardRoutes from "./dashboard.routes.js";
import healthRoutes from "./health.routes.js";
import problemRoutes from "./problem.routes.js";
import revisionRoutes from "./revision.routes.js";

const router = Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/activity", activityRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/problems", problemRoutes);
router.use("/revisions", revisionRoutes);

export default router;
