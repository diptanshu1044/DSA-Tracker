/**
 * Extensible Today's Queue types.
 *
 * To add a section later (e.g. weak topics, recommended practice):
 * 1. Add an id to QueueSectionId
 * 2. Implement a QueueSectionBuilder
 * 3. Register it in SECTION_BUILDERS (order = display priority)
 */

export type QueueSectionId =
  | "overdue"
  | "due_today"
  | "new_problems"
  // Future sections (reserved for compatibility):
  | "high_priority"
  | "weak_topics"
  | "recommended_practice"
  | "recently_forgotten"
  | "continue_learning";

export type QueueItemKind = "review" | "new_problem";

export interface QueueProblemSummary {
  _id: string;
  title: string;
  url: string;
  difficulty?: string;
  topics: string[];
  attemptType: string;
  createdAt: Date;
}

export interface ReviewQueueItem {
  kind: "review";
  revisionId: string;
  dueDate: Date;
  revisionNumber: number;
  /** Present when the item is overdue. */
  daysOverdue?: number;
  problem: QueueProblemSummary | null;
}

export interface NewProblemQueueItem {
  kind: "new_problem";
  problem: QueueProblemSummary;
  /** Whether the problem was added on the current UTC day. */
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

/** Shared data loaded once and passed to every section builder. */
export interface QueueBuildContext {
  userId: string;
  todayStart: Date;
  tomorrowStart: Date;
  /** Incomplete revisions with dueDate < tomorrow (populated problem). */
  dueRevisions: DueRevisionCandidate[];
  /** Problem ids already placed in overdue / due_today (to avoid duplicates). */
  reviewProblemIds: Set<string>;
}

export interface DueRevisionCandidate {
  revisionId: string;
  dueDate: Date;
  revisionNumber: number;
  completed: boolean;
  problem: QueueProblemSummary | null;
  problemCreatedAt: Date | null;
}

export interface QueueSectionBuilder {
  id: QueueSectionId;
  title: string;
  icon: string;
  /**
   * Build section items. Return an empty array to hide the section.
   * May be sync or async (e.g. new problems need an extra query).
   */
  build(ctx: QueueBuildContext): QueueItem[] | Promise<QueueItem[]>;
}
