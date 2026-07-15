"use client";

import { useEffect, useState } from "react";
import { CalendarRange, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  formatUtcDateKey,
  isUtcDateKey,
  lastUtcDaysRange,
  toUtcDateKey,
} from "@/lib/dates";

export type DateFilterValue =
  | { mode: "all" }
  | { mode: "days"; days: number }
  | { mode: "day"; date: string }
  | { mode: "range"; from: string; to: string };

const DAY_PRESETS = [7, 30, 90] as const;

function parseDaysParam(value: string | null): number | null {
  if (!value) return null;
  const days = Number(value);
  if (!Number.isInteger(days) || days < 1 || days > 365) return null;
  return days;
}

export function dateFilterFromSearchParams(params: {
  days: string | null;
  createdAfter: string | null;
  createdBefore: string | null;
}): DateFilterValue {
  const days = parseDaysParam(params.days);
  if (days != null) {
    return { mode: "days", days };
  }

  const from = isUtcDateKey(params.createdAfter) ? params.createdAfter : null;
  const to = isUtcDateKey(params.createdBefore) ? params.createdBefore : null;

  if (from && to) {
    if (from === to) {
      return { mode: "day", date: from };
    }
    return { mode: "range", from, to };
  }

  if (from) {
    return { mode: "day", date: from };
  }

  if (to) {
    return { mode: "day", date: to };
  }

  return { mode: "all" };
}

export function applyDateFilterToParams(
  params: URLSearchParams,
  filter: DateFilterValue,
): void {
  params.delete("days");
  params.delete("createdAfter");
  params.delete("createdBefore");

  if (filter.mode === "days") {
    params.set("days", String(filter.days));
    return;
  }

  if (filter.mode === "day") {
    params.set("createdAfter", filter.date);
    params.set("createdBefore", filter.date);
    return;
  }

  if (filter.mode === "range") {
    params.set("createdAfter", filter.from);
    params.set("createdBefore", filter.to);
  }
}

export function dateFilterLabel(filter: DateFilterValue): string | null {
  if (filter.mode === "all") return null;
  if (filter.mode === "days") {
    return `Last ${filter.days} day${filter.days === 1 ? "" : "s"}`;
  }
  if (filter.mode === "day") {
    return formatUtcDateKey(filter.date);
  }
  return `${formatUtcDateKey(filter.from)} – ${formatUtcDateKey(filter.to)}`;
}

export function toListDateParams(filter: DateFilterValue): {
  days?: number;
  createdAfter?: string;
  createdBefore?: string;
} {
  if (filter.mode === "days") {
    return { days: filter.days };
  }
  if (filter.mode === "day") {
    return { createdAfter: filter.date, createdBefore: filter.date };
  }
  if (filter.mode === "range") {
    return { createdAfter: filter.from, createdBefore: filter.to };
  }
  return {};
}

interface ProblemsDateFilterProps {
  value: DateFilterValue;
  onChange: (next: DateFilterValue) => void;
}

export function ProblemsDateFilter({
  value,
  onChange,
}: ProblemsDateFilterProps) {
  const today = toUtcDateKey();
  const [customFrom, setCustomFrom] = useState(
    value.mode === "range" ? value.from : value.mode === "day" ? value.date : "",
  );
  const [customTo, setCustomTo] = useState(
    value.mode === "range" ? value.to : value.mode === "day" ? value.date : "",
  );
  const [specificDate, setSpecificDate] = useState(
    value.mode === "day" ? value.date : "",
  );

  useEffect(() => {
    if (value.mode === "range") {
      setCustomFrom(value.from);
      setCustomTo(value.to);
      setSpecificDate("");
      return;
    }
    if (value.mode === "day") {
      setSpecificDate(value.date);
      setCustomFrom(value.date);
      setCustomTo(value.date);
      return;
    }
    if (value.mode === "all" || value.mode === "days") {
      setSpecificDate("");
    }
  }, [value]);

  function selectDays(days: number) {
    onChange({ mode: "days", days });
  }

  function applySpecificDate() {
    if (!isUtcDateKey(specificDate)) return;
    onChange({ mode: "day", date: specificDate });
  }

  function applyRange() {
    if (!isUtcDateKey(customFrom) || !isUtcDateKey(customTo)) return;
    const from = customFrom <= customTo ? customFrom : customTo;
    const to = customFrom <= customTo ? customTo : customFrom;
    if (from === to) {
      onChange({ mode: "day", date: from });
      return;
    }
    onChange({ mode: "range", from, to });
  }

  const activeLabel = dateFilterLabel(value);
  const presetRangeHint =
    value.mode === "days" ? lastUtcDaysRange(value.days) : null;

  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarRange className="text-muted-foreground size-4" />
          <p className="text-sm font-medium">Solved date</p>
        </div>
        {value.mode !== "all" ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onChange({ mode: "all" })}
          >
            <X className="size-3.5" />
            Clear date
          </Button>
        ) : null}
      </div>

      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Quick date ranges"
      >
        <Button
          type="button"
          size="sm"
          variant={value.mode === "all" ? "secondary" : "outline"}
          aria-pressed={value.mode === "all"}
          onClick={() => onChange({ mode: "all" })}
        >
          All time
        </Button>
        {DAY_PRESETS.map((days) => {
          const selected = value.mode === "days" && value.days === days;
          return (
            <Button
              key={days}
              type="button"
              size="sm"
              variant={selected ? "secondary" : "outline"}
              aria-pressed={selected}
              onClick={() => selectDays(days)}
            >
              Last {days} days
            </Button>
          );
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="problems-specific-date">Specific day</Label>
          <div className="flex gap-2">
            <Input
              id="problems-specific-date"
              type="date"
              max={today}
              value={specificDate}
              onChange={(event) => setSpecificDate(event.target.value)}
              aria-label="Filter by specific day"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!isUtcDateKey(specificDate)}
              onClick={applySpecificDate}
            >
              Apply
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Custom range</Label>
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-0 flex-1 space-y-1">
              <Label
                htmlFor="problems-range-from"
                className="text-muted-foreground text-xs font-normal"
              >
                From
              </Label>
              <Input
                id="problems-range-from"
                type="date"
                max={today}
                value={customFrom}
                onChange={(event) => setCustomFrom(event.target.value)}
              />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <Label
                htmlFor="problems-range-to"
                className="text-muted-foreground text-xs font-normal"
              >
                To
              </Label>
              <Input
                id="problems-range-to"
                type="date"
                max={today}
                value={customTo}
                onChange={(event) => setCustomTo(event.target.value)}
              />
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!isUtcDateKey(customFrom) || !isUtcDateKey(customTo)}
              onClick={applyRange}
            >
              Apply
            </Button>
          </div>
        </div>
      </div>

      {activeLabel ? (
        <p className="text-muted-foreground text-xs">
          Showing problems solved on {activeLabel}
          {presetRangeHint
            ? ` (${formatUtcDateKey(presetRangeHint.createdAfter)} – ${formatUtcDateKey(presetRangeHint.createdBefore)})`
            : null}
          .
        </p>
      ) : (
        <p className="text-muted-foreground text-xs">
          Pick a day on the calendar, choose last X days, or set a custom range.
        </p>
      )}
    </div>
  );
}
