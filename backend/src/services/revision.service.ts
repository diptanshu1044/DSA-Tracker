import type { QueryFilter } from "mongoose";
import { Problem } from "../models/Problem.js";
import {
  Revision,
  type IRevision,
  type IRevisionDocument,
} from "../models/Revision.js";
import { AppError } from "../utils/AppError.js";
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
  UpdateRevisionInput,
} from "../validators/revision.validators.js";

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
): Promise<IRevisionDocument> {
  const revision = await Revision.findOne({
    _id: parseObjectId(revisionId, "revision id"),
    userId,
  });

  if (!revision) {
    throw new AppError("Revision not found", 404);
  }

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

  try {
    await revision.save();
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
