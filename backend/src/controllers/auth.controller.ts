import type { Request, Response, NextFunction } from "express";
import passport from "passport";
import { z } from "zod";
import { User, type IUserDocument } from "../models/User.js";
import { AppError } from "../utils/AppError.js";
import { REFRESH_COOKIE, clearAuthCookies } from "../utils/cookies.js";
import { sendSuccess, sendMessage } from "../utils/response.js";
import { env } from "../config/env.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import type { GoogleProfileUser } from "../config/passport.js";
import {
  buildResetUrl,
  comparePassword,
  createPasswordResetToken,
  deleteAccount,
  hashPassword,
  issueTokenPair,
  resetPasswordWithToken,
  revokeRefreshToken,
  rotateRefreshToken,
  toAuthUser,
  updateProfile,
} from "../services/auth.service.js";
import { sendPasswordResetEmail } from "../services/mail.service.js";
import {
  signOAuthHandoffToken,
  verifyOAuthHandoffToken,
} from "../utils/jwt.js";
import { parseOrThrow } from "../utils/validation.js";

const registerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(1),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z.string().min(8).max(128),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1).optional(),
});

const oauthExchangeSchema = z.object({
  code: z.string().min(1, "OAuth code is required"),
});

const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

async function issueAuthResponse(
  res: Response,
  user: IUserDocument,
  statusCode = 200,
): Promise<void> {
  const { accessToken, refreshToken } = await issueTokenPair(res, user);

  sendSuccess(
    res,
    {
      accessToken,
      refreshToken,
      token: accessToken,
      user: toAuthUser(user),
    },
    statusCode === 201 ? "Registered successfully" : "Logged in successfully",
    statusCode,
  );
}

export const authController = {
  register: asyncHandler(async (req: Request, res: Response) => {
    const { name, email, password } = parseOrThrow(registerSchema, req.body);

    const existing = await User.findOne({ email });
    if (existing) {
      throw new AppError("Email already registered", 409);
    }

    const hashed = await hashPassword(password);
    const user = await User.create({
      name,
      email,
      password: hashed,
      provider: "local",
    });

    await issueAuthResponse(res, user, 201);
  }),

  login: asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = parseOrThrow(loginSchema, req.body);

    const user = await User.findOne({ email }).select("+password");
    if (!user || !user.password) {
      throw new AppError("Invalid email or password", 401);
    }

    const match = await comparePassword(password, user.password);
    if (!match) {
      throw new AppError("Invalid email or password", 401);
    }

    await issueAuthResponse(res, user);
  }),

  refresh: asyncHandler(async (req: Request, res: Response) => {
    const parsed = parseOrThrow(refreshSchema, req.body ?? {});

    const refreshToken =
      parsed.refreshToken ??
      (req.cookies?.[REFRESH_COOKIE] as string | undefined);

    if (!refreshToken) {
      throw new AppError("Refresh token required", 401);
    }

    const { accessToken, refreshToken: nextRefresh, user } =
      await rotateRefreshToken(res, refreshToken);

    sendSuccess(
      res,
      {
        accessToken,
        refreshToken: nextRefresh,
        token: accessToken,
        user: toAuthUser(user),
      },
      "Token refreshed",
    );
  }),

  logout: asyncHandler(async (req: Request, res: Response) => {
    if (req.userId) {
      await revokeRefreshToken(req.userId);
    } else {
      const cookieRefresh = req.cookies?.[REFRESH_COOKIE] as string | undefined;
      const bodyRefresh = (req.body as { refreshToken?: string } | undefined)
        ?.refreshToken;
      const refreshToken = bodyRefresh ?? cookieRefresh;

      if (refreshToken) {
        try {
          const { verifyRefreshToken } = await import("../utils/jwt.js");
          const decoded = verifyRefreshToken(refreshToken);
          await revokeRefreshToken(decoded.userId);
        } catch {
          // ignore invalid refresh on logout
        }
      }
    }

    clearAuthCookies(res);
    sendMessage(res, "Logged out successfully");
  }),

  me: asyncHandler(async (req: Request, res: Response) => {
    if (!req.userId) {
      throw new AppError("Authentication required", 401);
    }

    const user = await User.findById(req.userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    sendSuccess(res, { user: toAuthUser(user) });
  }),

  /** Exchange httpOnly cookies (e.g. after OAuth) for SPA token payload. */
  session: asyncHandler(async (req: Request, res: Response) => {
    if (!req.userId) {
      throw new AppError("Authentication required", 401);
    }

    const user = await User.findById(req.userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    const cookieRefresh = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (cookieRefresh) {
      const { accessToken, refreshToken, user: refreshed } =
        await rotateRefreshToken(res, cookieRefresh);
      sendSuccess(
        res,
        {
          accessToken,
          refreshToken,
          token: accessToken,
          user: toAuthUser(refreshed),
        },
        "Session established",
      );
      return;
    }

    const { accessToken, refreshToken } = await issueTokenPair(res, user);
    sendSuccess(
      res,
      {
        accessToken,
        refreshToken,
        token: accessToken,
        user: toAuthUser(user),
      },
      "Session established",
    );
  }),

  updateProfile: asyncHandler(async (req: Request, res: Response) => {
    if (!req.userId) {
      throw new AppError("Authentication required", 401);
    }

    const { name } = parseOrThrow(updateProfileSchema, req.body);
    const user = await updateProfile(req.userId, { name });

    sendSuccess(res, { user: toAuthUser(user) }, "Profile updated");
  }),

  deleteAccount: asyncHandler(async (req: Request, res: Response) => {
    if (!req.userId) {
      throw new AppError("Authentication required", 401);
    }

    await deleteAccount(req.userId);
    clearAuthCookies(res);
    sendMessage(res, "Account deleted successfully");
  }),

  forgotPassword: asyncHandler(async (req: Request, res: Response) => {
    const { email } = parseOrThrow(forgotPasswordSchema, req.body);

    const result = await createPasswordResetToken(email);

    if (result) {
      const resetUrl = buildResetUrl(result.resetToken);
      await sendPasswordResetEmail(email, resetUrl);

      if (env.NODE_ENV !== "production") {
        sendSuccess(
          res,
          { resetToken: result.resetToken, resetUrl },
          "If that email is registered, a reset link has been sent",
        );
        return;
      }
    }

    sendMessage(
      res,
      "If that email is registered, a reset link has been sent",
    );
  }),

  resetPassword: asyncHandler(async (req: Request, res: Response) => {
    const { token, password } = parseOrThrow(resetPasswordSchema, req.body);

    const user = await resetPasswordWithToken(token, password);

    clearAuthCookies(res);

    sendSuccess(
      res,
      { user: toAuthUser(user) },
      "Password reset successfully. You can now sign in.",
    );
  }),

  googleAuth(req: Request, res: Response, next: NextFunction): void {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      next(new AppError("Google OAuth is not configured", 503));
      return;
    }
    passport.authenticate("google", {
      scope: ["profile", "email"],
      session: false,
    })(req, res, next);
  },

  googleCallback(req: Request, res: Response, next: NextFunction): void {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      next(new AppError("Google OAuth is not configured", 503));
      return;
    }

    passport.authenticate(
      "google",
      { session: false },
      (err: Error | null, googleUser: Express.User | false) => {
        void (async () => {
          try {
            if (err || !googleUser) {
              res.redirect(`${env.CLIENT_URL}/login?error=google_auth_failed`);
              return;
            }

            const profile = googleUser as unknown as GoogleProfileUser;
            if (!profile.email || !profile.googleId) {
              res.redirect(`${env.CLIENT_URL}/login?error=google_auth_failed`);
              return;
            }

            let user = await User.findOne({ googleId: profile.googleId });

            if (!user) {
              const emailTaken = await User.findOne({ email: profile.email });
              if (emailTaken) {
                res.redirect(
                  `${env.CLIENT_URL}/login?error=google_email_in_use`,
                );
                return;
              }

              user = await User.create({
                name: profile.name,
                email: profile.email,
                avatar: profile.avatar,
                googleId: profile.googleId,
                provider: "google",
              });
            }

            // Cross-site SPAs cannot read API cookies; hand off via short-lived code.
            const code = signOAuthHandoffToken({
              userId: user._id.toString(),
              email: user.email,
            });
            res.redirect(
              `${env.CLIENT_URL}/auth/callback?code=${encodeURIComponent(code)}`,
            );
          } catch {
            res.redirect(`${env.CLIENT_URL}/login?error=google_auth_failed`);
          }
        })();
      },
    )(req, res, next);
  },

  /** Exchange OAuth handoff code for SPA tokens (works across Vercel ↔ Render). */
  exchangeOAuthCode: asyncHandler(async (req: Request, res: Response) => {
    const { code } = parseOrThrow(oauthExchangeSchema, req.body);
    const payload = verifyOAuthHandoffToken(code);

    const user = await User.findById(payload.userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    const { accessToken, refreshToken } = await issueTokenPair(res, user);
    sendSuccess(
      res,
      {
        accessToken,
        refreshToken,
        token: accessToken,
        user: toAuthUser(user),
      },
      "Signed in with Google",
    );
  }),
};
