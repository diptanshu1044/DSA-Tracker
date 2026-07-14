import type {
  ConfidenceLevel,
  ReviewHistoryEntry,
  ReviewResult,
} from "@/types/api";
import { startOfUtcDay } from "@/lib/dates";

export const REVIEW_RESULT_OPTIONS = [
  { value: "SELF" as const, label: "Solved", emoji: "🟢" },
  { value: "HINT" as const, label: "Needed Hint", emoji: "🟡" },
  { value: "VIDEO" as const, label: "Needed Solution", emoji: "🔴" },
] as const;

export const CONFIDENCE_OPTIONS = [
  { value: "LOW" as const, label: "Low" },
  { value: "MEDIUM" as const, label: "Medium" },
  { value: "HIGH" as const, label: "High" },
] as const;

const resultLabels: Record<ReviewResult, string> = {
  SELF: "Solved",
  HINT: "Needed Hint",
  VIDEO: "Needed Solution",
};

const resultEmojis: Record<ReviewResult, string> = {
  SELF: "🟢",
  HINT: "🟡",
  VIDEO: "🔴",
};

const confidenceLabels: Record<ConfidenceLevel, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

export function reviewResultLabel(result: ReviewResult | string): string {
  return resultLabels[result as ReviewResult] ?? result;
}

export function reviewResultEmoji(result: ReviewResult | string): string {
  return resultEmojis[result as ReviewResult] ?? "○";
}

export function confidenceLabel(
  confidence: ConfidenceLevel | string | null | undefined,
): string {
  if (!confidence) return "—";
  return confidenceLabels[confidence as ConfidenceLevel] ?? confidence;
}

function daysBetween(from: Date, to: Date): number {
  const start = startOfUtcDay(from).getTime();
  const end = startOfUtcDay(to).getTime();
  return Math.max(0, Math.round((end - start) / (24 * 60 * 60 * 1000)));
}

export type ReviewLearningSummary = {
  dateAdded: string | null;
  currentStatus: string;
  initialAttemptResult: ReviewResult | null;
  reviewsCompleted: number;
  successfulReviews: number;
  reviewsRequiringHint: number;
  reviewsRequiringSolution: number;
  currentSuccessStreak: number;
  lastReviewDate: string | null;
  nextScheduledReview: string | null;
};

export type ReviewDerivedStats = {
  totalAttempts: number;
  totalReviews: number;
  successfulReviews: number;
  hintReviews: number;
  solutionReviews: number;
  reviewSuccessPercentage: number | null;
  daysSinceAdded: number | null;
  daysSinceFirstIndependentSolve: number | null;
};

export function deriveReviewLearningSummary(
  history: ReviewHistoryEntry[],
  options: {
    statusLabel: string;
    nextScheduledReview: string | null;
  },
): ReviewLearningSummary {
  const initial = history.find((entry) => entry.type === "INITIAL") ?? null;
  const reviews = history.filter((entry) => entry.type === "REVIEW");
  const lastEntry = history[history.length - 1] ?? null;

  let currentSuccessStreak = 0;
  for (let i = history.length - 1; i >= 0; i -= 1) {
    if (history[i]?.result === "SELF") {
      currentSuccessStreak += 1;
    } else {
      break;
    }
  }

  return {
    dateAdded: initial?.completedAt ?? null,
    currentStatus: options.statusLabel,
    initialAttemptResult: initial?.result ?? null,
    reviewsCompleted: reviews.length,
    successfulReviews: reviews.filter((entry) => entry.result === "SELF").length,
    reviewsRequiringHint: reviews.filter((entry) => entry.result === "HINT")
      .length,
    reviewsRequiringSolution: reviews.filter(
      (entry) => entry.result === "VIDEO",
    ).length,
    currentSuccessStreak,
    lastReviewDate:
      reviews.length > 0
        ? (reviews[reviews.length - 1]?.completedAt ?? null)
        : (lastEntry?.completedAt ?? null),
    nextScheduledReview: options.nextScheduledReview,
  };
}

export function deriveReviewStats(
  history: ReviewHistoryEntry[],
  now: Date = new Date(),
): ReviewDerivedStats {
  const reviews = history.filter((entry) => entry.type === "REVIEW");
  const successfulReviews = reviews.filter(
    (entry) => entry.result === "SELF",
  ).length;
  const hintReviews = reviews.filter((entry) => entry.result === "HINT").length;
  const solutionReviews = reviews.filter(
    (entry) => entry.result === "VIDEO",
  ).length;

  const initial = history.find((entry) => entry.type === "INITIAL");
  const firstIndependent = history.find((entry) => entry.result === "SELF");

  return {
    totalAttempts: history.length,
    totalReviews: reviews.length,
    successfulReviews,
    hintReviews,
    solutionReviews,
    reviewSuccessPercentage:
      reviews.length === 0
        ? null
        : Math.round((successfulReviews / reviews.length) * 100),
    daysSinceAdded: initial
      ? daysBetween(new Date(initial.completedAt), now)
      : null,
    daysSinceFirstIndependentSolve: firstIndependent
      ? daysBetween(new Date(firstIndependent.completedAt), now)
      : null,
  };
}
