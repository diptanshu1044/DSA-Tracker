import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(5000),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  /** @deprecated Prefer JWT_ACCESS_EXPIRES_IN — kept for backward compatibility */
  JWT_EXPIRES_IN: z.string().optional(),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, "JWT_REFRESH_SECRET must be at least 32 characters")
    .optional(),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  CLIENT_URL: z.string().url().default("http://localhost:3000"),
  GOOGLE_CLIENT_ID: z.string().optional().default(""),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(""),
  GOOGLE_CALLBACK_URL: z
    .string()
    .url()
    .default("http://localhost:5000/api/auth/google/callback"),
  COOKIE_SECURE: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  SMTP_HOST: z.string().optional().default(""),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  SMTP_USER: z.string().optional().default(""),
  SMTP_PASS: z.string().optional().default(""),
  SMTP_FROM: z.string().optional().default("DSA Tracker <noreply@dsa-tracker.local>"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment configuration");
}

const data = parsed.data;
const accessExpires = data.JWT_EXPIRES_IN ?? data.JWT_ACCESS_EXPIRES_IN;
const refreshSecret = data.JWT_REFRESH_SECRET ?? data.JWT_SECRET;

if (data.NODE_ENV === "production") {
  if (!data.JWT_REFRESH_SECRET) {
    throw new Error(
      "JWT_REFRESH_SECRET is required in production and must differ from JWT_SECRET",
    );
  }
  if (data.JWT_REFRESH_SECRET === data.JWT_SECRET) {
    throw new Error(
      "JWT_REFRESH_SECRET must be different from JWT_SECRET in production",
    );
  }
}

export const env = {
  ...data,
  JWT_ACCESS_EXPIRES_IN: accessExpires,
  JWT_REFRESH_SECRET: refreshSecret,
};
