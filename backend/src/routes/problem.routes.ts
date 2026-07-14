import { Router } from "express";
import { problemController } from "../controllers/problem.controller.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.use(authenticate);

router.post("/", problemController.create);
router.get("/", problemController.list);
router.get("/:id", problemController.getById);
router.patch("/:id", problemController.update);
router.put("/:id", problemController.update);
router.post("/:id/retry-metadata", problemController.retryMetadata);
router.delete("/:id", problemController.remove);

export default router;
