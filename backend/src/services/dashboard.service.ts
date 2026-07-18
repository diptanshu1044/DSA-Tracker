import { Problem } from "../models/Problem.js";
import { Revision } from "../models/Revision.js";
import { PENDING_REVISION_LIMIT } from "../constants/limits.js";
import { AppError } from "../utils/AppError.js";
import { startOfNextUtcDay, startOfUtcDay } from "../utils/dates.js";
import {
  buildTodaysQueue,
  reviewItemsFromQueue,
  type TodaysQueue,
} from "./queue/index.js";

export interface DashboardProblemSummary {
  _id: string;
  title: string;
  url: string;
  attemptType: string;
}

export interface DashboardQueueItem {
  _id: string;
  dueDate: Date;
  revisionNumber: number;
  completed: boolean;
  overdue: boolean;
  problem: DashboardProblemSummary | null;
}

export interface DashboardStats {
  problemsAdded: number;
  pendingRevisions: number;
  /** Incomplete revisions due on the next UTC calendar day. */
  pendingRevisionsNextDay: number;
  overdue: number;
  addedToday: number;
}

export interface DashboardData {
  stats: DashboardStats;
  canAddProblem: boolean;
  /** @deprecated Prefer todaysQueue — flat list of overdue + due today reviews. */
  revisionQueue: DashboardQueueItem[];
  todaysQueue: TodaysQueue;
}

export async function getDashboard(userId: string): Promise<DashboardData> {
  const todayStart = startOfUtcDay();
  const tomorrowStart = startOfNextUtcDay();
  const dayAfterTomorrow = startOfNextUtcDay(tomorrowStart);

  const [
    problemsAdded,
    pendingRevisions,
    pendingRevisionsNextDay,
    overdue,
    addedToday,
    todaysQueue,
  ] = await Promise.all([
    Problem.countDocuments({ userId }),
    Revision.countDocuments({ userId, completed: false }),
    Revision.countDocuments({
      userId,
      completed: false,
      dueDate: { $gte: tomorrowStart, $lt: dayAfterTomorrow },
    }),
    Revision.countDocuments({
      userId,
      completed: false,
      dueDate: { $lt: todayStart },
    }),
    Problem.countDocuments({
      userId,
      createdAt: { $gte: todayStart, $lt: tomorrowStart },
    }),
    buildTodaysQueue(userId),
  ]);

  const revisionQueue: DashboardQueueItem[] = reviewItemsFromQueue(todaysQueue);

  return {
    stats: {
      problemsAdded,
      pendingRevisions,
      pendingRevisionsNextDay,
      overdue,
      addedToday,
    },
    canAddProblem: pendingRevisionsNextDay <= PENDING_REVISION_LIMIT,
    revisionQueue,
    todaysQueue,
  };
}

export async function countPendingRevisionsDueNextDay(
  userId: string,
): Promise<number> {
  const tomorrowStart = startOfNextUtcDay();
  const dayAfterTomorrow = startOfNextUtcDay(tomorrowStart);
  return Revision.countDocuments({
    userId,
    completed: false,
    dueDate: { $gte: tomorrowStart, $lt: dayAfterTomorrow },
  });
}

export async function assertCanAddProblem(userId: string): Promise<void> {
  const pending = await countPendingRevisionsDueNextDay(userId);
  if (pending > PENDING_REVISION_LIMIT) {
    throw new AppError(
      `You have ${pending} revisions due tomorrow (limit ${PENDING_REVISION_LIMIT}). Complete some before adding new problems.`,
      403,
    );
  }
}
