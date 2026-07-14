import { Router } from "express";
import { revisionController } from "../controllers/revision.controller.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.use(authenticate);

router.post("/", revisionController.create);
router.post("/schedule-additional", revisionController.scheduleAdditional);
router.post("/:id/retry-tomorrow", revisionController.retryTomorrow);
router.get("/", revisionController.list);
router.get("/:id", revisionController.getById);
router.patch("/:id", revisionController.update);
router.put("/:id", revisionController.update);
router.delete("/:id", revisionController.remove);

export default router;
