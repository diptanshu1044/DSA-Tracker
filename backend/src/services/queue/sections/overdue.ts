import { daysOverdue } from "../../../utils/dates.js";
import type { QueueItem, QueueSectionBuilder, ReviewQueueItem } from "../types.js";

function compareOverdue(
  a: { dueDate: Date; problemCreatedAt: Date | null; days: number },
  b: { dueDate: Date; problemCreatedAt: Date | null; days: number },
): number {
  // Most overdue first
  if (b.days !== a.days) {
    return b.days - a.days;
  }
  // Older scheduled review date
  if (a.dueDate.getTime() !== b.dueDate.getTime()) {
    return a.dueDate.getTime() - b.dueDate.getTime();
  }
  // Older added date
  const aCreated = a.problemCreatedAt?.getTime() ?? 0;
  const bCreated = b.problemCreatedAt?.getTime() ?? 0;
  return aCreated - bCreated;
}

export const overdueSectionBuilder: QueueSectionBuilder = {
  id: "overdue",
  title: "Overdue Reviews",
  icon: "🔥",
  build(ctx) {
    const candidates = ctx.dueRevisions
      .filter((r) => r.dueDate < ctx.todayStart)
      .map((r) => ({
        ...r,
        days: daysOverdue(r.dueDate, ctx.todayStart),
      }))
      .sort(compareOverdue);

    const items: QueueItem[] = candidates.map((r): ReviewQueueItem => ({
      kind: "review",
      revisionId: r.revisionId,
      dueDate: r.dueDate,
      revisionNumber: r.revisionNumber,
      daysOverdue: r.days,
      problem: r.problem,
    }));

    return items;
  },
};
