export function startOfUtcDay(date: Date = new Date()): Date {
  const result = new Date(date);
  result.setUTCHours(0, 0, 0, 0);
  return result;
}

export function startOfNextUtcDay(date: Date = new Date()): Date {
  const result = startOfUtcDay(date);
  result.setUTCDate(result.getUTCDate() + 1);
  return result;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Whole UTC calendar days that `dueDate` is past `todayStart` (min 1). */
export function daysOverdue(dueDate: Date, todayStart: Date = startOfUtcDay()): number {
  return Math.max(1, Math.ceil((todayStart.getTime() - dueDate.getTime()) / MS_PER_DAY));
}
