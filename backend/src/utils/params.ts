import { AppError } from "./AppError.js";

/**
 * Express 5 types path params as `string | string[]`.
 * Route params for `:id` style paths are always a single string.
 */
export function paramId(
  value: string | string[] | undefined,
  fieldName = "id",
): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new AppError(`Invalid ${fieldName}`, 400);
  }
  return value;
}
