/** Parse durations like `15m`, `7d`, `1h`, `30s` into milliseconds. */
export function parseDurationMs(value: string, fallbackMs: number): number {
  const match = /^(\d+)\s*([smhd])$/i.exec(value.trim());
  if (!match?.[1] || !match[2]) {
    return fallbackMs;
  }

  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) {
    return fallbackMs;
  }

  const unit = match[2].toLowerCase();
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  const multiplier = multipliers[unit];
  if (!multiplier) {
    return fallbackMs;
  }

  return amount * multiplier;
}
