import { normalizeProblemUrl } from "./url.js";

export interface ParsedLeetCodeUrl {
  slug: string;
  normalizedUrl: string;
}

const LEETCODE_HOSTS = new Set(["leetcode.com", "www.leetcode.com"]);

/**
 * Extract a LeetCode problem slug from a pathname like `/problems/two-sum/`.
 * Ignores extra path segments such as `/description`, `/solutions`, etc.
 */
function extractSlug(pathname: string): string | null {
  const match = pathname.match(
    /^\/problems\/([a-z0-9]+(?:-[a-z0-9]+)*)(?:\/.*)?$/i,
  );
  return match?.[1]?.toLowerCase() ?? null;
}

export function isLeetCodeProblemUrl(raw: string): boolean {
  try {
    const parsed = new URL(raw.trim());
    if (!LEETCODE_HOSTS.has(parsed.hostname.toLowerCase())) {
      return false;
    }
    return extractSlug(parsed.pathname) !== null;
  } catch {
    return false;
  }
}

/**
 * Parse and normalize a LeetCode problem URL.
 * @throws Error if the URL is not a valid LeetCode problem link
 */
export function parseLeetCodeUrl(raw: string): ParsedLeetCodeUrl {
  const trimmed = raw.trim();
  let parsed: URL;

  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("Must be a valid LeetCode problem URL");
  }

  if (!LEETCODE_HOSTS.has(parsed.hostname.toLowerCase())) {
    throw new Error("Only LeetCode problem URLs are supported");
  }

  const slug = extractSlug(parsed.pathname);
  if (!slug) {
    throw new Error(
      "URL must be a LeetCode problem link (e.g. https://leetcode.com/problems/two-sum/)",
    );
  }

  const normalizedUrl = normalizeProblemUrl(
    `https://leetcode.com/problems/${slug}`,
  );

  return { slug, normalizedUrl };
}

/** Turn `two-sum` into `Two Sum` for a provisional title. */
export function humanizeSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
