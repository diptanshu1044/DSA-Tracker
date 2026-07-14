import { Router } from "express";
import { activityController } from "../controllers/activity.controller.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.use(authenticate);
router.get("/heatmap", activityController.getHeatmap);
router.get("/day/:date", activityController.getDay);

export default router;
