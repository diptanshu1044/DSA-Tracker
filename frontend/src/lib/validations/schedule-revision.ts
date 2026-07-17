import { z } from "zod";
import { isUtcDateKey, toUtcDateKey } from "@/lib/dates";

export const MAX_MANUAL_REVISION_TIMES = 20;
export const MAX_MANUAL_INTERVAL_DAYS = 365;

const dateKeySchema = z
  .string()
  .trim()
  .refine(isUtcDateKey, "Enter a valid date");

export type ScheduleRevisionPayload =
  | {
      mode: "once";
      problemId: string;
      dueDate: string;
    }
  | {
      mode: "repeating";
      problemId: string;
      intervalDays: number;
      times: number;
      startDate: string;
    };

/**
 * Flat form schema (works better with RHF than a discriminated union).
 * Mode-specific fields are refined below; map to payload with `toSchedulePayload`.
 */
export const scheduleRevisionFormSchema = z
  .object({
    mode: z.enum(["once", "repeating"]),
    problemId: z.string().min(1, "Select a problem"),
    dueDate: z.string().optional(),
    intervalDays: z.union([z.number(), z.string()]).optional(),
    times: z.union([z.number(), z.string()]).optional(),
    startDate: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.mode === "once") {
      const parsed = dateKeySchema.safeParse(data.dueDate);
      if (!parsed.success) {
        ctx.addIssue({
          code: "custom",
          path: ["dueDate"],
          message: parsed.error.issues[0]?.message ?? "Enter a valid date",
        });
      }
      return;
    }

    const interval = Number(data.intervalDays);
    if (!Number.isInteger(interval) || interval < 1) {
      ctx.addIssue({
        code: "custom",
        path: ["intervalDays"],
        message: "Interval must be at least 1 day",
      });
    } else if (interval > MAX_MANUAL_INTERVAL_DAYS) {
      ctx.addIssue({
        code: "custom",
        path: ["intervalDays"],
        message: `Interval cannot exceed ${MAX_MANUAL_INTERVAL_DAYS} days`,
      });
    }

    const count = Number(data.times);
    if (!Number.isInteger(count) || count < 1) {
      ctx.addIssue({
        code: "custom",
        path: ["times"],
        message: "Schedule at least 1 revision",
      });
    } else if (count > MAX_MANUAL_REVISION_TIMES) {
      ctx.addIssue({
        code: "custom",
        path: ["times"],
        message: `At most ${MAX_MANUAL_REVISION_TIMES} revisions at once`,
      });
    }

    const start = dateKeySchema.safeParse(data.startDate);
    if (!start.success) {
      ctx.addIssue({
        code: "custom",
        path: ["startDate"],
        message: start.error.issues[0]?.message ?? "Enter a valid date",
      });
    }
  });

export type ScheduleRevisionFormValues = z.infer<
  typeof scheduleRevisionFormSchema
>;

export function toSchedulePayload(
  values: ScheduleRevisionFormValues,
): ScheduleRevisionPayload {
  if (values.mode === "once") {
    return {
      mode: "once",
      problemId: values.problemId,
      dueDate: values.dueDate!,
    };
  }
  return {
    mode: "repeating",
    problemId: values.problemId,
    intervalDays: Number(values.intervalDays),
    times: Number(values.times),
    startDate: values.startDate!,
  };
}

/** Preview due dates for the repeating schedule (UTC day keys). */
export function previewRepeatingDueDates(
  startDate: string,
  intervalDays: number,
  times: number,
): string[] {
  if (!isUtcDateKey(startDate) || intervalDays < 1 || times < 1) {
    return [];
  }

  const first = new Date(`${startDate}T00:00:00.000Z`);
  return Array.from({ length: times }, (_, index) => {
    const due = new Date(first);
    due.setUTCDate(due.getUTCDate() + index * intervalDays);
    return toUtcDateKey(due);
  });
}

/** Default first due for repeating: today + intervalDays. */
export function defaultRepeatingStartDate(intervalDays: number): string {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + Math.max(1, intervalDays));
  return toUtcDateKey(date);
}
