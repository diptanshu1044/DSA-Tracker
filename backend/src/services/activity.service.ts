import { Types } from "mongoose";
import {
  ACTIVITY_TYPES,
  HEATMAP_WEEKS,
  INTENSITY_ACTIVITY_TYPES,
} from "../constants/activity.js";
import { Problem } from "../models/Problem.js";
import { Revision } from "../models/Revision.js";
import { AppError } from "../utils/AppError.js";
import { startOfNextUtcDay, startOfUtcDay } from "../utils/dates.js";
import { parseObjectId } from "../utils/objectId.js";

export interface ActivityDay {
  date: string;
  problemsAdded: number;
  reviewsCompleted: number;
  totalActivity: number;
  /**
   * Extensible per-type counts. Intensity currently uses only
   * problemsAdded + reviewsCompleted; future types can land here
   * without changing the heatmap contract.
   */
  activities: Record<string, number>;
}

export interface ActivityStats {
  currentStreak: number;
  longestStreak: number;
  activeDays: number;
  activeDaysPercent: number;
  problemsAdded: number;
  reviewsCompleted: number;
  thisYearActivity: number;
  totalActivity: number;
}

export interface ActivityHeatmapData {
  rangeStart: string;
  rangeEnd: string;
  days: ActivityDay[];
  stats: ActivityStats;
  hasActivity: boolean;
}

export interface ActivityDayProblem {
  problemId: string;
  title: string;
}

export interface ActivityDayDetail {
  date: string;
  problemsAdded: ActivityDayProblem[];
  reviewsCompleted: ActivityDayProblem[];
  totalActivity: number;
}

interface CacheEntry<T> {
  expiresAt: number;
  value: T;
}

const HEATMAP_CACHE_TTL_MS = 60_000;
const heatmapCache = new Map<string, CacheEntry<ActivityHeatmapData>>();

function formatUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addUtcDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function daysBetween(from: Date, to: Date): number {
  const start = startOfUtcDay(from).getTime();
  const end = startOfUtcDay(to).getTime();
  return Math.max(0, Math.round((end - start) / (24 * 60 * 60 * 1000)));
}

/** Sunday 00:00 UTC of the week containing `date` (GitHub-style). */
function startOfUtcWeekSunday(date: Date = new Date()): Date {
  const result = startOfUtcDay(date);
  result.setUTCDate(result.getUTCDate() - result.getUTCDay());
  return result;
}

function emptyActivities(): Record<string, number> {
  return {
    [ACTIVITY_TYPES.PROBLEMS_ADDED]: 0,
    [ACTIVITY_TYPES.REVIEWS_COMPLETED]: 0,
  };
}

function buildDayFromActivities(
  date: string,
  activities: Record<string, number>,
): ActivityDay {
  const problemsAdded = activities[ACTIVITY_TYPES.PROBLEMS_ADDED] ?? 0;
  const reviewsCompleted = activities[ACTIVITY_TYPES.REVIEWS_COMPLETED] ?? 0;
  let totalActivity = 0;
  for (const type of INTENSITY_ACTIVITY_TYPES) {
    totalActivity += activities[type] ?? 0;
  }
  return {
    date,
    problemsAdded,
    reviewsCompleted,
    totalActivity,
    activities,
  };
}

function fillActivitySeries(
  from: Date,
  to: Date,
  byDate: Map<string, Record<string, number>>,
): ActivityDay[] {
  const series: ActivityDay[] = [];
  for (let cursor = new Date(from); cursor <= to; cursor = addUtcDays(cursor, 1)) {
    const key = formatUtcDate(cursor);
    series.push(
      buildDayFromActivities(key, byDate.get(key) ?? emptyActivities()),
    );
  }
  return series;
}

function computeStreaks(activityDays: Set<string>, today: Date): {
  currentStreak: number;
  longestStreak: number;
} {
  const sorted = [...activityDays].sort();
  if (sorted.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  let longestStreak = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = new Date(`${sorted[i - 1]}T00:00:00.000Z`);
    const curr = new Date(`${sorted[i]}T00:00:00.000Z`);
    if (daysBetween(prev, curr) === 1) {
      run += 1;
      longestStreak = Math.max(longestStreak, run);
    } else {
      run = 1;
    }
  }

  const todayKey = formatUtcDate(today);
  const yesterdayKey = formatUtcDate(addUtcDays(today, -1));
  let currentStreak = 0;
  if (activityDays.has(todayKey) || activityDays.has(yesterdayKey)) {
    let cursor = activityDays.has(todayKey) ? today : addUtcDays(today, -1);
    while (activityDays.has(formatUtcDate(cursor))) {
      currentStreak += 1;
      cursor = addUtcDays(cursor, -1);
    }
  }

  return { currentStreak, longestStreak };
}

function isValidDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && formatUtcDate(parsed) === value;
}

function getCachedHeatmap(userId: string): ActivityHeatmapData | null {
  const entry = heatmapCache.get(userId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    heatmapCache.delete(userId);
    return null;
  }
  return entry.value;
}

function setCachedHeatmap(userId: string, value: ActivityHeatmapData): void {
  heatmapCache.set(userId, {
    expiresAt: Date.now() + HEATMAP_CACHE_TTL_MS,
    value,
  });
}

function bumpActivity(
  byDate: Map<string, Record<string, number>>,
  date: string,
  type: string,
  count: number,
): void {
  const current = byDate.get(date) ?? emptyActivities();
  current[type] = (current[type] ?? 0) + count;
  byDate.set(date, current);
}

/** Call after problem create / revision complete so the heatmap stays fresh. */
export function invalidateActivityCache(userId: string): void {
  heatmapCache.delete(userId);
}

export async function getActivityHeatmap(
  userId: string,
): Promise<ActivityHeatmapData> {
  const cached = getCachedHeatmap(userId);
  if (cached) return cached;

  const uid = parseObjectId(userId, "userId");
  const today = startOfUtcDay();
  const rangeEnd = today;
  // Align start to Sunday so the grid matches GitHub's week columns.
  const rangeStart = startOfUtcWeekSunday(
    addUtcDays(startOfUtcWeekSunday(today), -(HEATMAP_WEEKS - 1) * 7),
  );
  const yearStart = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
  const rangeMatch = {
    $gte: rangeStart,
    $lt: startOfNextUtcDay(rangeEnd),
  };

  const [problemDays, reviewDays] = await Promise.all([
    Problem.aggregate<{ _id: string; count: number }>([
      { $match: { userId: uid, createdAt: rangeMatch } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
    ]),
    Revision.aggregate<{ _id: string; count: number }>([
      {
        $match: {
          userId: uid,
          completed: true,
          completedAt: rangeMatch,
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$completedAt" },
          },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const byDate = new Map<string, Record<string, number>>();
  for (const row of problemDays) {
    bumpActivity(byDate, row._id, ACTIVITY_TYPES.PROBLEMS_ADDED, row.count);
  }
  for (const row of reviewDays) {
    bumpActivity(
      byDate,
      row._id,
      ACTIVITY_TYPES.REVIEWS_COMPLETED,
      row.count,
    );
  }

  const days = fillActivitySeries(rangeStart, rangeEnd, byDate);

  const activeDayKeys = new Set<string>();
  let problemsAdded = 0;
  let reviewsCompleted = 0;
  let totalActivity = 0;
  let thisYearActivity = 0;
  const yearStartKey = formatUtcDate(yearStart);

  for (const day of days) {
    if (day.totalActivity > 0) {
      activeDayKeys.add(day.date);
    }
    problemsAdded += day.problemsAdded;
    reviewsCompleted += day.reviewsCompleted;
    totalActivity += day.totalActivity;
    if (day.date >= yearStartKey) {
      thisYearActivity += day.totalActivity;
    }
  }

  const { currentStreak, longestStreak } = computeStreaks(activeDayKeys, today);
  const daySpan = days.length || 1;
  const activeDays = activeDayKeys.size;

  const data: ActivityHeatmapData = {
    rangeStart: formatUtcDate(rangeStart),
    rangeEnd: formatUtcDate(rangeEnd),
    days,
    stats: {
      currentStreak,
      longestStreak,
      activeDays,
      activeDaysPercent: Math.round((activeDays / daySpan) * 100),
      problemsAdded,
      reviewsCompleted,
      thisYearActivity,
      totalActivity,
    },
    hasActivity: totalActivity > 0,
  };

  setCachedHeatmap(userId, data);
  return data;
}

export async function getActivityDayDetail(
  userId: string,
  date: string,
): Promise<ActivityDayDetail> {
  if (!isValidDateKey(date)) {
    throw new AppError("Invalid date. Expected YYYY-MM-DD.", 400);
  }

  const uid = parseObjectId(userId, "userId");
  const dayStart = new Date(`${date}T00:00:00.000Z`);
  const dayEnd = startOfNextUtcDay(dayStart);
  const dayRange = { $gte: dayStart, $lt: dayEnd };

  const [addedProblems, completedReviews] = await Promise.all([
    Problem.find({ userId: uid, createdAt: dayRange })
      .select({ _id: 1, title: 1 })
      .sort({ title: 1 })
      .lean(),
    Revision.aggregate<{
      problemId: Types.ObjectId;
      title: string;
    }>([
      {
        $match: {
          userId: uid,
          completed: true,
          completedAt: dayRange,
        },
      },
      {
        $lookup: {
          from: "problems",
          localField: "problemId",
          foreignField: "_id",
          as: "problem",
        },
      },
      { $unwind: { path: "$problem", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$problemId",
          title: { $first: { $ifNull: ["$problem.title", "Unknown problem"] } },
        },
      },
      {
        $project: {
          _id: 0,
          problemId: "$_id",
          title: 1,
        },
      },
      { $sort: { title: 1 } },
    ]),
  ]);

  const problemsAdded: ActivityDayProblem[] = addedProblems.map((problem) => ({
    problemId: String(problem._id),
    title: problem.title,
  }));

  const reviewsCompleted: ActivityDayProblem[] = completedReviews.map(
    (row) => ({
      problemId: String(row.problemId),
      title: row.title,
    }),
  );

  // Intensity counts every completed review, even if the same problem appears twice.
  const reviewEventCount = await Revision.countDocuments({
    userId: uid,
    completed: true,
    completedAt: dayRange,
  });

  return {
    date,
    problemsAdded,
    reviewsCompleted,
    totalActivity: problemsAdded.length + reviewEventCount,
  };
}
