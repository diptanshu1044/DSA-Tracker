"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  lastUtcDaysRange,
  toUtcDateKey,
} from "@/lib/dates";
import { cn } from "@/lib/utils";
import { activityApi } from "@/services/activity.service";
import type { DateFilterValue } from "@/components/problems/problems-date-filter";

const WEEKDAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;

const MONTH_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

type CalendarCell =
  | { kind: "empty"; key: string }
  | { kind: "day"; key: string; date: string; day: number; count: number };

function utcMonthStart(year: number, monthIndex: number): Date {
  return new Date(Date.UTC(year, monthIndex, 1));
}

function shiftUtcMonth(year: number, monthIndex: number, delta: number): {
  year: number;
  monthIndex: number;
} {
  const date = new Date(Date.UTC(year, monthIndex + delta, 1));
  return { year: date.getUTCFullYear(), monthIndex: date.getUTCMonth() };
}

/** Monday-based weekday index (Mon=0 … Sun=6). */
function mondayIndex(date: Date): number {
  return (date.getUTCDay() + 6) % 7;
}

function buildMonthCells(
  year: number,
  monthIndex: number,
  counts: Map<string, number>,
): CalendarCell[] {
  const first = utcMonthStart(year, monthIndex);
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const leading = mondayIndex(first);
  const cells: CalendarCell[] = [];

  for (let i = 0; i < leading; i += 1) {
    cells.push({ kind: "empty", key: `pad-start-${i}` });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(Date.UTC(year, monthIndex, day))
      .toISOString()
      .slice(0, 10);
    cells.push({
      kind: "day",
      key: date,
      date,
      day,
      count: counts.get(date) ?? 0,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ kind: "empty", key: `pad-end-${cells.length}` });
  }

  return cells;
}

function isDateInFilter(date: string, filter: DateFilterValue): boolean {
  if (filter.mode === "day") return filter.date === date;
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
  const today = toUtcDateKey();
  const todayDate = new Date(`${today}T00:00:00.000Z`);
  const [{ year, monthIndex }, setCursor] = useState({
    year: todayDate.getUTCFullYear(),
    monthIndex: todayDate.getUTCMonth(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["activity", "heatmap"],
    queryFn: async () => {
      const result = await activityApi.getHeatmap();
      return result.activity;
    },
  });

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const day of data?.days ?? []) {
      if (day.problemsAdded > 0) {
        map.set(day.date, day.problemsAdded);
      }
    }
    return map;
  }, [data]);

  const cells = useMemo(
    () => buildMonthCells(year, monthIndex, counts),
    [year, monthIndex, counts],
  );

  const monthLabel = MONTH_FORMATTER.format(utcMonthStart(year, monthIndex));
  const canGoNext =
    year < todayDate.getUTCFullYear() ||
    (year === todayDate.getUTCFullYear() &&
      monthIndex < todayDate.getUTCMonth());

  if (isLoading) {
    return <Skeleton className="h-64 w-full max-w-sm rounded-xl" />;
  }

  return (
    <div className="w-full max-w-sm space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label="Previous month"
          onClick={() => setCursor((current) => shiftUtcMonth(current.year, current.monthIndex, -1))}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <p className="text-sm font-medium tracking-tight">{monthLabel}</p>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label="Next month"
          disabled={!canGoNext}
          onClick={() => setCursor((current) => shiftUtcMonth(current.year, current.monthIndex, 1))}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div
        className="grid grid-cols-7 gap-1"
        role="grid"
        aria-label={`Calendar for ${monthLabel}`}
      >
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="text-muted-foreground py-1 text-center text-[11px] font-medium"
          >
            {label}
          </div>
        ))}

        {cells.map((cell) => {
          if (cell.kind === "empty") {
            return <div key={cell.key} className="aspect-square" />;
          }

          const selected = isDateInFilter(cell.date, filter);
          const isToday = cell.date === today;
          const isFuture = cell.date > today;

          return (
            <button
              key={cell.key}
              type="button"
              role="gridcell"
              disabled={isFuture}
              aria-pressed={selected}
              aria-label={
                cell.count > 0
                  ? `${cell.date}, ${cell.count} solved`
                  : cell.date
              }
              title={
                cell.count > 0
                  ? `${cell.count} solved`
                  : undefined
              }
              onClick={() => onSelectDay(cell.date)}
              className={cn(
                "relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm transition-colors",
                "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
                "disabled:pointer-events-none disabled:opacity-30",
                selected
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted",
                !selected && isToday && "ring-border ring-1",
              )}
            >
              <span className="leading-none">{cell.day}</span>
              {cell.count > 0 ? (
                <span
                  className={cn(
                    "mt-0.5 text-[9px] leading-none",
                    selected
                      ? "text-primary-foreground/80"
                      : "text-muted-foreground",
                  )}
                >
                  {cell.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
