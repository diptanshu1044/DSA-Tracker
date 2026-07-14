/** UTC midnight for the given (or current) instant. */
export function startOfUtcDay(date: Date = new Date()): Date {
  const result = new Date(date);
  result.setUTCHours(0, 0, 0, 0);
  return result;
}

/** UTC midnight of the next calendar day. */
export function startOfNextUtcDay(date: Date = new Date()): Date {
  const result = startOfUtcDay(date);
  result.setUTCDate(result.getUTCDate() + 1);
  return result;
}

/**
 * Inclusive upper bound for "due today or earlier".
 * Matches dashboard filter `dueDate < tomorrowStart` when used with `$lte`.
 */
export function dueBeforeEndOfTodayUtc(): string {
  return new Date(startOfNextUtcDay().getTime() - 1).toISOString();
}

export function isOverdue(dueDate: string, now: Date = new Date()): boolean {
  const date = new Date(dueDate);
  if (Number.isNaN(date.getTime())) {
    return false;
  }
  return date < startOfUtcDay(now);
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function daysOverdueCount(
  dueDate: string,
  now: Date = new Date(),
): number {
  const date = new Date(dueDate);
  if (Number.isNaN(date.getTime())) {
    return 1;
  }
  return Math.max(
    1,
    Math.ceil((startOfUtcDay(now).getTime() - date.getTime()) / MS_PER_DAY),
  );
}

export function formatDueLabel(dueDate: string, overdue: boolean): string {
  const date = new Date(dueDate);
  if (Number.isNaN(date.getTime())) {
    return "Unknown due date";
  }

  if (overdue) {
    const days = daysOverdueCount(dueDate);
    return days === 1 ? "1 day overdue" : `${days} days overdue`;
  }

  return "Due today";
}

export function formatDaysOverdue(days: number): string {
  return days === 1 ? "1 day overdue" : `${days} days overdue`;
}

export function formatAddedLabel(
  createdAt: string,
  addedToday: boolean,
): string {
  if (addedToday) {
    return "Added Today";
  }

  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return "Recently added";
  }

  const days = Math.max(
    1,
    Math.ceil(
      (startOfUtcDay().getTime() - startOfUtcDay(date).getTime()) / MS_PER_DAY,
    ),
  );

  if (days === 1) {
    return "Added yesterday";
  }
  return `Added ${days} days ago`;
}

export function formatShortDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
