import { Revision } from "../../models/Revision.js";
import { startOfNextUtcDay, startOfUtcDay } from "../../utils/dates.js";
import { toQueueProblemSummary } from "./problem-summary.js";
import type {
  DueRevisionCandidate,
  QueueBuildContext,
  QueueItem,
  QueueSection,
  QueueSectionBuilder,
  TodaysQueue,
  TodaysQueueSummary,
} from "./types.js";
import { overdueSectionBuilder } from "./sections/overdue.js";
import { dueTodaySectionBuilder } from "./sections/due-today.js";
import { newProblemsSectionBuilder } from "./sections/new-problems.js";

/**
 * Ordered section builders. Prepend/append future builders here without
 * changing existing section logic.
 */
export const SECTION_BUILDERS: QueueSectionBuilder[] = [
  overdueSectionBuilder,
  dueTodaySectionBuilder,
  newProblemsSectionBuilder,
  // Future: highPrioritySectionBuilder, weakTopicsSectionBuilder, ...
];

const PROBLEM_POPULATE =
  "title url attemptType difficulty topics createdAt";

async function loadDueRevisions(userId: string, tomorrowStart: Date): Promise<DueRevisionCandidate[]> {
  const docs = await Revision.find({
    userId,
    completed: false,
    dueDate: { $lt: tomorrowStart },
  })
    .sort({ dueDate: 1, revisionNumber: 1 })
    .limit(100)
    .populate("problemId", PROBLEM_POPULATE)
    .lean();

  return docs.map((doc) => {
    const problem = toQueueProblemSummary(doc.problemId);
    return {
      revisionId: String(doc._id),
      dueDate: doc.dueDate,
      revisionNumber: doc.revisionNumber,
      completed: doc.completed,
      problem,
      problemCreatedAt: problem?.createdAt ?? null,
    };
  });
}

export async function createQueueBuildContext(
  userId: string,
): Promise<QueueBuildContext> {
  const todayStart = startOfUtcDay();
  const tomorrowStart = startOfNextUtcDay();
  const dueRevisions = await loadDueRevisions(userId, tomorrowStart);

  const reviewProblemIds = new Set<string>();
  for (const item of dueRevisions) {
    if (item.problem) {
      reviewProblemIds.add(item.problem._id);
    }
  }

  return {
    userId,
    todayStart,
    tomorrowStart,
    dueRevisions,
    reviewProblemIds,
  };
}

function summarize(sections: QueueSection[]): TodaysQueueSummary {
  const overdue =
    sections.find((s) => s.id === "overdue")?.items.length ?? 0;
  const dueToday =
    sections.find((s) => s.id === "due_today")?.items.length ?? 0;
  const newProblems =
    sections.find((s) => s.id === "new_problems")?.items.length ?? 0;

  return {
    overdue,
    dueToday,
    newProblems,
    totalTasks: overdue + dueToday + newProblems,
  };
}

/**
 * Builds Today's Queue by running registered section builders in priority order.
 * Empty sections are omitted.
 */
export async function buildTodaysQueue(userId: string): Promise<TodaysQueue> {
  const ctx = await createQueueBuildContext(userId);
  const sections: QueueSection[] = [];

  for (const builder of SECTION_BUILDERS) {
    const items: QueueItem[] = await builder.build(ctx);
    if (items.length === 0) {
      continue;
    }
    sections.push({
      id: builder.id,
      title: builder.title,
      icon: builder.icon,
      items,
    });
  }

  return {
    summary: summarize(sections),
    sections,
  };
}

/** Flat overdue+due-today list for legacy dashboard consumers. */
export function reviewItemsFromQueue(queue: TodaysQueue) {
  return queue.sections
    .filter((s) => s.id === "overdue" || s.id === "due_today")
    .flatMap((s) => s.items)
    .filter((item): item is Extract<QueueItem, { kind: "review" }> => item.kind === "review")
    .map((item) => ({
      _id: item.revisionId,
      dueDate: item.dueDate,
      revisionNumber: item.revisionNumber,
      completed: false,
      overdue: typeof item.daysOverdue === "number",
      problem: item.problem
        ? {
            _id: item.problem._id,
            title: item.problem.title,
            url: item.problem.url,
            attemptType: item.problem.attemptType,
          }
        : null,
    }));
}
