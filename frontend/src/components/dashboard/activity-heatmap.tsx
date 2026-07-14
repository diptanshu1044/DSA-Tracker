"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BookPlus,
  CalendarCheck2,
  Flame,
  ListChecks,
  Percent,
  Trophy,
} from "lucide-react";
import {
  ActivityDayDetailSheet,
  EmptyActivityState,
} from "@/components/dashboard/activity-day-detail";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/api";
import { activityApi } from "@/services/activity.service";
import type { ActivityDay, ActivityStats } from "@/types/api";

const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""] as const;
const MONTH_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: "short",
  timeZone: "UTC",
});

function intensityLevel(total: number): 0 | 1 | 2 | 3 | 4 {
  if (total <= 0) return 0;
  if (total <= 2) return 1;
  if (total <= 5) return 2;
  if (total <= 9) return 3;
  return 4;
}

const INTENSITY_CLASS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: "bg-muted hover:ring-muted-foreground/30",
  1: "bg-primary/20 hover:ring-primary/40",
  2: "bg-primary/40 hover:ring-primary/50",
  3: "bg-primary/65 hover:ring-primary/60",
  4: "bg-primary hover:ring-primary/70",
};

function formatTooltipDate(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function buildTooltip(day: ActivityDay): string {
  const heading = formatTooltipDate(day.date);
  if (day.totalActivity <= 0) {
    return `${heading}\nNo activity recorded.`;
  }
  return [
    heading,
    `Added Problems: ${day.problemsAdded}`,
    `Completed Reviews: ${day.reviewsCompleted}`,
    `Total Activity: ${day.totalActivity}`,
  ].join("\n");
}

function groupIntoWeeks(days: ActivityDay[]): ActivityDay[][] {
  const weeks: ActivityDay[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

function monthLabels(weeks: ActivityDay[][]): Array<{
  weekIndex: number;
  label: string;
}> {
  const labels: Array<{ weekIndex: number; label: string }> = [];
  let previousMonth = -1;
  weeks.forEach((week, weekIndex) => {
    const firstDay = week[0];
    if (!firstDay) return;
    const month = new Date(`${firstDay.date}T00:00:00.000Z`).getUTCMonth();
    if (month !== previousMonth) {
      labels.push({
        weekIndex,
        label: MONTH_FORMATTER.format(new Date(`${firstDay.date}T00:00:00.000Z`)),
      });
      previousMonth = month;
    }
  });
  return labels;
}

function formatDays(value: number): string {
  return value === 1 ? "1 day" : `${value} days`;
}

interface ActivityStatsRowProps {
  stats: ActivityStats;
}

function ActivityStatsRow({ stats }: ActivityStatsRowProps) {
  const items = [
    {
      key: "currentStreak",
      label: "Current Streak",
      value: formatDays(stats.currentStreak),
      icon: Flame,
    },
    {
      key: "longestStreak",
      label: "Longest Streak",
      value: formatDays(stats.longestStreak),
      icon: Trophy,
    },
    {
      key: "activeDays",
      label: "Active Days",
      value: `${stats.activeDays}`,
      icon: CalendarCheck2,
    },
    {
      key: "problemsAdded",
      label: "Problems Added",
      value: `${stats.problemsAdded}`,
      icon: BookPlus,
    },
    {
      key: "reviewsCompleted",
      label: "Reviews Completed",
      value: `${stats.reviewsCompleted}`,
      icon: ListChecks,
    },
    {
      key: "thisYearActivity",
      label: "This Year's Activity",
      value: `${stats.thisYearActivity}`,
      icon: Percent,
    },
  ] as const;

  return (
    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.key}
            className="bg-muted/40 flex items-start gap-2.5 rounded-lg px-3 py-2.5"
          >
            <div className="bg-background text-muted-foreground mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md">
              <Icon className="size-3.5" />
            </div>
            <div className="min-w-0">
              <dt className="text-muted-foreground truncate text-xs">
                {item.label}
              </dt>
              <dd className="text-sm font-medium tracking-tight">{item.value}</dd>
            </div>
          </div>
        );
      })}
    </dl>
  );
}

interface HeatmapGridProps {
  days: ActivityDay[];
  onSelectDay: (date: string) => void;
}

function HeatmapGrid({ days, onSelectDay }: HeatmapGridProps) {
  const weeks = useMemo(() => groupIntoWeeks(days), [days]);
  const labels = useMemo(() => monthLabels(weeks), [weeks]);
  const [hovered, setHovered] = useState<ActivityDay | null>(null);

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto pb-1">
        <div className="inline-block min-w-full">
          <div
            className="mb-1 grid gap-1"
            style={{
              gridTemplateColumns: `28px repeat(${weeks.length}, 11px)`,
            }}
          >
            <div />
            {weeks.map((_, weekIndex) => {
              const label = labels.find((entry) => entry.weekIndex === weekIndex);
              return (
                <div
                  key={`month-${weekIndex}`}
                  className="text-muted-foreground h-4 text-[10px] leading-none"
                >
                  {label?.label ?? ""}
                </div>
              );
            })}
          </div>

          <div className="flex gap-1">
            <div className="flex w-7 flex-col gap-1" aria-hidden>
              {DAY_LABELS.map((label, index) => (
                <div
                  key={`day-label-${index}`}
                  className="text-muted-foreground flex h-[11px] items-center text-[10px] leading-none"
                >
                  {label}
                </div>
              ))}
            </div>

            <div className="flex gap-1" role="grid" aria-label="Activity calendar">
              {weeks.map((week, weekIndex) => (
                <div
                  key={`week-${weekIndex}`}
                  className="flex flex-col gap-1"
                  role="row"
                >
                  {Array.from({ length: 7 }).map((_, dayIndex) => {
                    const day = week[dayIndex];
                    if (!day) {
                      return (
                        <div
                          key={`empty-${weekIndex}-${dayIndex}`}
                          className="size-[11px]"
                          role="gridcell"
                        />
                      );
                    }

                    const level = intensityLevel(day.totalActivity);
                    const tooltip = buildTooltip(day);
                    const isHovered = hovered?.date === day.date;

                    return (
                      <button
                        key={day.date}
                        type="button"
                        role="gridcell"
                        title={tooltip}
                        aria-label={tooltip.replaceAll("\n", ". ")}
                        onMouseEnter={() => setHovered(day)}
                        onMouseLeave={() => setHovered(null)}
                        onFocus={() => setHovered(day)}
                        onBlur={() => setHovered(null)}
                        onClick={() => onSelectDay(day.date)}
                        className={cn(
                          "size-[11px] rounded-[2px] transition-[transform,box-shadow] duration-150 ease-out",
                          "ring-offset-background focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none",
                          "hover:scale-125 hover:ring-2",
                          INTENSITY_CLASS[level],
                          isHovered && "scale-125 ring-2",
                        )}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="status"
          aria-live="polite"
          className="bg-muted/50 text-muted-foreground min-h-10 rounded-lg px-3 py-2 text-xs whitespace-pre-line sm:max-w-md"
        >
          {hovered
            ? buildTooltip(hovered)
            : "Hover a day for details. Click to open everything completed that day."}
        </div>

        <div className="text-muted-foreground flex items-center gap-1.5 text-[10px]">
          <span>Less</span>
          {([0, 1, 2, 3, 4] as const).map((level) => (
            <span
              key={level}
              className={cn(
                "size-[11px] rounded-[2px]",
                INTENSITY_CLASS[level].split(" ")[0],
              )}
              aria-hidden
            />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
}

interface ActivityHeatmapSectionProps {
  canAddProblem: boolean;
}

export function ActivityHeatmapSection({
  canAddProblem,
}: ActivityHeatmapSectionProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["activity", "heatmap"],
    queryFn: async () => {
      const result = await activityApi.getHeatmap();
      return result.activity;
    },
  });

  const openDay = (date: string) => {
    setSelectedDate(date);
    setSheetOpen(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-full rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-28 w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity Heatmap</CardTitle>
          <CardDescription>
            {error instanceof ApiError
              ? error.message
              : "Could not load your activity heatmap."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" variant="outline" onClick={() => void refetch()}>
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Activity Heatmap</CardTitle>
          <CardDescription>
            {data.hasActivity
              ? `${data.stats.activeDaysPercent}% of days active in the last year. Keep the streak going.`
              : "Build a daily habit by solving problems and completing reviews."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {!data.hasActivity ? (
            <>
              <HeatmapGrid days={data.days} onSelectDay={openDay} />
              <EmptyActivityState canAddProblem={canAddProblem} />
            </>
          ) : (
            <>
              <div className="space-y-1">
                <p className="text-sm font-medium">Activity</p>
                <ActivityStatsRow stats={data.stats} />
              </div>
              <HeatmapGrid days={data.days} onSelectDay={openDay} />
            </>
          )}
        </CardContent>
      </Card>

      <ActivityDayDetailSheet
        date={selectedDate}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </>
  );
}
