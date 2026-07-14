import { Router } from "express";
import { authController } from "../controllers/auth.controller.js";
import { authenticate, optionalAuthenticate } from "../middleware/auth.js";

const router = Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/refresh", authController.refresh);
router.post("/logout", optionalAuthenticate, authController.logout);
router.get("/me", authenticate, authController.me);
router.patch("/me", authenticate, authController.updateProfile);
router.delete("/me", authenticate, authController.deleteAccount);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);
router.get("/google", authController.googleAuth);
router.get("/google/callback", authController.googleCallback);

export default router;
