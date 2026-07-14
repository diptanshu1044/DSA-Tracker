import type {
  AttemptType,
  Revision,
  RevisionProblemSummary,
} from "@/types/api";

const attemptLabels: Record<AttemptType, string> = {
  SELF: "Self",
  HINT: "Hint",
  VIDEO: "Video",
};

export function getRevisionProblem(
  revision: Revision,
): RevisionProblemSummary | null {
  const value = revision.problemId;
  if (!value || typeof value === "string") {
    return null;
  }
  return value;
}

export function getRevisionProblemId(revision: Revision): string | null {
  const value = revision.problemId;
  if (!value) {
    return null;
  }
  if (typeof value === "string") {
    return value;
  }
  return value._id;
}

export function attemptTypeLabel(attemptType: AttemptType | string): string {
  return attemptLabels[attemptType as AttemptType] ?? attemptType;
}
