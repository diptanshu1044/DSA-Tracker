import rateLimit from "express-rate-limit";
import { Router } from "express";
import { authController } from "../controllers/auth.controller.js";
import { authenticate, optionalAuthenticate } from "../middleware/auth.js";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many attempts. Please try again later.",
  },
});

const sensitiveAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many attempts. Please try again later.",
  },
});

router.post("/register", authLimiter, authController.register);
router.post("/login", authLimiter, authController.login);
router.post("/refresh", authLimiter, authController.refresh);
router.post("/logout", optionalAuthenticate, authController.logout);
router.get("/me", authenticate, authController.me);
router.get("/session", authenticate, authController.session);
router.patch("/me", authenticate, authController.updateProfile);
router.delete("/me", authenticate, authController.deleteAccount);
router.post(
  "/forgot-password",
  sensitiveAuthLimiter,
  authController.forgotPassword,
);
router.post(
  "/reset-password",
  sensitiveAuthLimiter,
  authController.resetPassword,
);
router.get("/google", authLimiter, authController.googleAuth);
router.get("/google/callback", authController.googleCallback);
router.post(
  "/google/exchange",
  authLimiter,
  authController.exchangeOAuthCode,
);

export default router;
