import { Types } from "mongoose";
import { Problem, type AttemptType } from "../models/Problem.js";
import { Revision } from "../models/Revision.js";
import { ReviewHistory } from "../models/ReviewHistory.js";
import { daysOverdue, startOfNextUtcDay, startOfUtcDay } from "../utils/dates.js";

/** Days overdue before a problem is considered forgotten. */
export const FORGOTTEN_OVERDUE_DAYS = 7;

export const PROBLEM_STATUSES = [
  "mastered",
  "learning",
  "need_review",
  "overdue",
  "new",
  "forgotten",
] as const;

export type ProblemStatus = (typeof PROBLEM_STATUSES)[number];

export interface ProblemRevisionSummary {
  dueDate: Date;
  completed: boolean;
}

export interface ClassifyProblemInput {
  attemptType: AttemptType;
  revisions: ProblemRevisionSummary[];
  hasReviewHistory: boolean;
  todayStart?: Date;
  tomorrowStart?: Date;
}

/**
 * Mutually exclusive problem learning status derived from revisions + review history.
 *
 * Priority: forgotten → overdue → need_review → new → learning → mastered
 */
export function classifyProblemStatus(
  input: ClassifyProblemInput,
): ProblemStatus {
  const todayStart = input.todayStart ?? startOfUtcDay();
  const tomorrowStart = input.tomorrowStart ?? startOfNextUtcDay(todayStart);
  const incomplete = input.revisions.filter((revision) => !revision.completed);

  if (incomplete.length > 0) {
    const earliestDue = incomplete.reduce((earliest, revision) =>
      revision.dueDate < earliest ? revision.dueDate : earliest,
    incomplete[0]!.dueDate);

    if (earliestDue < todayStart) {
      return daysOverdue(earliestDue, todayStart) >= FORGOTTEN_OVERDUE_DAYS
        ? "forgotten"
        : "overdue";
    }

    if (earliestDue < tomorrowStart) {
      return "need_review";
    }

    if (!input.hasReviewHistory && input.attemptType !== "SELF") {
      return "new";
    }

    return "learning";
  }

  if (!input.hasReviewHistory && input.attemptType !== "SELF") {
    return "new";
  }

  return "mastered";
}

export interface ClassifiedProblem {
  problemId: string;
  title: string;
  attemptType: AttemptType;
  topics: string[];
  timeTaken?: number;
  createdAt: Date;
  status: ProblemStatus;
  revisions: ProblemRevisionSummary[];
  hasReviewHistory: boolean;
  reviewCount: number;
  successfulReviewCount: number;
  completedRevisionCount: number;
  lastCompletedRevisionAt: Date | null;
}

type LeanProblem = {
  _id: Types.ObjectId;
  title: string;
  attemptType: AttemptType;
  topics?: string[];
  timeTaken?: number;
  createdAt: Date;
};

type LeanRevision = {
  problemId: Types.ObjectId;
  dueDate: Date;
  completed: boolean;
  completedAt?: Date | null;
};

type LeanReviewAggregate = {
  _id: Types.ObjectId;
  reviewCount: number;
  successfulReviewCount: number;
};

/**
 * Load every problem for a user with revision/review context and classify status.
 */
export async function loadClassifiedProblems(
  userId: string,
  now: Date = new Date(),
): Promise<ClassifiedProblem[]> {
  const uid = new Types.ObjectId(userId);
  const todayStart = startOfUtcDay(now);
  const tomorrowStart = startOfNextUtcDay(todayStart);

  const [problems, revisions, reviewAggregates] = await Promise.all([
    Problem.find({ userId: uid })
      .select("title attemptType topics timeTaken createdAt")
      .lean<LeanProblem[]>(),
    Revision.find({ userId: uid })
      .select("problemId dueDate completed completedAt")
      .lean<LeanRevision[]>(),
    ReviewHistory.aggregate<LeanReviewAggregate>([
      { $match: { userId: uid, type: "REVIEW" } },
      {
        $group: {
          _id: "$problemId",
          reviewCount: { $sum: 1 },
          successfulReviewCount: {
            $sum: { $cond: [{ $eq: ["$result", "SELF"] }, 1, 0] },
          },
        },
      },
    ]),
  ]);

  const revisionsByProblem = new Map<string, LeanRevision[]>();
  for (const revision of revisions) {
    const key = String(revision.problemId);
    const list = revisionsByProblem.get(key);
    if (list) {
      list.push(revision);
    } else {
      revisionsByProblem.set(key, [revision]);
    }
  }

  const reviewsByProblem = new Map(
    reviewAggregates.map((row) => [String(row._id), row]),
  );

  return problems.map((problem) => {
    const problemId = String(problem._id);
    const problemRevisions = revisionsByProblem.get(problemId) ?? [];
    const reviewAgg = reviewsByProblem.get(problemId);
    const hasReviewHistory = (reviewAgg?.reviewCount ?? 0) > 0;
    const revisionSummaries: ProblemRevisionSummary[] = problemRevisions.map(
      (revision) => ({
        dueDate: revision.dueDate,
        completed: revision.completed,
      }),
    );

    const completedRevisions = problemRevisions.filter(
      (revision) => revision.completed && revision.completedAt,
    );
    const lastCompletedRevisionAt =
      completedRevisions.length === 0
        ? null
        : completedRevisions.reduce((latest, revision) => {
            const completedAt = revision.completedAt!;
            return completedAt > latest ? completedAt : latest;
          }, completedRevisions[0]!.completedAt!);

    return {
      problemId,
      title: problem.title,
      attemptType: problem.attemptType,
      topics: problem.topics ?? [],
      timeTaken: problem.timeTaken,
      createdAt: problem.createdAt,
      status: classifyProblemStatus({
        attemptType: problem.attemptType,
        revisions: revisionSummaries,
        hasReviewHistory,
        todayStart,
        tomorrowStart,
      }),
      revisions: revisionSummaries,
      hasReviewHistory,
      reviewCount: reviewAgg?.reviewCount ?? 0,
      successfulReviewCount: reviewAgg?.successfulReviewCount ?? 0,
      completedRevisionCount: completedRevisions.length,
      lastCompletedRevisionAt,
    };
  });
}

export async function findProblemIdsByStatus(
  userId: string,
  status: ProblemStatus,
  now: Date = new Date(),
): Promise<Types.ObjectId[]> {
  const classified = await loadClassifiedProblems(userId, now);
  return classified
    .filter((problem) => problem.status === status)
    .map((problem) => new Types.ObjectId(problem.problemId));
}
