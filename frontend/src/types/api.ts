export type AuthProvider = "local" | "google";

export type AttemptType = "SELF" | "HINT" | "VIDEO";

export type Difficulty = "Easy" | "Medium" | "Hard";

export type ConfidenceLevel = "LOW" | "MEDIUM" | "HIGH";

export type ReviewHistoryType = "INITIAL" | "REVIEW";

/** Outcome of an attempt/review — same values as AttemptType. */
export type ReviewResult = AttemptType;

export interface Problem {
  _id: string;
  userId: string;
  title: string;
  url: string;
  slug?: string;
  difficulty?: Difficulty;
  topics?: string[];
  problemId?: string;
  metadataFetched?: boolean;
  metadataFetchedAt?: string | null;
  metadataError?: string | null;
  attemptType: AttemptType;
  timeTaken?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewHistoryEntry {
  _id: string;
  userId: string;
  problemId: string;
  type: ReviewHistoryType;
  revisionNumber?: number | null;
  revisionId?: string | null;
  scheduledDate?: string | null;
  completedAt: string;
  result: ReviewResult;
  confidence?: ConfidenceLevel | null;
  timeTaken?: number | null;
  nextReviewDate?: string | null;
  /** True when next review was auto-scheduled (e.g. one-click retry). */
  autoRescheduled?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  provider: AuthProvider;
}

export interface ApiSuccess<T> {
  success: true;
  message?: string;
  data: T;
}

export interface ApiFailure {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export interface AuthPayload {
  accessToken: string;
  refreshToken: string;
  /** @deprecated Alias of accessToken for older clients */
  token?: string;
  user: User;
}

export interface ForgotPasswordPayload {
  resetToken?: string;
  resetUrl?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface DashboardStats {
  problemsAdded: number;
  pendingRevisions: number;
  overdue: number;
  addedToday: number;
}

export interface DashboardProblemSummary {
  _id: string;
  title: string;
  url: string;
  attemptType: AttemptType;
}

export interface DashboardQueueItem {
  _id: string;
  dueDate: string;
  revisionNumber: number;
  completed: boolean;
  overdue: boolean;
  problem: DashboardProblemSummary | null;
}

export type QueueSectionId =
  | "overdue"
  | "due_today"
  | "new_problems"
  | "high_priority"
  | "weak_topics"
  | "recommended_practice"
  | "recently_forgotten"
  | "continue_learning";

export interface QueueProblemSummary {
  _id: string;
  title: string;
  url: string;
  difficulty?: Difficulty;
  topics: string[];
  attemptType: AttemptType;
  createdAt: string;
}

export interface ReviewQueueItem {
  kind: "review";
  revisionId: string;
  dueDate: string;
  revisionNumber: number;
  daysOverdue?: number;
  problem: QueueProblemSummary | null;
}

export interface NewProblemQueueItem {
  kind: "new_problem";
  problem: QueueProblemSummary;
  addedToday: boolean;
}

export type QueueItem = ReviewQueueItem | NewProblemQueueItem;

export interface QueueSection {
  id: QueueSectionId;
  title: string;
  icon: string;
  items: QueueItem[];
}

export interface TodaysQueueSummary {
  overdue: number;
  dueToday: number;
  newProblems: number;
  totalTasks: number;
}

export interface TodaysQueue {
  summary: TodaysQueueSummary;
  sections: QueueSection[];
}

export interface Dashboard {
  stats: DashboardStats;
  canAddProblem: boolean;
  /** @deprecated Prefer todaysQueue */
  revisionQueue: DashboardQueueItem[];
  todaysQueue: TodaysQueue;
}

export interface RevisionProblemSummary {
  _id: string;
  title: string;
  url: string;
  attemptType: AttemptType;
}

export interface Revision {
  _id: string;
  userId: string;
  problemId: string | RevisionProblemSummary;
  dueDate: string;
  revisionNumber: number;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** Allowed day offsets for post-cycle additional revisions. */
export const ADDITIONAL_REVISION_DAYS = [3, 7, 10] as const;
export type AdditionalRevisionDays =
  (typeof ADDITIONAL_REVISION_DAYS)[number];

export interface MarkRevisionCompletedInput {
  result: ReviewResult;
  confidence: ConfidenceLevel;
  timeTaken?: number;
}

export interface MarkRevisionCompletedResult {
  revision: Revision;
  revisionCycleComplete: boolean;
}

export interface RetryFailedRevisionResult {
  revision: Revision;
  nextRevision: Revision;
  revisionCycleComplete: false;
}

/** Block adding problems when pending revisions exceed this count. */
export const PENDING_REVISION_LIMIT = 20;

export const PROBLEM_STATUSES = [
  "mastered",
  "learning",
  "need_review",
  "overdue",
  "new",
  "forgotten",
] as const;

export type ProblemStatus = (typeof PROBLEM_STATUSES)[number];

export interface AnalyticsSummary {
  problemsAdded: number;
  solvedMyself: number;
  neededHelp: number;
  pendingRevisions: number;
  problemsSolved: number;
  solvedWithoutHelp: number;
  solvedUsingHint: number;
  solvedUsingSolution: number;
  reviewsCompleted: number;
  currentStreak: number;
  longestStreak: number;
  totalStudyDays: number;
  averageSolveTime: number | null;
  averageReviewTime: number | null;
  reviewSuccessRate: number | null;
}

export interface ActionableStats {
  overdue: number;
  dueToday: number;
  learning: number;
  mastered: number;
  newProblems: number;
  scheduledReviews: number;
  forgotten: number;
  weakestTopic: string | null;
  strongestTopic: string | null;
}

export interface StatusBreakdown {
  mastered: number;
  learning: number;
  needReview: number;
  overdue: number;
  newProblems: number;
  forgotten: number;
}

export interface LearningMetrics {
  firstAttemptSuccessRate: number | null;
  averageReviewsBeforeMastery: number | null;
  averageDaysToMaster: number | null;
  problemsRequiringMultipleRetries: number;
  longestLearningStreak: number;
  fastestMasteredProblem: {
    problemId: string;
    title: string;
    daysToMaster: number;
  } | null;
  mostReviewedProblem: {
    problemId: string;
    title: string;
    reviewCount: number;
  } | null;
}

export interface TopicStat {
  topic: string;
  problemsAdded: number;
  learning: number;
  mastered: number;
  needReview: number;
  overdue: number;
  forgotten: number;
  newProblems: number;
  successRate: number | null;
  activeProblems: number;
}

export interface AnalyticsTrends {
  reviewsLast7Days: number;
  reviewsLast30Days: number;
  problemsMasteredThisMonth: number;
  problemsAddedThisMonth: number;
  reviewsByDay: AnalyticsDayCount[];
  weeklyConsistency: number;
}

export interface AnalyticsDayCount {
  date: string;
  count: number;
}

export interface AnalyticsAttemptTypeCount {
  attemptType: AttemptType;
  count: number;
}

export interface AnalyticsWeekCount {
  weekStart: string;
  count: number;
}

export interface Analytics {
  summary: AnalyticsSummary;
  actionable: ActionableStats;
  statusBreakdown: StatusBreakdown;
  learningMetrics: LearningMetrics;
  topicStats: TopicStat[];
  trends: AnalyticsTrends;
  problemsByDay: AnalyticsDayCount[];
  attemptTypeBreakdown: AnalyticsAttemptTypeCount[];
  revisionsByWeek: AnalyticsWeekCount[];
}
