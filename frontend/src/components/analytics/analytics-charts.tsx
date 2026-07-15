"use client";

import type { ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { attemptTypeLabel } from "@/lib/revision";
import type {
  AnalyticsAttemptTypeCount,
  AnalyticsDayCount,
  AnalyticsTrends,
  AnalyticsWeekCount,
} from "@/types/api";

/** Keeps Recharts from expanding page height inside flex/grid parents. */
function ChartFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative h-72 w-full min-h-0 shrink-0">
      <div className="absolute inset-0">{children}</div>
    </div>
  );
}

const ATTEMPT_COLORS: Record<string, string> = {
  SELF: "var(--chart-1)",
  HINT: "var(--chart-2)",
  VIDEO: "var(--chart-3)",
};

function formatDayTick(date: string): string {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatWeekTick(weekStart: string): string {
  const parsed = new Date(`${weekStart}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return weekStart;
  }
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

interface AnalyticsChartsProps {
  problemsByDay: AnalyticsDayCount[];
  attemptTypeBreakdown: AnalyticsAttemptTypeCount[];
  revisionsByWeek: AnalyticsWeekCount[];
  trends: AnalyticsTrends;
}

export function AnalyticsCharts({
  problemsByDay,
  attemptTypeBreakdown,
  revisionsByWeek,
  trends,
}: AnalyticsChartsProps) {
  const pieData = attemptTypeBreakdown.map((item) => ({
    name: attemptTypeLabel(item.attemptType),
    attemptType: item.attemptType,
    value: item.count,
  }));
  const pieTotal = pieData.reduce((sum, item) => sum + item.value, 0);

  const trendSummary = [
    {
      label: "Reviews (7 days)",
      value: trends.reviewsLast7Days,
    },
    {
      label: "Reviews (30 days)",
      value: trends.reviewsLast30Days,
    },
    {
      label: "Mastered this month",
      value: trends.problemsMasteredThisMonth,
    },
    {
      label: "Added this month",
      value: trends.problemsAddedThisMonth,
    },
    {
      label: "Weekly consistency",
      value: `${trends.weeklyConsistency}%`,
    },
  ];

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">Trends</h2>
        <p className="text-muted-foreground text-sm">
          Recent learning activity and consistency over time.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {trendSummary.map((item) => (
          <Card key={item.label} size="sm">
            <CardHeader className="space-y-1">
              <CardDescription>{item.label}</CardDescription>
              <CardTitle className="text-2xl font-semibold tracking-tight">
                {item.value}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="sr-only" aria-live="polite">
        <h2>Analytics data summary</h2>
        <p>
          Attempt types:{" "}
          {pieData.map((item) => `${item.name} ${item.value}`).join(", ") ||
            "none"}
          . Problems added in the last 30 days:{" "}
          {problemsByDay.reduce((sum, day) => sum + day.count, 0)}. Revisions
          completed in the last 12 weeks:{" "}
          {revisionsByWeek.reduce((sum, week) => sum + week.count, 0)}.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Daily review activity</CardTitle>
            <CardDescription>Reviews completed — last 30 days (UTC)</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartFrame>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trends.reviewsByDay} margin={{ left: 0, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDayTick}
                    minTickGap={28}
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    allowDecimals={false}
                    width={32}
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    labelFormatter={(label) => formatDayTick(String(label))}
                    formatter={(value) => [Number(value ?? 0), "Reviews"]}
                  />
                  <Bar
                    dataKey="count"
                    fill="var(--chart-2)"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartFrame>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Problems added by day</CardTitle>
            <CardDescription>Last 30 days (UTC)</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartFrame>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={problemsByDay} margin={{ left: 0, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDayTick}
                    minTickGap={28}
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    allowDecimals={false}
                    width={32}
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    labelFormatter={(label) => formatDayTick(String(label))}
                    formatter={(value) => [Number(value ?? 0), "Problems"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="var(--chart-2)"
                    fill="var(--chart-1)"
                    fillOpacity={0.45}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartFrame>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attempt type mix</CardTitle>
            <CardDescription>SELF / HINT / VIDEO breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {pieTotal === 0 ? (
              <EmptyState
                title="No problems logged yet"
                description="Add problems to see attempt type breakdown."
                className="h-72 border-0 py-8"
              />
            ) : (
              <ChartFrame>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={88}
                      paddingAngle={2}
                    >
                      {pieData.map((entry) => (
                        <Cell
                          key={entry.attemptType}
                          fill={
                            ATTEMPT_COLORS[entry.attemptType] ?? "var(--chart-4)"
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [Number(value ?? 0), "Problems"]}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ChartFrame>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Weekly completed revisions</CardTitle>
            <CardDescription>
              Last 12 weeks (UTC, week starts Monday)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartFrame>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revisionsByWeek} margin={{ left: 0, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="weekStart"
                    tickFormatter={formatWeekTick}
                    minTickGap={24}
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    allowDecimals={false}
                    width={32}
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    labelFormatter={(label) =>
                      `Week of ${formatWeekTick(String(label))}`
                    }
                    formatter={(value) => [Number(value ?? 0), "Completed"]}
                  />
                  <Bar
                    dataKey="count"
                    fill="var(--chart-2)"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartFrame>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
