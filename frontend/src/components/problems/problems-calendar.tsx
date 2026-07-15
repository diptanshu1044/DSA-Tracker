"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api";
import { lastUtcDaysRange } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { activityApi } from "@/services/activity.service";
import type { ActivityDay } from "@/types/api";
import type { DateFilterValue } from "@/components/problems/problems-date-filter";

const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""] as const;
const MONTH_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: "short",
  timeZone: "UTC",
});

function intensityLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (count <= 1) return 1;
  if (count <= 3) return 2;
  if (count <= 6) return 3;
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
        label: MONTH_FORMATTER.format(
          new Date(`${firstDay.date}T00:00:00.000Z`),
        ),
      });
      previousMonth = month;
    }
  });
  return labels;
}

function isDateSelected(date: string, filter: DateFilterValue): boolean {
  if (filter.mode === "day") {
    return filter.date === date;
  }
  if (filter.mode === "range") {
    return date >= filter.from && date <= filter.to;
  }
  if (filter.mode === "days") {
    const range = lastUtcDaysRange(filter.days);
    return date >= range.createdAfter && date <= range.createdBefore;
  }
  return false;
}

interface ProblemsCalendarProps {
  filter: DateFilterValue;
  onSelectDay: (date: string) => void;
}

export function ProblemsCalendar({
  filter,
  onSelectDay,
}: ProblemsCalendarProps) {
  const [hovered, setHovered] = useState<ActivityDay | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["activity", "heatmap"],
    queryFn: async () => {
      const result = await activityApi.getHeatmap();
      return result.activity;
    },
  });

  const weeks = useMemo(
    () => (data ? groupIntoWeeks(data.days) : []),
    [data],
  );
  const labels = useMemo(() => monthLabels(weeks), [weeks]);

  const problemsAddedTotal = data?.stats.problemsAdded ?? 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-28 w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Solved calendar</CardTitle>
          <CardDescription>
            {error instanceof ApiError
              ? error.message
              : "Could not load your solved calendar."}
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
    <Card>
      <CardHeader>
        <CardTitle>Solved calendar</CardTitle>
        <CardDescription>
          {problemsAddedTotal > 0
            ? `${problemsAddedTotal} problem${problemsAddedTotal === 1 ? "" : "s"} logged in the last year. Click a day to filter.`
            : "Days you log problems light up here. Click any day to filter the list."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
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
                const label = labels.find(
                  (entry) => entry.weekIndex === weekIndex,
                );
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

              <div
                className="flex gap-1"
                role="grid"
                aria-label="Problems solved calendar"
              >
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

                      const level = intensityLevel(day.problemsAdded);
                      const selected = isDateSelected(day.date, filter);
                      const heading = formatTooltipDate(day.date);
                      const tooltip =
                        day.problemsAdded > 0
                          ? `${heading}\n${day.problemsAdded} problem${day.problemsAdded === 1 ? "" : "s"} solved`
                          : `${heading}\nNo problems solved`;

                      return (
                        <button
                          key={day.date}
                          type="button"
                          role="gridcell"
                          title={tooltip}
                          aria-label={tooltip.replaceAll("\n", ". ")}
                          aria-pressed={selected}
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
                            selected && "scale-125 ring-2 ring-foreground",
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
              ? hovered.problemsAdded > 0
                ? `${formatTooltipDate(hovered.date)}\n${hovered.problemsAdded} problem${hovered.problemsAdded === 1 ? "" : "s"} solved`
                : `${formatTooltipDate(hovered.date)}\nNo problems solved`
              : "Hover a day for details. Click to filter the list to that date."}
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
      </CardContent>
    </Card>
  );
}
