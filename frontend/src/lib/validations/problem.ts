import { z } from "zod";

export const ATTEMPT_TYPE_OPTIONS = [
  { value: "SELF", label: "Solved Myself" },
  { value: "HINT", label: "Took Hint" },
  { value: "VIDEO", label: "Watched Solution" },
] as const;

function optionalTimeTaken(value: unknown): number | undefined {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export const createProblemSchema = z.object({
  title: z.string().trim().min(1, "Problem name is required").max(300),
  url: z
    .string()
    .trim()
    .min(1, "Problem link is required")
    .max(2048)
    .url("Enter a valid URL"),
  attemptType: z.enum(["SELF", "HINT", "VIDEO"], {
    error: "Select how you attempted the problem",
  }),
  timeTaken: z
    .union([z.string(), z.number()])
    .optional()
    .transform(optionalTimeTaken)
    .pipe(
      z
        .number()
        .min(0, "Time taken cannot be negative")
        .max(24 * 60, "Time taken cannot exceed 24 hours")
        .optional(),
    ),
});

export type CreateProblemFormValues = z.input<typeof createProblemSchema>;
export type CreateProblemPayload = z.output<typeof createProblemSchema>;
