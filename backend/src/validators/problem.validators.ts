import { z } from "zod";
import { ATTEMPT_TYPES } from "../models/Problem.js";
import { paginationQuerySchema } from "../utils/pagination.js";
import { normalizeProblemUrl } from "../utils/url.js";

const urlSchema = z
  .string()
  .trim()
  .min(1, "URL is required")
  .max(2048)
  .url("Must be a valid URL")
  .transform(normalizeProblemUrl);

export const createProblemSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(300),
  url: urlSchema,
  attemptType: z.enum(ATTEMPT_TYPES),
  timeTaken: z.coerce.number().min(0).max(24 * 60).optional(),
});

export const updateProblemSchema = z
  .object({
    title: z.string().trim().min(1).max(300).optional(),
    url: urlSchema.optional(),
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
