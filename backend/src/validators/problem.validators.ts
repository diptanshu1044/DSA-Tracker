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

export const listProblemsQuerySchema = paginationQuerySchema.extend({
  attemptType: z.enum(ATTEMPT_TYPES).optional(),
  search: z.string().trim().max(200).optional(),
});

export type CreateProblemInput = z.infer<typeof createProblemSchema>;
export type UpdateProblemInput = z.infer<typeof updateProblemSchema>;
export type ListProblemsQuery = z.infer<typeof listProblemsQuerySchema>;
