import { z } from "zod";
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
  })
  .refine(
    (data) =>
      data.dueDate !== undefined ||
      data.revisionNumber !== undefined ||
      data.completed !== undefined ||
      data.completedAt !== undefined,
    { message: "At least one field is required" },
  );

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

export type CreateRevisionInput = z.infer<typeof createRevisionSchema>;
export type UpdateRevisionInput = z.infer<typeof updateRevisionSchema>;
export type ListRevisionsQuery = z.infer<typeof listRevisionsQuerySchema>;
