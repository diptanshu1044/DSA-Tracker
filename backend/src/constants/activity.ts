/**
 * Activity type keys used in heatmap aggregation.
 * Add new types here when introducing AI reviews, contests, etc.
 * Only intensity-counted types contribute to totalActivity / streaks.
 */
export const ACTIVITY_TYPES = {
  PROBLEMS_ADDED: "problemsAdded",
  REVIEWS_COMPLETED: "reviewsCompleted",
  // Future examples (not intensity-counted until enabled):
  // AI_REVIEW_SESSIONS: "aiReviewSessions",
  // MOCK_INTERVIEWS: "mockInterviews",
  // CONTEST_PARTICIPATION: "contestParticipation",
  // NOTES_UPDATED: "notesUpdated",
  // FLASHCARDS_REVIEWED: "flashcardsReviewed",
} as const;

export type ActivityType =
  (typeof ACTIVITY_TYPES)[keyof typeof ACTIVITY_TYPES];

/** Types that currently count toward heatmap intensity and streaks. */
export const INTENSITY_ACTIVITY_TYPES: readonly ActivityType[] = [
  ACTIVITY_TYPES.PROBLEMS_ADDED,
  ACTIVITY_TYPES.REVIEWS_COMPLETED,
];

/** Roughly one year of calendar weeks for the GitHub-style grid. */
export const HEATMAP_WEEKS = 53;
