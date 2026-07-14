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
