import type { QueryFilter } from "mongoose";
import {
  Problem,
  type AttemptType,
  type IProblem,
  type IProblemDocument,
} from "../models/Problem.js";
import { Revision } from "../models/Revision.js";
import { User } from "../models/User.js";
import type { IReviewHistory } from "../models/ReviewHistory.js";
import { AppError } from "../utils/AppError.js";
import {
  humanizeSlug,
  parseLeetCodeUrl,
} from "../utils/leetcodeUrl.js";
import { isDuplicateKeyError } from "../utils/mongo.js";
import { parseObjectId } from "../utils/objectId.js";
import {
  buildPaginationMeta,
  paginationSkip,
  type PaginatedResult,
} from "../utils/pagination.js";
import type {
  CreateProblemInput,
  ListProblemsQuery,
  UpdateProblemInput,
} from "../validators/problem.validators.js";
import {
  DEFAULT_REVISION_INTERVALS,
  normalizeRevisionIntervals,
} from "../constants/revision-intervals.js";
import { assertCanAddProblem } from "./dashboard.service.js";
import { findProblemIdsByStatus } from "./problem-status.js";
import {
  createInitialReviewHistory,
  deleteReviewHistoryForProblem,
  getNextPendingReviewDate,
  listReviewHistory,
} from "./review-history.service.js";
import { startOfNextUtcDay, startOfUtcDay } from "../utils/dates.js";

/**
 * Fallback intervals when a user document has no saved schedule.
 * Prefer `getRevisionIntervalsForUser` for scheduling.
 */
export const REVISION_INTERVALS_BY_ATTEMPT = DEFAULT_REVISION_INTERVALS;

async function getRevisionIntervalsForUser(
  userId: string,
  attemptType: AttemptType,
): Promise<readonly number[]> {
  const user = await User.findById(userId).select("revisionIntervals").lean();
  const intervals = normalizeRevisionIntervals(user?.revisionIntervals);
  return intervals[attemptType];
}

export async function assertUniqueProblemUrl(
  userId: string,
  url: string,
  excludeProblemId?: string,
): Promise<void> {
  const filter: QueryFilter<IProblem> = { userId, url };
  if (excludeProblemId) {
    filter._id = { $ne: parseObjectId(excludeProblemId, "problem id") };
  }

  const existing = await Problem.findOne(filter).select("_id").lean();
  if (existing) {
    throw new AppError("A problem with this URL already exists", 409, {
      url: ["Problem URL must be unique"],
    });
  }
}

async function nextRevisionNumber(
  userId: string,
  problemId: IProblemDocument["_id"],
): Promise<number> {
  const last = await Revision.findOne({ userId, problemId })
    .sort({ revisionNumber: -1 })
    .select("revisionNumber")
    .lean();
  return (last?.revisionNumber ?? 0) + 1;
}

function utcDayStart(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

/**
 * Builds an inclusive UTC day range for Problem.createdAt ("solved/logged" time).
 * Explicit createdAfter/createdBefore win over `days`.
 */
function resolveCreatedAtRange(
  query: ListProblemsQuery,
): { $gte?: Date; $lt?: Date } | undefined {
  if (query.createdAfter || query.createdBefore) {
    const range: { $gte?: Date; $lt?: Date } = {};
    if (query.createdAfter) {
      range.$gte = utcDayStart(query.createdAfter);
    }
    if (query.createdBefore) {
      range.$lt = startOfNextUtcDay(utcDayStart(query.createdBefore));
    }
    return range;
  }

  if (query.days) {
    const todayStart = startOfUtcDay();
    const from = new Date(todayStart);
    from.setUTCDate(from.getUTCDate() - (query.days - 1));
    return {
      $gte: from,
      $lt: startOfNextUtcDay(todayStart),
    };
  }

  return undefined;
}

export async function scheduleRevisionsForAttempt(
  userId: string,
  problemId: IProblemDocument["_id"],
  attemptType: AttemptType,
  from: Date = new Date(),
): Promise<void> {
  const intervals = await getRevisionIntervalsForUser(userId, attemptType);
  if (intervals.length === 0) {
    return;
  }

  const startNumber = await nextRevisionNumber(userId, problemId);

  const docs = intervals.map((days, index) => {
    const dueDate = new Date(from);
    dueDate.setUTCDate(dueDate.getUTCDate() + days);
    dueDate.setUTCHours(0, 0, 0, 0);

    return {
      userId,
      problemId,
      dueDate,
      revisionNumber: startNumber + index,
      completed: false,
    };
  });

  await Revision.insertMany(docs);
}

async function reschedulePendingRevisions(
  userId: string,
  problemId: IProblemDocument["_id"],
  attemptType: AttemptType,
): Promise<void> {
  await Revision.deleteMany({
    userId,
    problemId,
    completed: false,
  });
  await scheduleRevisionsForAttempt(userId, problemId, attemptType);
}

function resetMetadataFields(problem: IProblemDocument, slug: string): void {
  problem.slug = slug;
  problem.title = humanizeSlug(slug);
  problem.topics = [];
  problem.metadataFetched = false;
  problem.metadataFetchedAt = null;
  problem.metadataError = null;
  problem.set("difficulty", undefined);
  problem.set("problemId", undefined);
}

export async function createProblem(
  userId: string,
  input: CreateProblemInput,
): Promise<IProblemDocument> {
  await assertCanAddProblem(userId);
  await assertUniqueProblemUrl(userId, input.url);

  const { slug } = parseLeetCodeUrl(input.url);
  const provisionalTitle = humanizeSlug(slug);

  let problem: IProblemDocument | null = null;

  try {
    problem = await Problem.create({
      userId,
      title: provisionalTitle,
      url: input.url,
      slug,
      topics: [],
      metadataFetched: false,
      metadataFetchedAt: null,
      metadataError: null,
      attemptType: input.attemptType,
      ...(input.timeTaken !== undefined ? { timeTaken: input.timeTaken } : {}),
    });

    await scheduleRevisionsForAttempt(
      userId,
      problem._id,
      input.attemptType,
    );

    const nextReviewDate = await getNextPendingReviewDate(userId, problem._id);
    await createInitialReviewHistory({
      userId,
      problemId: problem._id,
      result: input.attemptType,
      completedAt: problem.createdAt,
      confidence: input.confidence,
      timeTaken: input.timeTaken,
      nextReviewDate,
    });

    return problem;
  } catch (error) {
    if (problem) {
      await Promise.all([
        Revision.deleteMany({ problemId: problem._id, userId }),
        deleteReviewHistoryForProblem(userId, problem._id),
        Problem.deleteOne({ _id: problem._id }),
      ]);
    }

    if (isDuplicateKeyError(error)) {
      throw new AppError("A problem with this URL already exists", 409, {
        url: ["Problem URL must be unique"],
      });
    }
    throw error;
  }
}

export async function listProblems(
  userId: string,
  query: ListProblemsQuery,
): Promise<PaginatedResult<IProblemDocument>> {
  const filter: QueryFilter<IProblem> = {
    userId: parseObjectId(userId, "user id"),
  };

  if (query.attemptType) {
    filter.attemptType = query.attemptType;
  }

  if (query.search) {
    const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { title: { $regex: escaped, $options: "i" } },
      { url: { $regex: escaped, $options: "i" } },
      { slug: { $regex: escaped, $options: "i" } },
      // LeetCode frontend id (e.g. "1", "42")
      { problemId: { $regex: escaped, $options: "i" } },
    ];
  }

  if (query.topic) {
    if (query.topic === "Untagged") {
      // Analytics uses "Untagged" for problems with an empty topics array.
      filter.topics = { $size: 0 } as unknown as string[];
    } else {
      filter.topics = query.topic;
    }
  }

  if (query.status) {
    const ids = await findProblemIdsByStatus(userId, query.status);
    filter._id = { $in: ids };
  }

  const createdAtRange = resolveCreatedAtRange(query);
  if (createdAtRange) {
    filter.createdAt = createdAtRange;
  }

  const skip = paginationSkip(query.page, query.limit);
  const [items, total] = await Promise.all([
    Problem.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(query.limit)
      .lean(),
    Problem.countDocuments(filter),
  ]);

  return {
    items: items as unknown as IProblemDocument[],
    pagination: buildPaginationMeta(query.page, query.limit, total),
  };
}

export async function getProblemById(
  userId: string,
  problemId: string,
): Promise<IProblemDocument> {
  const problem = await Problem.findOne({
    _id: parseObjectId(problemId, "problem id"),
    userId,
  });

  if (!problem) {
    throw new AppError("Problem not found", 404);
  }

  return problem;
}

export type ProblemDetailsResult = {
  problem: IProblemDocument;
  reviewHistory: IReviewHistory[];
};

export async function getProblemDetails(
  userId: string,
  problemId: string,
): Promise<ProblemDetailsResult> {
  const problem = await getProblemById(userId, problemId);
  const reviewHistory = await listReviewHistory(userId, problemId);
  return { problem, reviewHistory };
}

export type UpdateProblemResult = {
  problem: IProblemDocument;
  /** True when URL changed and metadata should be re-fetched. */
  shouldRefetchMetadata: boolean;
};

export async function updateProblem(
  userId: string,
  problemId: string,
  input: UpdateProblemInput,
): Promise<UpdateProblemResult> {
  const problem = await getProblemById(userId, problemId);
  const previousAttemptType = problem.attemptType;
  let shouldRefetchMetadata = false;

  if (input.url !== undefined && input.url !== problem.url) {
    await assertUniqueProblemUrl(userId, input.url, problemId);
    const { slug } = parseLeetCodeUrl(input.url);
    problem.url = input.url;
    resetMetadataFields(problem, slug);
    shouldRefetchMetadata = true;
  }

  if (input.title !== undefined) {
    problem.title = input.title;
  }
  if (input.attemptType !== undefined) {
    problem.attemptType = input.attemptType;
  }
  if (input.timeTaken !== undefined) {
    if (input.timeTaken === null) {
      problem.timeTaken = undefined;
    } else {
      problem.timeTaken = input.timeTaken;
    }
  }

  try {
    await problem.save();

    if (shouldRefetchMetadata) {
      await Problem.updateOne(
        { _id: problem._id },
        { $unset: { difficulty: "", problemId: "" } },
      );
      problem.difficulty = undefined;
      problem.problemId = undefined;
    }

    if (
      input.attemptType !== undefined &&
      input.attemptType !== previousAttemptType
    ) {
      await reschedulePendingRevisions(
        userId,
        problem._id,
        input.attemptType,
      );
    }

    return { problem, shouldRefetchMetadata };
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new AppError("A problem with this URL already exists", 409, {
        url: ["Problem URL must be unique"],
      });
    }
    throw error;
  }
}

export async function deleteProblem(
  userId: string,
  problemId: string,
): Promise<void> {
  const problem = await getProblemById(userId, problemId);
  await Promise.all([
    Revision.deleteMany({ problemId: problem._id, userId }),
    deleteReviewHistoryForProblem(userId, problem._id),
  ]);
  await problem.deleteOne();
}
