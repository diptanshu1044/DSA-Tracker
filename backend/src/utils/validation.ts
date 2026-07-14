import { z } from "zod";
import { AppError } from "./AppError.js";

export function fieldErrorsFromZod(error: z.ZodError): Record<string, string[]> {
  const flattened = error.flatten();
  const result: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(flattened.fieldErrors)) {
    if (Array.isArray(value) && value.length > 0) {
      result[key] = value.filter(
        (item): item is string => typeof item === "string",
      );
    }
  }
  return result;
}

export function parseOrThrow<T>(
  schema: z.ZodType<T>,
  data: unknown,
  message = "Validation failed",
): T {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new AppError(message, 400, fieldErrorsFromZod(parsed.error));
  }
  return parsed.data;
}
