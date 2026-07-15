"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  formatUtcDateKey,
  isUtcDateKey,
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
  const [from, setFrom] = useState(
    value.mode === "range" ? value.from : value.mode === "day" ? value.date : "",
  );
  const [to, setTo] = useState(
    value.mode === "range" ? value.to : value.mode === "day" ? value.date : "",
  );

  useEffect(() => {
    if (value.mode === "range") {
      setFrom(value.from);
      setTo(value.to);
      return;
    }
    if (value.mode === "day") {
      setFrom(value.date);
      setTo(value.date);
      return;
    }
    setFrom("");
    setTo("");
  }, [value]);

  function commitRange(nextFrom: string, nextTo: string) {
    if (!isUtcDateKey(nextFrom) || !isUtcDateKey(nextTo)) return;
    const start = nextFrom <= nextTo ? nextFrom : nextTo;
    const end = nextFrom <= nextTo ? nextTo : nextFrom;
    if (start === end) {
      onChange({ mode: "day", date: start });
      return;
    }
    onChange({ mode: "range", from: start, to: end });
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Filter by solved date"
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
              onClick={() => onChange({ mode: "days", days })}
            >
              Last {days}d
            </Button>
          );
        })}
        {value.mode !== "all" ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onChange({ mode: "all" })}
          >
            <X className="size-3.5" />
            Clear
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="date"
          max={today}
          value={from}
          onChange={(event) => {
            const nextFrom = event.target.value;
            setFrom(nextFrom);
            if (isUtcDateKey(nextFrom) && isUtcDateKey(to)) {
              commitRange(nextFrom, to);
            }
          }}
          aria-label="From date"
          className="h-7 w-auto min-w-[9.5rem] text-[0.8rem]"
        />
        <span className="text-muted-foreground text-xs">to</span>
        <Input
          type="date"
          max={today}
          value={to}
          onChange={(event) => {
            const nextTo = event.target.value;
            setTo(nextTo);
            if (isUtcDateKey(from) && isUtcDateKey(nextTo)) {
              commitRange(from, nextTo);
            }
          }}
          aria-label="To date"
          className="h-7 w-auto min-w-[9.5rem] text-[0.8rem]"
        />
      </div>
    </div>
  );
}
