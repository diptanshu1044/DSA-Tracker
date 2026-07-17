import { z } from "zod";
import { ATTEMPT_TYPES } from "../models/Problem.js";
import { CONFIDENCE_LEVELS } from "../models/ReviewHistory.js";
import { paginationQuerySchema } from "../utils/pagination.js";

const objectIdString = z
  .string()
  .trim()
  .regex(/^[a-fA-F0-9]{24}$/, "Invalid id");

export const createRevisionSchema = z.object({
  problemId: objectIdString,
  dueDate: z.coerce.date(),
  revisionNumber: z.coerce.number().int().min(1).max(100),
  completed: z.boolean().optional().default(false),
  completedAt: z.coerce.date().optional(),
});

export const updateRevisionSchema = z
  .object({
    dueDate: z.coerce.date().optional(),
    revisionNumber: z.coerce.number().int().min(1).max(100).optional(),
    completed: z.boolean().optional(),
    completedAt: z.coerce.date().nullable().optional(),
    /** Required when marking a revision completed (appends immutable history). */
    result: z.enum(ATTEMPT_TYPES).optional(),
    confidence: z.enum(CONFIDENCE_LEVELS).optional(),
    timeTaken: z.coerce.number().min(0).max(24 * 60).optional(),
  })
  .refine(
    (data) =>
      data.dueDate !== undefined ||
      data.revisionNumber !== undefined ||
      data.completed !== undefined ||
      data.completedAt !== undefined ||
      data.result !== undefined ||
      data.confidence !== undefined ||
      data.timeTaken !== undefined,
    { message: "At least one field is required" },
  )
  .superRefine((data, ctx) => {
    if (data.completed === true) {
      if (!data.result) {
        ctx.addIssue({
          code: "custom",
          path: ["result"],
          message: "Result is required when completing a revision",
        });
      }
      if (!data.confidence) {
        ctx.addIssue({
          code: "custom",
          path: ["confidence"],
          message: "Confidence is required when completing a revision",
        });
      }
    }
  });

export const listRevisionsQuerySchema = paginationQuerySchema.extend({
  problemId: objectIdString.optional(),
  completed: z
    .enum(["true", "false"])
    .optional()
    .transform((value) =>
      value === undefined ? undefined : value === "true",
    ),
  dueBefore: z.coerce.date().optional(),
  dueAfter: z.coerce.date().optional(),
});

/** Extra post-cycle reviews: only 3, 7, or 10 days. */
export const ADDITIONAL_REVISION_DAYS = [3, 7, 10] as const;

export const scheduleAdditionalRevisionSchema = z.object({
  problemId: objectIdString,
  days: z.coerce
    .number()
    .int()
    .refine(
      (value): value is (typeof ADDITIONAL_REVISION_DAYS)[number] =>
        (ADDITIONAL_REVISION_DAYS as readonly number[]).includes(value),
      { message: "Days must be 3, 7, or 10" },
    ),
});

/** Max revisions creatable in one manual schedule request. */
export const MAX_MANUAL_REVISION_TIMES = 20;
export const MAX_MANUAL_INTERVAL_DAYS = 365;

/**
 * Manual schedule for an existing problem:
 * - once: single due date
 * - repeating: `times` revisions every `intervalDays` days from `startDate`
 *   (defaults to today + intervalDays when startDate omitted)
 */
export const scheduleManualRevisionSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("once"),
    problemId: objectIdString,
    dueDate: z.coerce.date(),
  }),
  z.object({
    mode: z.literal("repeating"),
    problemId: objectIdString,
    intervalDays: z.coerce
      .number()
      .int()
      .min(1, "Interval must be at least 1 day")
      .max(
        MAX_MANUAL_INTERVAL_DAYS,
        `Interval cannot exceed ${MAX_MANUAL_INTERVAL_DAYS} days`,
      ),
    times: z.coerce
      .number()
      .int()
      .min(1, "Schedule at least 1 revision")
      .max(
        MAX_MANUAL_REVISION_TIMES,
        `At most ${MAX_MANUAL_REVISION_TIMES} revisions at once`,
      ),
    /** First due date; later dues are startDate + n * intervalDays. */
    startDate: z.coerce.date().optional(),
  }),
]);

export type CreateRevisionInput = z.infer<typeof createRevisionSchema>;
export type UpdateRevisionInput = z.infer<typeof updateRevisionSchema>;
export type ListRevisionsQuery = z.infer<typeof listRevisionsQuerySchema>;
export type ScheduleAdditionalRevisionInput = z.infer<
  typeof scheduleAdditionalRevisionSchema
>;
export type ScheduleManualRevisionInput = z.infer<
  typeof scheduleManualRevisionSchema
>;
