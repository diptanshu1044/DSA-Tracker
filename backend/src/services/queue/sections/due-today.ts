import type { QueueItem, QueueSectionBuilder, ReviewQueueItem } from "../types.js";

function compareDueToday(
  a: { dueDate: Date; problemCreatedAt: Date | null },
  b: { dueDate: Date; problemCreatedAt: Date | null },
): number {
  // Earlier scheduled review time
  if (a.dueDate.getTime() !== b.dueDate.getTime()) {
    return a.dueDate.getTime() - b.dueDate.getTime();
  }
  // Older added date
  const aCreated = a.problemCreatedAt?.getTime() ?? 0;
  const bCreated = b.problemCreatedAt?.getTime() ?? 0;
  return aCreated - bCreated;
}

export const dueTodaySectionBuilder: QueueSectionBuilder = {
  id: "due_today",
  title: "Due Today",
  icon: "📅",
  build(ctx) {
    const candidates = ctx.dueRevisions
      .filter(
        (r) => r.dueDate >= ctx.todayStart && r.dueDate < ctx.tomorrowStart,
      )
      .sort(compareDueToday);

    const items: QueueItem[] = candidates.map((r): ReviewQueueItem => ({
      kind: "review",
      revisionId: r.revisionId,
      dueDate: r.dueDate,
      revisionNumber: r.revisionNumber,
      problem: r.problem,
    }));

    return items;
  },
};
