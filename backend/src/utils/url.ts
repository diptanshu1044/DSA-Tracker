/**
 * Normalize problem URLs for consistent duplicate detection.
 * - trim whitespace
 * - lowercase protocol + host
 * - drop trailing slash (except bare origin)
 * - drop hash fragments
 */
export function normalizeProblemUrl(raw: string): string {
  const trimmed = raw.trim();

  try {
    const parsed = new URL(trimmed);
    parsed.hash = "";
    parsed.protocol = parsed.protocol.toLowerCase();
    parsed.hostname = parsed.hostname.toLowerCase();

    let pathname = parsed.pathname;
    if (pathname.length > 1 && pathname.endsWith("/")) {
      pathname = pathname.slice(0, -1);
    }
    parsed.pathname = pathname;

    return parsed.toString();
  } catch {
    return trimmed.replace(/\/+$/, "") || trimmed;
  }
}
