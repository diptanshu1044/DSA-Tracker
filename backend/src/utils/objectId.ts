import { Types } from "mongoose";
import { AppError } from "./AppError.js";

export function parseObjectId(
  value: string,
  fieldName = "id",
): Types.ObjectId {
  if (!Types.ObjectId.isValid(value)) {
    throw new AppError(`Invalid ${fieldName}`, 400);
  }
  return new Types.ObjectId(value);
}
