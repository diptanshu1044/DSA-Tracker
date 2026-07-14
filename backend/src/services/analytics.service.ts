import { Types } from "mongoose";
import { Problem } from "../models/Problem.js";
import { Revision } from "../models/Revision.js";
import { ReviewHistory } from "../models/ReviewHistory.js";
import type { AttemptType } from "../types/index.js";
import { startOfNextUtcDay, startOfUtcDay } from "../utils/dates.js";
import {
  loadClassifiedProblems,
  type ClassifiedProblem,
  type ProblemStatus,
} from "./problem-status.js";

const DAYS_LOOKBACK = 30;
const WEEKS_LOOKBACK = 12;
const ATTEMPT_TYPES: AttemptType[] = ["SELF", "HINT", "VIDEO"];

export interface AnalyticsSummary {
  problemsAdded: number;
  solvedMyself: number;
  neededHelp: number;
  pendingRevisions: number;
  /** Extended overall progress (additive; keeps legacy fields above). */
  problemsSolved: number;
  solvedWithoutHelp: number;
  solvedUsingHint: number;
  solvedUsingSolution: number;
  reviewsCompleted: number;
  currentStreak: number;
  longestStreak: number;
  totalStudyDays: number;
  averageSolveTime: number | null;
  averageReviewTime: number | null;
  reviewSuccessRate: number | null;
}

export interface ActionableStats {
  overdue: number;
  dueToday: number;
  learning: number;
  mastered: number;
  newProblems: number;
  scheduledReviews: number;
  forgotten: number;
  weakestTopic: string | null;
  strongestTopic: string | null;
}

export interface StatusBreakdown {
  mastered: number;
  learning: number;
  needReview: number;
  overdue: number;
  newProblems: number;
  forgotten: number;
}

export interface LearningMetrics {
  firstAttemptSuccessRate: number | null;
  averageReviewsBeforeMastery: number | null;
  averageDaysToMaster: number | null;
  problemsRequiringMultipleRetries: number;
  longestLearningStreak: number;
  fastestMasteredProblem: {
    problemId: string;
    title: string;
    daysToMaster: number;
  } | null;
  mostReviewedProblem: {
    problemId: string;
    title: string;
    reviewCount: number;
  } | null;
}

export interface TopicStat {
  topic: string;
  problemsAdded: number;
  learning: number;
  mastered: number;
  needReview: number;
  overdue: number;
  forgotten: number;
  newProblems: number;
  successRate: number | null;
  activeProblems: number;
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

export interface Trends {
  reviewsLast7Days: number;
  reviewsLast30Days: number;
  problemsMasteredThisMonth: number;
  problemsAddedThisMonth: number;
  reviewsByDay: DayCount[];
  weeklyConsistency: number;
}

export interface AnalyticsData {
  summary: AnalyticsSummary;
  actionable: ActionableStats;
  statusBreakdown: StatusBreakdown;
  learningMetrics: LearningMetrics;
  topicStats: TopicStat[];
  trends: Trends;
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

function daysBetween(from: Date, to: Date): number {
  const start = startOfUtcDay(from).getTime();
  const end = startOfUtcDay(to).getTime();
  return Math.max(0, Math.round((end - start) / (24 * 60 * 60 * 1000)));
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

function average(numbers: number[]): number | null {
  if (numbers.length === 0) return null;
  const sum = numbers.reduce((total, value) => total + value, 0);
  return Math.round((sum / numbers.length) * 10) / 10;
}

function percentage(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return Math.round((numerator / denominator) * 100);
}

function computeStreaks(activityDays: Set<string>, today: Date): {
  currentStreak: number;
  longestStreak: number;
  totalStudyDays: number;
} {
  const sorted = [...activityDays].sort();
  const totalStudyDays = sorted.length;
  if (totalStudyDays === 0) {
    return { currentStreak: 0, longestStreak: 0, totalStudyDays: 0 };
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

  return { currentStreak, longestStreak, totalStudyDays };
}

function countByStatus(
  problems: ClassifiedProblem[],
  status: ProblemStatus,
): number {
  return problems.filter((problem) => problem.status === status).length;
}

function buildTopicStats(problems: ClassifiedProblem[]): TopicStat[] {
  const byTopic = new Map<
    string,
    {
      problemsAdded: number;
      learning: number;
      mastered: number;
      needReview: number;
      overdue: number;
      forgotten: number;
      newProblems: number;
      successfulReviews: number;
      totalReviews: number;
    }
  >();

  for (const problem of problems) {
    const topics = problem.topics.length > 0 ? problem.topics : ["Untagged"];
    for (const topic of topics) {
      const row = byTopic.get(topic) ?? {
        problemsAdded: 0,
        learning: 0,
        mastered: 0,
        needReview: 0,
        overdue: 0,
        forgotten: 0,
        newProblems: 0,
        successfulReviews: 0,
        totalReviews: 0,
      };
      row.problemsAdded += 1;
      row.successfulReviews += problem.successfulReviewCount;
      row.totalReviews += problem.reviewCount;
      if (problem.status === "learning") row.learning += 1;
      if (problem.status === "mastered") row.mastered += 1;
      if (problem.status === "need_review") row.needReview += 1;
      if (problem.status === "overdue") row.overdue += 1;
      if (problem.status === "forgotten") row.forgotten += 1;
      if (problem.status === "new") row.newProblems += 1;
      byTopic.set(topic, row);
    }
  }

  const stats: TopicStat[] = [...byTopic.entries()].map(([topic, row]) => {
    const activeProblems =
      row.learning + row.needReview + row.overdue + row.forgotten + row.newProblems;
    return {
      topic,
      problemsAdded: row.problemsAdded,
      learning: row.learning,
      mastered: row.mastered,
      needReview: row.needReview,
      overdue: row.overdue,
      forgotten: row.forgotten,
      newProblems: row.newProblems,
      successRate: percentage(row.successfulReviews, row.totalReviews),
      activeProblems,
    };
  });

  stats.sort((a, b) => {
    if (b.activeProblems !== a.activeProblems) {
      return b.activeProblems - a.activeProblems;
    }
    return b.problemsAdded - a.problemsAdded;
  });

  return stats;
}

function pickTopicExtremes(topicStats: TopicStat[]): {
  weakestTopic: string | null;
  strongestTopic: string | null;
} {
  const eligible = topicStats.filter(
    (topic) =>
      topic.problemsAdded >= 2 &&
      topic.successRate != null &&
      topic.topic !== "Untagged",
  );
  if (eligible.length === 0) {
    const withProblems = topicStats.filter(
      (topic) => topic.problemsAdded >= 1 && topic.topic !== "Untagged",
    );
    if (withProblems.length === 0) {
      return { weakestTopic: null, strongestTopic: null };
    }
    const byMastery = [...withProblems].sort((a, b) => {
      const aRate = a.problemsAdded === 0 ? 0 : a.mastered / a.problemsAdded;
      const bRate = b.problemsAdded === 0 ? 0 : b.mastered / b.problemsAdded;
      return aRate - bRate;
    });
    return {
      weakestTopic: byMastery[0]?.topic ?? null,
      strongestTopic: byMastery[byMastery.length - 1]?.topic ?? null,
    };
  }

  const byRate = [...eligible].sort(
    (a, b) => (a.successRate ?? 0) - (b.successRate ?? 0),
  );
  return {
    weakestTopic: byRate[0]?.topic ?? null,
    strongestTopic: byRate[byRate.length - 1]?.topic ?? null,
  };
}

function buildLearningMetrics(
  problems: ClassifiedProblem[],
  perProblemSelfStreakMax: number,
): LearningMetrics {
  const firstAttemptSuccessRate = percentage(
    problems.filter((problem) => problem.attemptType === "SELF").length,
    problems.length,
  );

  const masteredWithReviews = problems.filter(
    (problem) =>
      problem.status === "mastered" &&
      problem.completedRevisionCount > 0 &&
      problem.lastCompletedRevisionAt,
  );

  const reviewsBeforeMastery = masteredWithReviews.map(
    (problem) => problem.completedRevisionCount,
  );
  const daysToMaster = masteredWithReviews.map((problem) =>
    daysBetween(problem.createdAt, problem.lastCompletedRevisionAt!),
  );

  let fastestMasteredProblem: LearningMetrics["fastestMasteredProblem"] = null;
  for (const problem of masteredWithReviews) {
    const days = daysBetween(problem.createdAt, problem.lastCompletedRevisionAt!);
    if (
      !fastestMasteredProblem ||
      days < fastestMasteredProblem.daysToMaster
    ) {
      fastestMasteredProblem = {
        problemId: problem.problemId,
        title: problem.title,
        daysToMaster: days,
      };
    }
  }

  let mostReviewedProblem: LearningMetrics["mostReviewedProblem"] = null;
  for (const problem of problems) {
    if (problem.reviewCount === 0) continue;
    if (
      !mostReviewedProblem ||
      problem.reviewCount > mostReviewedProblem.reviewCount
    ) {
      mostReviewedProblem = {
        problemId: problem.problemId,
        title: problem.title,
        reviewCount: problem.reviewCount,
      };
    }
  }

  return {
    firstAttemptSuccessRate,
    averageReviewsBeforeMastery: average(reviewsBeforeMastery),
    averageDaysToMaster: average(daysToMaster),
    problemsRequiringMultipleRetries: problems.filter(
      (problem) => problem.reviewCount >= 3,
    ).length,
    longestLearningStreak: perProblemSelfStreakMax,
    fastestMasteredProblem,
    mostReviewedProblem,
  };
}

export async function getAnalytics(userId: string): Promise<AnalyticsData> {
  const uid = new Types.ObjectId(userId);
  const today = startOfUtcDay();
  const tomorrow = startOfNextUtcDay(today);
  const dayRangeStart = addUtcDays(today, -(DAYS_LOOKBACK - 1));
  const weekRangeEnd = startOfUtcWeek(today);
  const weekRangeStart = addUtcDays(weekRangeEnd, -(WEEKS_LOOKBACK - 1) * 7);
  const monthStart = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1),
  );
  const last7Start = addUtcDays(today, -6);

  const [
    classified,
    problemFacet,
    revisionFacet,
    reviewFacet,
    activityDaysRaw,
    selfStreaks,
  ] = await Promise.all([
    loadClassifiedProblems(userId, today),

    Problem.aggregate<{
      summary: Array<{
        problemsAdded: number;
        solvedMyself: number;
        neededHelp: number;
        solvedUsingHint: number;
        solvedUsingSolution: number;
        avgSolveTime: number | null;
      }>;
      problemsByDay: Array<{ _id: string; count: number }>;
      attemptTypes: Array<{ _id: AttemptType; count: number }>;
      addedThisMonth: Array<{ count: number }>;
    }>([
      { $match: { userId: uid } },
      {
        $facet: {
          summary: [
            {
              $group: {
                _id: null,
                problemsAdded: { $sum: 1 },
                solvedMyself: {
                  $sum: { $cond: [{ $eq: ["$attemptType", "SELF"] }, 1, 0] },
                },
                neededHelp: {
                  $sum: {
                    $cond: [
                      { $in: ["$attemptType", ["HINT", "VIDEO"]] },
                      1,
                      0,
                    ],
                  },
                },
                solvedUsingHint: {
                  $sum: { $cond: [{ $eq: ["$attemptType", "HINT"] }, 1, 0] },
                },
                solvedUsingSolution: {
                  $sum: { $cond: [{ $eq: ["$attemptType", "VIDEO"] }, 1, 0] },
                },
                avgSolveTime: { $avg: "$timeTaken" },
              },
            },
          ],
          problemsByDay: [
            { $match: { createdAt: { $gte: dayRangeStart } } },
            {
              $group: {
                _id: {
                  $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
                },
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ],
          attemptTypes: [
            {
              $group: {
                _id: "$attemptType",
                count: { $sum: 1 },
              },
            },
          ],
          addedThisMonth: [
            { $match: { createdAt: { $gte: monthStart } } },
            { $count: "count" },
          ],
        },
      },
    ]),

    Revision.aggregate<{
      pending: Array<{ count: number }>;
      completed: Array<{ count: number }>;
      scheduled: Array<{ count: number }>;
      byWeek: Array<{ _id: string; count: number }>;
      completedAtDays: Array<{ _id: string; count: number }>;
      last7: Array<{ count: number }>;
      last30: Array<{ count: number }>;
    }>([
      { $match: { userId: uid } },
      {
        $facet: {
          pending: [{ $match: { completed: false } }, { $count: "count" }],
          completed: [{ $match: { completed: true } }, { $count: "count" }],
          scheduled: [
            {
              $match: {
                completed: false,
                dueDate: { $gte: tomorrow },
              },
            },
            { $count: "count" },
          ],
          byWeek: [
            {
              $match: {
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
          ],
          completedAtDays: [
            {
              $match: {
                completed: true,
                completedAt: { $gte: dayRangeStart },
              },
            },
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: "%Y-%m-%d",
                    date: "$completedAt",
                  },
                },
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ],
          last7: [
            {
              $match: {
                completed: true,
                completedAt: { $gte: last7Start },
              },
            },
            { $count: "count" },
          ],
          last30: [
            {
              $match: {
                completed: true,
                completedAt: { $gte: dayRangeStart },
              },
            },
            { $count: "count" },
          ],
        },
      },
    ]),

    ReviewHistory.aggregate<{
      reviewTimes: Array<{ avg: number | null; success: number; total: number }>;
    }>([
      { $match: { userId: uid } },
      {
        $facet: {
          reviewTimes: [
            { $match: { type: "REVIEW" } },
            {
              $group: {
                _id: null,
                avg: { $avg: "$timeTaken" },
                success: {
                  $sum: { $cond: [{ $eq: ["$result", "SELF"] }, 1, 0] },
                },
                total: { $sum: 1 },
              },
            },
          ],
        },
      },
    ]),

    Promise.all([
      Problem.aggregate<{ _id: string }>([
        { $match: { userId: uid } },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
          },
        },
      ]),
      Revision.aggregate<{ _id: string }>([
        {
          $match: {
            userId: uid,
            completed: true,
            completedAt: { $exists: true, $ne: null },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$completedAt" },
            },
          },
        },
      ]),
      ReviewHistory.aggregate<{ _id: string }>([
        { $match: { userId: uid } },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$completedAt" },
            },
          },
        },
      ]),
    ]),

    ReviewHistory.aggregate<{ problemId: Types.ObjectId; results: AttemptType[] }>([
      { $match: { userId: uid } },
      { $sort: { completedAt: 1 } },
      {
        $group: {
          _id: "$problemId",
          results: { $push: "$result" },
        },
      },
      {
        $project: {
          problemId: "$_id",
          results: 1,
          _id: 0,
        },
      },
    ]),
  ]);

  const problems = problemFacet[0];
  const revisions = revisionFacet[0];
  const reviews = reviewFacet[0];
  const summaryRow = problems?.summary[0];
  const reviewTimeRow = reviews?.reviewTimes[0];

  const activityDays = new Set<string>();
  const [problemDays, revisionDays, historyDays] = activityDaysRaw;
  for (const row of problemDays) activityDays.add(row._id);
  for (const row of revisionDays) activityDays.add(row._id);
  for (const row of historyDays) activityDays.add(row._id);

  const streaks = computeStreaks(activityDays, today);

  let longestLearningStreak = 0;
  for (const row of selfStreaks) {
    let current = 0;
    for (const result of row.results) {
      if (result === "SELF") {
        current += 1;
        longestLearningStreak = Math.max(longestLearningStreak, current);
      } else {
        current = 0;
      }
    }
  }

  const topicStats = buildTopicStats(classified);
  const { weakestTopic, strongestTopic } = pickTopicExtremes(topicStats);

  const statusBreakdown: StatusBreakdown = {
    mastered: countByStatus(classified, "mastered"),
    learning: countByStatus(classified, "learning"),
    needReview: countByStatus(classified, "need_review"),
    overdue: countByStatus(classified, "overdue"),
    newProblems: countByStatus(classified, "new"),
    forgotten: countByStatus(classified, "forgotten"),
  };

  const problemsSolved = summaryRow?.problemsAdded ?? 0;
  const solvedWithoutHelp = summaryRow?.solvedMyself ?? 0;
  const solvedUsingHint = summaryRow?.solvedUsingHint ?? 0;
  const solvedUsingSolution = summaryRow?.solvedUsingSolution ?? 0;

  const summary: AnalyticsSummary = {
    problemsAdded: summaryRow?.problemsAdded ?? 0,
    solvedMyself: solvedWithoutHelp,
    neededHelp: summaryRow?.neededHelp ?? 0,
    pendingRevisions: revisions?.pending[0]?.count ?? 0,
    problemsSolved,
    solvedWithoutHelp,
    solvedUsingHint,
    solvedUsingSolution,
    reviewsCompleted: revisions?.completed[0]?.count ?? 0,
    currentStreak: streaks.currentStreak,
    longestStreak: streaks.longestStreak,
    totalStudyDays: streaks.totalStudyDays,
    averageSolveTime:
      summaryRow?.avgSolveTime != null
        ? Math.round(summaryRow.avgSolveTime * 10) / 10
        : null,
    averageReviewTime:
      reviewTimeRow?.avg != null
        ? Math.round(reviewTimeRow.avg * 10) / 10
        : null,
    reviewSuccessRate: percentage(
      reviewTimeRow?.success ?? 0,
      reviewTimeRow?.total ?? 0,
    ),
  };

  const actionable: ActionableStats = {
    overdue: statusBreakdown.overdue,
    dueToday: statusBreakdown.needReview,
    learning: statusBreakdown.learning,
    mastered: statusBreakdown.mastered,
    newProblems: statusBreakdown.newProblems,
    scheduledReviews: revisions?.scheduled[0]?.count ?? 0,
    forgotten: statusBreakdown.forgotten,
    weakestTopic,
    strongestTopic,
  };

  const reviewDayCounts = new Map(
    (revisions?.completedAtDays ?? []).map((row) => [row._id, row.count]),
  );
  const reviewsByDay = fillDailySeries(dayRangeStart, today, reviewDayCounts);
  const activeDaysLast30 = reviewsByDay.filter((day) => day.count > 0).length;

  const problemsMasteredThisMonth = classified.filter((problem) => {
    if (problem.status !== "mastered") return false;
    if (
      problem.lastCompletedRevisionAt != null &&
      problem.lastCompletedRevisionAt >= monthStart
    ) {
      return true;
    }
    return (
      problem.attemptType === "SELF" &&
      problem.createdAt >= monthStart &&
      problem.completedRevisionCount === 0
    );
  }).length;

  const dayCounts = new Map(
    (problems?.problemsByDay ?? []).map((row) => [row._id, row.count]),
  );
  const problemsByDay = fillDailySeries(dayRangeStart, today, dayCounts);

  const attemptCounts = new Map(
    (problems?.attemptTypes ?? []).map((row) => [row._id, row.count]),
  );
  const attemptTypeBreakdown: AttemptTypeCount[] = ATTEMPT_TYPES.map(
    (attemptType) => ({
      attemptType,
      count: attemptCounts.get(attemptType) ?? 0,
    }),
  );

  const weekCounts = new Map(
    (revisions?.byWeek ?? []).map((row) => [row._id, row.count]),
  );
  const revisionsByWeek = fillWeeklySeries(
    weekRangeStart,
    weekRangeEnd,
    weekCounts,
  );

  return {
    summary,
    actionable,
    statusBreakdown,
    learningMetrics: buildLearningMetrics(classified, longestLearningStreak),
    topicStats,
    trends: {
      reviewsLast7Days: revisions?.last7[0]?.count ?? 0,
      reviewsLast30Days: revisions?.last30[0]?.count ?? 0,
      problemsMasteredThisMonth,
      problemsAddedThisMonth: problems?.addedThisMonth[0]?.count ?? 0,
      reviewsByDay,
      weeklyConsistency: percentage(activeDaysLast30, DAYS_LOOKBACK) ?? 0,
    },
    problemsByDay,
    attemptTypeBreakdown,
    revisionsByWeek,
  };
}
