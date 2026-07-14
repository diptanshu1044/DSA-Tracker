import { Types } from "mongoose";
import { Problem } from "../../../models/Problem.js";
import { ReviewHistory } from "../../../models/ReviewHistory.js";
import type {
  NewProblemQueueItem,
  QueueItem,
  QueueSectionBuilder,
} from "../types.js";
import { toQueueProblemSummary } from "../problem-summary.js";

const NEW_PROBLEMS_LIMIT = 10;

/**
 * New problems: logged but never reviewed (no REVIEW history), not already
 * in overdue/due-today, and not SELF (those intentionally skip the review path).
 * Oldest added first.
 */
export const newProblemsSectionBuilder: QueueSectionBuilder = {
  id: "new_problems",
  title: "New Problems",
  icon: "✨",
  async build(ctx) {
    const reviewedIds = await ReviewHistory.distinct("problemId", {
      userId: ctx.userId,
      type: "REVIEW",
    });

    const excludeIds = [
      ...reviewedIds.map((id) => String(id)),
      ...ctx.reviewProblemIds,
    ].map((id) => new Types.ObjectId(id));

    const docs = await Problem.find({
      userId: ctx.userId,
      attemptType: { $ne: "SELF" },
      ...(excludeIds.length > 0 ? { _id: { $nin: excludeIds } } : {}),
    })
      .sort({ createdAt: 1 })
      .limit(NEW_PROBLEMS_LIMIT)
      .select("title url attemptType difficulty topics createdAt")
      .lean();

    const items: QueueItem[] = [];

    for (const doc of docs) {
      const problem = toQueueProblemSummary(doc);
      if (!problem) {
        continue;
      }

      const item: NewProblemQueueItem = {
        kind: "new_problem",
        problem,
        addedToday:
          problem.createdAt >= ctx.todayStart &&
          problem.createdAt < ctx.tomorrowStart,
      };
      items.push(item);
    }

    return items;
  },
};
