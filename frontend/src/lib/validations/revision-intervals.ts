import { z } from "zod";
import type { AttemptType, RevisionIntervals } from "@/types/api";

export const MAX_REVISION_INTERVALS = 10;
export const MAX_REVISION_DAY_OFFSET = 365;

export const DEFAULT_REVISION_INTERVALS: RevisionIntervals = {
  SELF: [],
  HINT: [1, 7],
  VIDEO: [1, 7],
};

export const ATTEMPT_REVISION_LABELS: Record<AttemptType, string> = {
  SELF: "Solved Myself",
  HINT: "Took Hint",
  VIDEO: "Watched Solution",
};

const dayOffsetSchema = z
  .number()
  .int("Use a whole number of days")
  .min(1, "Day must be at least 1")
  .max(MAX_REVISION_DAY_OFFSET, `Day cannot exceed ${MAX_REVISION_DAY_OFFSET}`);

const intervalsForAttemptSchema = z
  .array(dayOffsetSchema)
  .max(
    MAX_REVISION_INTERVALS,
    `At most ${MAX_REVISION_INTERVALS} revisions allowed`,
  )
  .superRefine((days, ctx) => {
    const seen = new Set<number>();
    for (let i = 0; i < days.length; i += 1) {
      if (seen.has(days[i]!)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Each day must be unique",
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

export const updateRevisionIntervalsSchema = z.object({
  revisionIntervals: revisionIntervalsSchema,
});

export type UpdateRevisionIntervalsFormValues = z.infer<
  typeof updateRevisionIntervalsSchema
>;

export function normalizeRevisionIntervals(
  input?: Partial<RevisionIntervals> | null,
): RevisionIntervals {
  return {
    SELF: [...(input?.SELF ?? DEFAULT_REVISION_INTERVALS.SELF)],
    HINT: [...(input?.HINT ?? DEFAULT_REVISION_INTERVALS.HINT)],
    VIDEO: [...(input?.VIDEO ?? DEFAULT_REVISION_INTERVALS.VIDEO)],
  };
}

export function formatRevisionSchedule(days: number[]): string {
  if (days.length === 0) return "No revisions";
  return days
    .map((day) => (day === 1 ? "1 day" : `${day} days`))
    .join(", ");
}
