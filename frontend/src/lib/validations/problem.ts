import { z } from "zod";

export const ATTEMPT_TYPE_OPTIONS = [
  { value: "SELF", label: "Solved Myself" },
  { value: "HINT", label: "Took Hint" },
  { value: "VIDEO", label: "Watched Solution" },
] as const;

export const CONFIDENCE_OPTIONS = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
] as const;

function optionalTimeTaken(value: unknown): number | undefined {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

const LEETCODE_PROBLEM_URL =
  /^https?:\/\/(www\.)?leetcode\.com\/problems\/[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[^?#]*)?(\?[^#]*)?(#.*)?$/i;

/** Strip path suffixes like `/description` and normalize to `https://leetcode.com/problems/{slug}`. */
function normalizeLeetCodeUrl(raw: string): string {
  const parsed = new URL(raw.trim());
  const match = parsed.pathname.match(
    /^\/problems\/([a-z0-9]+(?:-[a-z0-9]+)*)(?:\/.*)?$/i,
  );
  const slug = match?.[1]?.toLowerCase();
  if (!slug) {
    return raw.trim();
  }
  return `https://leetcode.com/problems/${slug}`;
}

export const leetCodeUrlSchema = z
  .string()
  .trim()
  .min(1, "Problem link is required")
  .max(2048)
  .url("Enter a valid URL")
  .refine(
    (value) => LEETCODE_PROBLEM_URL.test(value),
    "Enter a valid LeetCode problem URL (e.g. https://leetcode.com/problems/two-sum/)",
  )
  .transform(normalizeLeetCodeUrl);

export const createProblemSchema = z.object({
  url: leetCodeUrlSchema,
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
  confidence: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
});

export type CreateProblemFormValues = z.input<typeof createProblemSchema>;
export type CreateProblemPayload = z.output<typeof createProblemSchema>;

export const updateProblemSchema = z.object({
  title: z.string().trim().min(1, "Problem name is required").max(300).optional(),
  url: leetCodeUrlSchema.optional(),
  attemptType: z
    .enum(["SELF", "HINT", "VIDEO"], {
      error: "Select how you attempted the problem",
    })
    .optional(),
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

export type UpdateProblemFormValues = z.input<typeof updateProblemSchema>;
export type UpdateProblemPayload = z.output<typeof updateProblemSchema>;
