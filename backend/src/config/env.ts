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
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment configuration");
}

const data = parsed.data;

export const env = {
  ...data,
  JWT_ACCESS_EXPIRES_IN: data.JWT_EXPIRES_IN ?? data.JWT_ACCESS_EXPIRES_IN,
  JWT_REFRESH_SECRET: data.JWT_REFRESH_SECRET ?? data.JWT_SECRET,
};
