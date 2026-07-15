import type { AttemptType } from "../types/index.js";

/** Max revisions schedulable per problem from an attempt. */
export const MAX_REVISION_INTERVALS = 10;

/** Day offsets must be between 1 and this value (inclusive). */
export const MAX_REVISION_DAY_OFFSET = 365;

/**
 * Default day offsets from problem creation (UTC midnight).
 * SELF: no automatic revisions; HINT / VIDEO: tomorrow and +7 days.
 */
export const DEFAULT_REVISION_INTERVALS: Record<
  AttemptType,
  readonly number[]
> = {
  SELF: [],
  HINT: [1, 7],
  VIDEO: [1, 7],
};

export type RevisionIntervals = Record<AttemptType, number[]>;

export function normalizeRevisionIntervals(
  input?: Partial<RevisionIntervals> | null,
): RevisionIntervals {
  return {
    SELF: [...(input?.SELF ?? DEFAULT_REVISION_INTERVALS.SELF)],
    HINT: [...(input?.HINT ?? DEFAULT_REVISION_INTERVALS.HINT)],
    VIDEO: [...(input?.VIDEO ?? DEFAULT_REVISION_INTERVALS.VIDEO)],
  };
}
