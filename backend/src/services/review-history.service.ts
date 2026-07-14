import type { Types } from "mongoose";
import {
  Problem,
  type AttemptType,
  type IProblemDocument,
} from "../models/Problem.js";
import { Revision } from "../models/Revision.js";
import {
  ReviewHistory,
  type ConfidenceLevel,
  type IReviewHistory,
  type IReviewHistoryDocument,
  type ReviewResult,
} from "../models/ReviewHistory.js";
import { parseObjectId } from "../utils/objectId.js";

export type CreateInitialHistoryInput = {
  userId: string;
  problemId: Types.ObjectId;
  result: ReviewResult;
  completedAt: Date;
  confidence?: ConfidenceLevel;
  timeTaken?: number;
  nextReviewDate?: Date | null;
};

export type CreateReviewHistoryInput = {
  userId: string;
  problemId: Types.ObjectId;
  revisionId: Types.ObjectId;
  revisionNumber: number;
  scheduledDate: Date;
  completedAt: Date;
  result: ReviewResult;
  confidence: ConfidenceLevel;
  timeTaken?: number;
  nextReviewDate?: Date | null;
};

export async function getNextPendingReviewDate(
  userId: string,
  problemId: Types.ObjectId,
): Promise<Date | null> {
  const next = await Revision.findOne({
    userId,
    problemId,
    completed: false,
  })
    .sort({ dueDate: 1, revisionNumber: 1 })
    .select("dueDate")
    .lean();

  return next?.dueDate ?? null;
}

export async function createInitialReviewHistory(
  input: CreateInitialHistoryInput,
): Promise<IReviewHistoryDocument> {
  return ReviewHistory.create({
    userId: input.userId,
    problemId: input.problemId,
    type: "INITIAL",
    revisionNumber: null,
    revisionId: null,
    scheduledDate: input.completedAt,
    completedAt: input.completedAt,
    result: input.result,
    confidence: input.confidence ?? null,
    timeTaken: input.timeTaken ?? null,
    nextReviewDate: input.nextReviewDate ?? null,
  });
}

export async function createReviewHistoryEntry(
  input: CreateReviewHistoryInput,
): Promise<IReviewHistoryDocument> {
  return ReviewHistory.create({
    userId: input.userId,
    problemId: input.problemId,
    type: "REVIEW",
    revisionNumber: input.revisionNumber,
    revisionId: input.revisionId,
    scheduledDate: input.scheduledDate,
    completedAt: input.completedAt,
    result: input.result,
    confidence: input.confidence,
    timeTaken: input.timeTaken ?? null,
    nextReviewDate: input.nextReviewDate ?? null,
  });
}

/**
 * Ensures an INITIAL history row exists for problems created before Review History.
 * Never overwrites existing entries.
 */
export async function ensureInitialReviewHistory(
  userId: string,
  problem: IProblemDocument,
): Promise<void> {
  const existing = await ReviewHistory.exists({
    userId,
    problemId: problem._id,
    type: "INITIAL",
  });

  if (existing) {
    return;
  }

  const nextReviewDate = await getNextPendingReviewDate(userId, problem._id);

  await createInitialReviewHistory({
    userId,
    problemId: problem._id,
    result: problem.attemptType as AttemptType,
    completedAt: problem.createdAt,
    timeTaken: problem.timeTaken,
    nextReviewDate,
  });
}

export async function listReviewHistory(
  userId: string,
  problemId: string,
): Promise<IReviewHistory[]> {
  const problemObjectId = parseObjectId(problemId, "problem id");
  const problem = await Problem.findOne({
    _id: problemObjectId,
    userId,
  });

  if (!problem) {
    return [];
  }

  await ensureInitialReviewHistory(userId, problem);

  return ReviewHistory.find({
    userId,
    problemId: problemObjectId,
  })
    .sort({ completedAt: 1, createdAt: 1 })
    .lean();
}

export async function deleteReviewHistoryForProblem(
  userId: string,
  problemId: Types.ObjectId,
): Promise<void> {
  await ReviewHistory.deleteMany({ userId, problemId });
}
