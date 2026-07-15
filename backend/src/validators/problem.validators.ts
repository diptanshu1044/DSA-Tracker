import { z } from "zod";
import { ATTEMPT_TYPES } from "../models/Problem.js";
import { CONFIDENCE_LEVELS } from "../models/ReviewHistory.js";
import { paginationQuerySchema } from "../utils/pagination.js";
import { parseLeetCodeUrl } from "../utils/leetcodeUrl.js";

const leetCodeUrlSchema = z
  .string()
  .trim()
  .min(1, "URL is required")
  .max(2048)
  .superRefine((value, ctx) => {
    try {
      parseLeetCodeUrl(value);
    } catch (error) {
      ctx.addIssue({
        code: "custom",
        message:
          error instanceof Error
            ? error.message
            : "Must be a valid LeetCode problem URL",
      });
    }
  })
  .transform((value) => parseLeetCodeUrl(value).normalizedUrl);

export const createProblemSchema = z.object({
  url: leetCodeUrlSchema,
  attemptType: z.enum(ATTEMPT_TYPES),
  timeTaken: z.coerce.number().min(0).max(24 * 60).optional(),
  confidence: z.enum(CONFIDENCE_LEVELS).optional(),
});

export const updateProblemSchema = z
  .object({
    title: z.string().trim().min(1).max(300).optional(),
    url: leetCodeUrlSchema.optional(),
    attemptType: z.enum(ATTEMPT_TYPES).optional(),
    timeTaken: z.coerce.number().min(0).max(24 * 60).nullable().optional(),
  })
  .refine(
    (data) =>
      data.title !== undefined ||
      data.url !== undefined ||
      data.attemptType !== undefined ||
      data.timeTaken !== undefined,
    { message: "At least one field is required" },
  );

export const PROBLEM_STATUS_FILTERS = [
  "mastered",
  "learning",
  "need_review",
  "overdue",
  "new",
  "forgotten",
] as const;

/** UTC calendar day as YYYY-MM-DD (same convention as activity APIs). */
const utcDateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  }, "Invalid calendar date");

export const listProblemsQuerySchema = paginationQuerySchema
  .extend({
    attemptType: z.enum(ATTEMPT_TYPES).optional(),
    search: z.string().trim().max(200).optional(),
    status: z.enum(PROBLEM_STATUS_FILTERS).optional(),
    topic: z.string().trim().min(1).max(100).optional(),
    /** Inclusive UTC start day for when the problem was logged/solved. */
    createdAfter: utcDateKeySchema.optional(),
    /** Inclusive UTC end day for when the problem was logged/solved. */
    createdBefore: utcDateKeySchema.optional(),
    /** Last N UTC calendar days including today (ignored if createdAfter/createdBefore set). */
    days: z.coerce.number().int().min(1).max(365).optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.createdAfter &&
      data.createdBefore &&
      data.createdAfter > data.createdBefore
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["createdAfter"],
        message: "createdAfter must be on or before createdBefore",
      });
    }
  });

export type CreateProblemInput = z.infer<typeof createProblemSchema>;
export type UpdateProblemInput = z.infer<typeof updateProblemSchema>;
export type ListProblemsQuery = z.infer<typeof listProblemsQuerySchema>;
