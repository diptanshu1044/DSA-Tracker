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

export interface Dashboard {
  stats: DashboardStats;
  canAddProblem: boolean;
  revisionQueue: DashboardQueueItem[];
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

/** Block adding problems when pending revisions exceed this count. */
export const PENDING_REVISION_LIMIT = 20;

export interface AnalyticsSummary {
  problemsAdded: number;
  solvedMyself: number;
  neededHelp: number;
  pendingRevisions: number;
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
  problemsByDay: AnalyticsDayCount[];
  attemptTypeBreakdown: AnalyticsAttemptTypeCount[];
  revisionsByWeek: AnalyticsWeekCount[];
}
