import { Problem } from "../models/Problem.js";
import { Revision } from "../models/Revision.js";
import { PENDING_REVISION_LIMIT } from "../constants/limits.js";
import { AppError } from "../utils/AppError.js";
import { startOfNextUtcDay, startOfUtcDay } from "../utils/dates.js";

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
  overdue: number;
  addedToday: number;
}

export interface DashboardData {
  stats: DashboardStats;
  canAddProblem: boolean;
  revisionQueue: DashboardQueueItem[];
}

export async function getDashboard(userId: string): Promise<DashboardData> {
  const todayStart = startOfUtcDay();
  const tomorrowStart = startOfNextUtcDay();

  const [
    problemsAdded,
    pendingRevisions,
    overdue,
    addedToday,
    queueDocs,
  ] = await Promise.all([
    Problem.countDocuments({ userId }),
    Revision.countDocuments({ userId, completed: false }),
    Revision.countDocuments({
      userId,
      completed: false,
      dueDate: { $lt: todayStart },
    }),
    Problem.countDocuments({
      userId,
      createdAt: { $gte: todayStart, $lt: tomorrowStart },
    }),
    Revision.find({
      userId,
      completed: false,
      dueDate: { $lt: tomorrowStart },
    })
      .sort({ dueDate: 1, revisionNumber: 1 })
      .limit(50)
      .populate("problemId", "title url attemptType")
      .lean(),
  ]);

  const revisionQueue: DashboardQueueItem[] = queueDocs.map((doc) => {
    const populated = toProblemSummary(doc.problemId);
    const dueDate = doc.dueDate;
    const overdueItem = dueDate < todayStart;

    return {
      _id: String(doc._id),
      dueDate,
      revisionNumber: doc.revisionNumber,
      completed: doc.completed,
      overdue: overdueItem,
      problem: populated,
    };
  });

  return {
    stats: {
      problemsAdded,
      pendingRevisions,
      overdue,
      addedToday,
    },
    canAddProblem: pendingRevisions <= PENDING_REVISION_LIMIT,
    revisionQueue,
  };
}

export async function countPendingRevisions(userId: string): Promise<number> {
  return Revision.countDocuments({ userId, completed: false });
}

export async function assertCanAddProblem(userId: string): Promise<void> {
  const pending = await countPendingRevisions(userId);
  if (pending > PENDING_REVISION_LIMIT) {
    throw new AppError(
      `You have ${pending} pending revisions (limit ${PENDING_REVISION_LIMIT}). Complete some before adding new problems.`,
      403,
    );
  }
}

function toProblemSummary(value: unknown): DashboardProblemSummary | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (
    typeof record.title !== "string" ||
    typeof record.url !== "string" ||
    typeof record.attemptType !== "string" ||
    record._id == null
  ) {
    return null;
  }

  return {
    _id: String(record._id),
    title: record.title,
    url: record.url,
    attemptType: record.attemptType,
  };
}
