import { z } from "zod";
import {
  MAX_REVISION_DAY_OFFSET,
  MAX_REVISION_INTERVALS,
} from "../constants/revision-intervals.js";

const dayOffsetSchema = z
  .number()
  .int("Day offset must be a whole number")
  .min(1, "Day offset must be at least 1")
  .max(MAX_REVISION_DAY_OFFSET, `Day offset cannot exceed ${MAX_REVISION_DAY_OFFSET}`);

const intervalsForAttemptSchema = z
  .array(dayOffsetSchema)
  .max(
    MAX_REVISION_INTERVALS,
    `At most ${MAX_REVISION_INTERVALS} revisions per attempt type`,
  )
  .superRefine((days, ctx) => {
    const seen = new Set<number>();
    for (let i = 0; i < days.length; i += 1) {
      if (seen.has(days[i]!)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Day offsets must be unique",
          path: [i],
        });
      }
      seen.add(days[i]!);
    }
  });

export const revisionIntervalsSchema = z.object({
  SELF: intervalsForAttemptSchema,
  HINT: intervalsForAttemptSchema,
  VIDEO: intervalsForAttemptSchema,
});

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    revisionIntervals: revisionIntervalsSchema.optional(),
  })
  .refine(
    (data) => data.name !== undefined || data.revisionIntervals !== undefined,
    { message: "Provide a name and/or revision schedule to update" },
  );

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
