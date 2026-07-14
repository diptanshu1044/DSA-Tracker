import type { QueryFilter } from "mongoose";
import {
  Problem,
  type AttemptType,
  type IProblem,
  type IProblemDocument,
} from "../models/Problem.js";
import { Revision } from "../models/Revision.js";
import { AppError } from "../utils/AppError.js";
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
import { assertCanAddProblem } from "./dashboard.service.js";

/**
 * Revision offsets by attempt type (days from creation, UTC midnight):
 * - SELF: no revisions
 * - HINT / VIDEO: tomorrow (+1) and +7 days
 */
export const REVISION_INTERVALS_BY_ATTEMPT: Record<
  AttemptType,
  readonly number[]
> = {
  SELF: [],
  HINT: [1, 7],
  VIDEO: [1, 7],
};

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

export async function scheduleRevisionsForAttempt(
  userId: string,
  problemId: IProblemDocument["_id"],
  attemptType: AttemptType,
  from: Date = new Date(),
): Promise<void> {
  const intervals = REVISION_INTERVALS_BY_ATTEMPT[attemptType];
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

export async function createProblem(
  userId: string,
  input: CreateProblemInput,
): Promise<IProblemDocument> {
  await assertCanAddProblem(userId);
  await assertUniqueProblemUrl(userId, input.url);

  let problem: IProblemDocument | null = null;

  try {
    problem = await Problem.create({
      userId,
      title: input.title,
      url: input.url,
      attemptType: input.attemptType,
      ...(input.timeTaken !== undefined ? { timeTaken: input.timeTaken } : {}),
    });

    await scheduleRevisionsForAttempt(
      userId,
      problem._id,
      input.attemptType,
    );
    return problem;
  } catch (error) {
    if (problem) {
      await Promise.all([
        Revision.deleteMany({ problemId: problem._id, userId }),
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
  const filter: QueryFilter<IProblem> = { userId };

  if (query.attemptType) {
    filter.attemptType = query.attemptType;
  }

  if (query.search) {
    const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const prefix = new RegExp(`^${escaped}`, "i");
    filter.$or = [{ title: prefix }, { url: prefix }];
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

export async function updateProblem(
  userId: string,
  problemId: string,
  input: UpdateProblemInput,
): Promise<IProblemDocument> {
  const problem = await getProblemById(userId, problemId);
  const previousAttemptType = problem.attemptType;

  if (input.url !== undefined && input.url !== problem.url) {
    await assertUniqueProblemUrl(userId, input.url, problemId);
    problem.url = input.url;
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

    return problem;
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
  await Revision.deleteMany({ problemId: problem._id, userId });
  await problem.deleteOne();
}
