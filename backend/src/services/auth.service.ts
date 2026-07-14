import bcrypt from "bcryptjs";
import type { Response } from "express";
import { env } from "../config/env.js";
import { PasswordResetToken } from "../models/PasswordResetToken.js";
import { User, type IUserDocument } from "../models/User.js";
import type { AuthUser } from "../types/index.js";
import { generateOpaqueToken, hashToken } from "../utils/crypto.js";
import { setAuthCookies } from "../utils/cookies.js";
import { signAccessToken, signRefreshToken } from "../utils/jwt.js";
import { AppError } from "../utils/AppError.js";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export function toAuthUser(user: IUserDocument): AuthUser {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    provider: user.provider,
  };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(
  plain: string,
  hashed: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
}

export async function issueTokenPair(
  res: Response,
  user: IUserDocument,
): Promise<{ accessToken: string; refreshToken: string }> {
  const claims = {
    userId: user._id.toString(),
    email: user.email,
  };

  const accessToken = signAccessToken(claims);
  const refreshToken = signRefreshToken(claims);

  user.refreshTokenHash = hashToken(refreshToken);
  await user.save();

  setAuthCookies(res, accessToken, refreshToken);

  return { accessToken, refreshToken };
}

export async function rotateRefreshToken(
  res: Response,
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string; user: IUserDocument }> {
  const { verifyRefreshToken } = await import("../utils/jwt.js");

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError("Invalid or expired refresh token", 401);
  }

  const user = await User.findById(decoded.userId).select("+refreshTokenHash");
  if (!user?.refreshTokenHash) {
    throw new AppError("Invalid or expired refresh token", 401);
  }

  if (user.refreshTokenHash !== hashToken(refreshToken)) {
    user.refreshTokenHash = undefined;
    await user.save();
    throw new AppError("Invalid or expired refresh token", 401);
  }

  const tokens = await issueTokenPair(res, user);
  return { ...tokens, user };
}

export async function revokeRefreshToken(userId: string): Promise<void> {
  await User.findByIdAndUpdate(userId, { $unset: { refreshTokenHash: 1 } });
}

export async function createPasswordResetToken(
  email: string,
): Promise<{ resetToken: string; user: IUserDocument } | null> {
  const user = await User.findOne({ email }).select("+password");
  if (!user || !user.password) {
    return null;
  }

  const resetToken = generateOpaqueToken();
  const tokenHash = hashToken(resetToken);

  await PasswordResetToken.deleteMany({ userId: user._id });
  await PasswordResetToken.create({
    userId: user._id,
    tokenHash,
    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
  });

  return { resetToken, user };
}

export function buildResetUrl(resetToken: string): string {
  return `${env.CLIENT_URL}/reset-password?token=${encodeURIComponent(resetToken)}`;
}

export async function resetPasswordWithToken(
  token: string,
  newPassword: string,
): Promise<IUserDocument> {
  const hashed = hashToken(token);

  const resetRecord = await PasswordResetToken.findOne({
    tokenHash: hashed,
    expiresAt: { $gt: new Date() },
  });

  if (!resetRecord) {
    throw new AppError("Invalid or expired reset token", 400);
  }

  const user = await User.findById(resetRecord.userId).select("+password");
  if (!user) {
    await PasswordResetToken.deleteMany({ tokenHash: hashed });
    throw new AppError("Invalid or expired reset token", 400);
  }

  user.password = await hashPassword(newPassword);
  user.provider = "local";
  await user.save();

  await Promise.all([
    PasswordResetToken.deleteMany({ userId: user._id }),
    User.findByIdAndUpdate(user._id, { $unset: { refreshTokenHash: 1 } }),
  ]);

  return user;
}
