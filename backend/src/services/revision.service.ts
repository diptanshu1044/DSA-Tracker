import type { QueryFilter } from "mongoose";
import { Problem } from "../models/Problem.js";
import {
  Revision,
  type IRevision,
  type IRevisionDocument,
} from "../models/Revision.js";
import { AppError } from "../utils/AppError.js";
import { startOfUtcDay } from "../utils/dates.js";
import { isDuplicateKeyError } from "../utils/mongo.js";
import { parseObjectId } from "../utils/objectId.js";
import {
  buildPaginationMeta,
  paginationSkip,
  type PaginatedResult,
} from "../utils/pagination.js";
import type {
  CreateRevisionInput,
  ListRevisionsQuery,
  ScheduleAdditionalRevisionInput,
  UpdateRevisionInput,
} from "../validators/revision.validators.js";
import {
  createReviewHistoryEntry,
  getNextPendingReviewDate,
} from "./review-history.service.js";

export type UpdateRevisionResult = {
  revision: IRevisionDocument;
  /** True when this completion left the problem with zero pending revisions. */
  revisionCycleComplete: boolean;
};

export type RetryFailedRevisionResult = {
  revision: IRevisionDocument;
  nextRevision: IRevisionDocument;
  /** Always false after a successful retry — a pending review was just created. */
  revisionCycleComplete: false;
};

/**
 * Days until the next review after a failed attempt.
 * Kept as a single resolution point so adaptive intervals can land here later
 * without changing the one-click retry API surface.
 */
export function resolveFailedReviewRetryDays(_context?: {
  consecutiveFailures?: number;
}): number {
  return 1;
}

async function createPendingRevisionAtOffset(
  userId: string,
  problemId: IRevisionDocument["problemId"],
  days: number,
): Promise<IRevisionDocument> {
  const dueDate = startOfUtcDay();
  dueDate.setUTCDate(dueDate.getUTCDate() + days);

  const revisionNumber = await nextRevisionNumber(userId, problemId);

  try {
    const revision = await Revision.create({
      userId,
      problemId,
      dueDate,
      revisionNumber,
      completed: false,
    });
    await revision.populate("problemId", "title url attemptType");
    return revision;
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new AppError(
        "A revision with this number already exists for the problem",
        409,
        { revisionNumber: ["Revision number must be unique per problem"] },
      );
    }
    throw error;
  }
}

async function assertProblemOwnedByUser(
  userId: string,
  problemId: string,
): Promise<void> {
  const problem = await Problem.findOne({
    _id: parseObjectId(problemId, "problemId"),
    userId,
  })
    .select("_id")
    .lean();

  if (!problem) {
    throw new AppError("Problem not found", 404);
  }
}

async function nextRevisionNumber(
  userId: string,
  problemId: IRevisionDocument["problemId"],
): Promise<number> {
  const last = await Revision.findOne({ userId, problemId })
    .sort({ revisionNumber: -1 })
    .select("revisionNumber")
    .lean();
  return (last?.revisionNumber ?? 0) + 1;
}

export async function createRevision(
  userId: string,
  input: CreateRevisionInput,
): Promise<IRevisionDocument> {
  await assertProblemOwnedByUser(userId, input.problemId);

  const completed = input.completed ?? false;
  let completedAt = input.completedAt;
  if (completed && !completedAt) {
    completedAt = new Date();
  }
  if (!completed) {
    completedAt = undefined;
  }

  try {
    return await Revision.create({
      userId,
      problemId: input.problemId,
      dueDate: input.dueDate,
      revisionNumber: input.revisionNumber,
      completed,
      ...(completedAt ? { completedAt } : {}),
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new AppError(
        "A revision with this number already exists for the problem",
        409,
        { revisionNumber: ["Revision number must be unique per problem"] },
      );
    }
    throw error;
  }
}

export async function listRevisions(
  userId: string,
  query: ListRevisionsQuery,
): Promise<PaginatedResult<IRevisionDocument>> {
  const filter: QueryFilter<IRevision> = { userId };

  if (query.problemId) {
    filter.problemId = parseObjectId(query.problemId, "problemId");
  }

  if (query.completed !== undefined) {
    filter.completed = query.completed;
  }

  if (query.dueBefore || query.dueAfter) {
    filter.dueDate = {};
    if (query.dueAfter) {
      filter.dueDate.$gte = query.dueAfter;
    }
    if (query.dueBefore) {
      filter.dueDate.$lte = query.dueBefore;
    }
  }

  const skip = paginationSkip(query.page, query.limit);
  const [items, total] = await Promise.all([
    Revision.find(filter)
      .sort({ dueDate: 1, revisionNumber: 1 })
      .skip(skip)
      .limit(query.limit)
      .populate("problemId", "title url attemptType")
      .lean(),
    Revision.countDocuments(filter),
  ]);

  return {
    items: items as unknown as IRevisionDocument[],
    pagination: buildPaginationMeta(query.page, query.limit, total),
  };
}

export async function getRevisionById(
  userId: string,
  revisionId: string,
): Promise<IRevisionDocument> {
  const revision = await Revision.findOne({
    _id: parseObjectId(revisionId, "revision id"),
    userId,
  }).populate("problemId", "title url attemptType");

  if (!revision) {
    throw new AppError("Revision not found", 404);
  }

  return revision;
}

export async function updateRevision(
  userId: string,
  revisionId: string,
  input: UpdateRevisionInput,
): Promise<UpdateRevisionResult> {
  const revision = await Revision.findOne({
    _id: parseObjectId(revisionId, "revision id"),
    userId,
  });

  if (!revision) {
    throw new AppError("Revision not found", 404);
  }

  const wasCompleted = revision.completed;

  if (input.dueDate !== undefined) {
    revision.dueDate = input.dueDate;
  }

  if (input.revisionNumber !== undefined) {
    revision.revisionNumber = input.revisionNumber;
  }

  if (input.completed !== undefined) {
    revision.completed = input.completed;
    if (input.completed) {
      revision.completedAt =
        input.completedAt === null
          ? new Date()
          : (input.completedAt ?? revision.completedAt ?? new Date());
    } else {
      revision.completedAt = undefined;
    }
  } else if (input.completedAt !== undefined && revision.completed) {
    if (input.completedAt === null) {
      revision.completedAt = undefined;
      revision.completed = false;
    } else {
      revision.completedAt = input.completedAt;
    }
  }

  const becameCompleted = !wasCompleted && revision.completed === true;

  if (becameCompleted && (!input.result || !input.confidence)) {
    throw new AppError(
      "Result and confidence are required when completing a revision",
      400,
    );
  }

  try {
    await revision.save();
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new AppError(
        "A revision with this number already exists for the problem",
        409,
        { revisionNumber: ["Revision number must be unique per problem"] },
      );
    }
    throw error;
  }

  let revisionCycleComplete = false;
  if (becameCompleted) {
    const nextReviewDate = await getNextPendingReviewDate(
      userId,
      revision.problemId,
    );

    try {
      await createReviewHistoryEntry({
        userId,
        problemId: revision.problemId,
        revisionId: revision._id,
        revisionNumber: revision.revisionNumber,
        scheduledDate: revision.dueDate,
        completedAt: revision.completedAt ?? new Date(),
        result: input.result!,
        confidence: input.confidence!,
        timeTaken: input.timeTaken,
        nextReviewDate,
      });
    } catch (error) {
      if (!isDuplicateKeyError(error)) {
        throw error;
      }
      // History already recorded for this revision — keep scheduling logic intact.
    }

    const pendingCount = await Revision.countDocuments({
      userId,
      problemId: revision.problemId,
      completed: false,
    });
    revisionCycleComplete = pendingCount === 0;
  }

  await revision.populate("problemId", "title url attemptType");
  return { revision, revisionCycleComplete };
}

/**
 * Completes a failed review and immediately schedules the next one (default: tomorrow).
 * One-click recovery path — no date picker, preserves full review history.
 */
export async function retryFailedRevision(
  userId: string,
  revisionId: string,
): Promise<RetryFailedRevisionResult> {
  const revision = await Revision.findOne({
    _id: parseObjectId(revisionId, "revision id"),
    userId,
  });

  if (!revision) {
    throw new AppError("Revision not found", 404);
  }

  if (revision.completed) {
    throw new AppError("Revision is already completed", 400);
  }

  const completedAt = new Date();
  revision.completed = true;
  revision.completedAt = completedAt;

  try {
    await revision.save();
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new AppError(
        "A revision with this number already exists for the problem",
        409,
        { revisionNumber: ["Revision number must be unique per problem"] },
      );
    }
    throw error;
  }

  const retryDays = resolveFailedReviewRetryDays();
  const nextRevision = await createPendingRevisionAtOffset(
    userId,
    revision.problemId,
    retryDays,
  );

  try {
    await createReviewHistoryEntry({
      userId,
      problemId: revision.problemId,
      revisionId: revision._id,
      revisionNumber: revision.revisionNumber,
      scheduledDate: revision.dueDate,
      completedAt,
      result: "VIDEO",
      confidence: "LOW",
      nextReviewDate: nextRevision.dueDate,
      autoRescheduled: true,
    });
  } catch (error) {
    if (!isDuplicateKeyError(error)) {
      throw error;
    }
  }

  await revision.populate("problemId", "title url attemptType");
  return {
    revision,
    nextRevision,
    revisionCycleComplete: false,
  };
}

/**
 * Schedules one extra revision after a completed cycle (user choice of 3 / 7 / 10 days).
 * Does not alter initial attempt-type scheduling.
 */
export async function scheduleAdditionalRevision(
  userId: string,
  input: ScheduleAdditionalRevisionInput,
): Promise<IRevisionDocument> {
  const problemObjectId = parseObjectId(input.problemId, "problemId");
  await assertProblemOwnedByUser(userId, input.problemId);
  return createPendingRevisionAtOffset(userId, problemObjectId, input.days);
}

export async function deleteRevision(
  userId: string,
  revisionId: string,
): Promise<void> {
  const revision = await Revision.findOne({
    _id: parseObjectId(revisionId, "revision id"),
    userId,
  });

  if (!revision) {
    throw new AppError("Revision not found", 404);
  }

  await revision.deleteOne();
}
