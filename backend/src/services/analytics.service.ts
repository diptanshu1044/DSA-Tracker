import { Types } from "mongoose";
import { Problem } from "../models/Problem.js";
import { Revision } from "../models/Revision.js";
import type { AttemptType } from "../types/index.js";
import { startOfUtcDay } from "../utils/dates.js";

const DAYS_LOOKBACK = 30;
const WEEKS_LOOKBACK = 12;
const ATTEMPT_TYPES: AttemptType[] = ["SELF", "HINT", "VIDEO"];

export interface AnalyticsSummary {
  problemsAdded: number;
  solvedMyself: number;
  neededHelp: number;
  pendingRevisions: number;
}

export interface DayCount {
  date: string;
  count: number;
}

export interface AttemptTypeCount {
  attemptType: AttemptType;
  count: number;
}

export interface WeekCount {
  weekStart: string;
  count: number;
}

export interface AnalyticsData {
  summary: AnalyticsSummary;
  problemsByDay: DayCount[];
  attemptTypeBreakdown: AttemptTypeCount[];
  revisionsByWeek: WeekCount[];
}

function formatUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Monday 00:00 UTC of the week containing `date`. */
function startOfUtcWeek(date: Date = new Date()): Date {
  const result = startOfUtcDay(date);
  const day = result.getUTCDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;
  result.setUTCDate(result.getUTCDate() - daysFromMonday);
  return result;
}

function addUtcDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function fillDailySeries(
  from: Date,
  to: Date,
  counts: Map<string, number>,
): DayCount[] {
  const series: DayCount[] = [];
  for (let cursor = new Date(from); cursor <= to; cursor = addUtcDays(cursor, 1)) {
    const key = formatUtcDate(cursor);
    series.push({ date: key, count: counts.get(key) ?? 0 });
  }
  return series;
}

function fillWeeklySeries(
  from: Date,
  to: Date,
  counts: Map<string, number>,
): WeekCount[] {
  const series: WeekCount[] = [];
  for (
    let cursor = new Date(from);
    cursor <= to;
    cursor = addUtcDays(cursor, 7)
  ) {
    const key = formatUtcDate(cursor);
    series.push({ weekStart: key, count: counts.get(key) ?? 0 });
  }
  return series;
}

export async function getAnalytics(userId: string): Promise<AnalyticsData> {
  const uid = new Types.ObjectId(userId);
  const today = startOfUtcDay();
  const dayRangeStart = addUtcDays(today, -(DAYS_LOOKBACK - 1));
  const weekRangeEnd = startOfUtcWeek(today);
  const weekRangeStart = addUtcDays(weekRangeEnd, -(WEEKS_LOOKBACK - 1) * 7);

  const [
    summaryRows,
    problemsByDayRows,
    attemptTypeRows,
    revisionsByWeekRows,
    pendingRows,
  ] = await Promise.all([
    Problem.aggregate<{
      problemsAdded: number;
      solvedMyself: number;
      neededHelp: number;
    }>([
      { $match: { userId: uid } },
      {
        $group: {
          _id: null,
          problemsAdded: { $sum: 1 },
          solvedMyself: {
            $sum: { $cond: [{ $eq: ["$attemptType", "SELF"] }, 1, 0] },
          },
          neededHelp: {
            $sum: {
              $cond: [{ $in: ["$attemptType", ["HINT", "VIDEO"]] }, 1, 0],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          problemsAdded: 1,
          solvedMyself: 1,
          neededHelp: 1,
        },
      },
    ]),

    Problem.aggregate<{ _id: string; count: number }>([
      {
        $match: {
          userId: uid,
          createdAt: { $gte: dayRangeStart },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    Problem.aggregate<{ _id: AttemptType; count: number }>([
      { $match: { userId: uid } },
      {
        $group: {
          _id: "$attemptType",
          count: { $sum: 1 },
        },
      },
    ]),

    Revision.aggregate<{ _id: string; count: number }>([
      {
        $match: {
          userId: uid,
          completed: true,
          completedAt: { $gte: weekRangeStart },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: {
                $dateTrunc: {
                  date: "$completedAt",
                  unit: "week",
                  startOfWeek: "monday",
                },
              },
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    Revision.aggregate<{ count: number }>([
      { $match: { userId: uid, completed: false } },
      { $count: "count" },
    ]),
  ]);

  const summaryRow = summaryRows[0];
  const summary: AnalyticsSummary = {
    problemsAdded: summaryRow?.problemsAdded ?? 0,
    solvedMyself: summaryRow?.solvedMyself ?? 0,
    neededHelp: summaryRow?.neededHelp ?? 0,
    pendingRevisions: pendingRows[0]?.count ?? 0,
  };

  const dayCounts = new Map(
    problemsByDayRows.map((row) => [row._id, row.count]),
  );
  const problemsByDay = fillDailySeries(dayRangeStart, today, dayCounts);

  const attemptCounts = new Map(
    attemptTypeRows.map((row) => [row._id, row.count]),
  );
  const attemptTypeBreakdown: AttemptTypeCount[] = ATTEMPT_TYPES.map(
    (attemptType) => ({
      attemptType,
      count: attemptCounts.get(attemptType) ?? 0,
    }),
  );

  const weekCounts = new Map(
    revisionsByWeekRows.map((row) => [row._id, row.count]),
  );
  const revisionsByWeek = fillWeeklySeries(
    weekRangeStart,
    weekRangeEnd,
    weekCounts,
  );

  return {
    summary,
    problemsByDay,
    attemptTypeBreakdown,
    revisionsByWeek,
  };
}
