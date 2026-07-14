import type { QueryFilter } from "mongoose";
import {
  Problem,
  type AttemptType,
  type IProblem,
  type IProblemDocument,
} from "../models/Problem.js";
import { Revision } from "../models/Revision.js";
import { AppError } from "../utils/AppError.js";
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

async function scheduleRevisionsForAttempt(
  userId: string,
  problemId: IProblemDocument["_id"],
  attemptType: AttemptType,
  from: Date = new Date(),
): Promise<void> {
  const intervals = REVISION_INTERVALS_BY_ATTEMPT[attemptType];
  if (intervals.length === 0) {
    return;
  }

  const docs = intervals.map((days, index) => {
    const dueDate = new Date(from);
    dueDate.setUTCDate(dueDate.getUTCDate() + days);
    dueDate.setUTCHours(0, 0, 0, 0);

    return {
      userId,
      problemId,
      dueDate,
      revisionNumber: index + 1,
      completed: false,
    };
  });

  await Revision.insertMany(docs);
}

export async function createProblem(
  userId: string,
  input: CreateProblemInput,
): Promise<IProblemDocument> {
  await assertCanAddProblem(userId);
  await assertUniqueProblemUrl(userId, input.url);

  try {
    const problem = await Problem.create({
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
    filter.attemptType = query.attemptType as AttemptType;
  }

  if (query.search) {
    const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { title: { $regex: escaped, $options: "i" } },
      { url: { $regex: escaped, $options: "i" } },
    ];
  }

  const skip = paginationSkip(query.page, query.limit);
  const [items, total] = await Promise.all([
    Problem.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(query.limit),
    Problem.countDocuments(filter),
  ]);

  return {
    items,
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

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === 11000
  );
}
