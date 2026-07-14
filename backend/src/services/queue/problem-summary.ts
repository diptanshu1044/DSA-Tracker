import type { QueueProblemSummary } from "./types.js";

export function toQueueProblemSummary(value: unknown): QueueProblemSummary | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (
    typeof record.title !== "string" ||
    typeof record.url !== "string" ||
    typeof record.attemptType !== "string" ||
    record._id == null
  ) {
    return null;
  }

  const createdAtRaw = record.createdAt;
  const createdAt =
    createdAtRaw instanceof Date
      ? createdAtRaw
      : typeof createdAtRaw === "string" || typeof createdAtRaw === "number"
        ? new Date(createdAtRaw)
        : null;

  if (!createdAt || Number.isNaN(createdAt.getTime())) {
    return null;
  }

  const topics = Array.isArray(record.topics)
    ? record.topics.filter((t): t is string => typeof t === "string")
    : [];

  const difficulty =
    typeof record.difficulty === "string" ? record.difficulty : undefined;

  return {
    _id: String(record._id),
    title: record.title,
    url: record.url,
    difficulty,
    topics,
    attemptType: record.attemptType,
    createdAt,
  };
}
