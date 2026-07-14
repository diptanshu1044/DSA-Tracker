import { apiRequest } from "@/lib/api";
import { dueBeforeEndOfTodayUtc } from "@/lib/dates";
import type {
  AdditionalRevisionDays,
  MarkRevisionCompletedInput,
  MarkRevisionCompletedResult,
  PaginationMeta,
  RetryFailedRevisionResult,
  Revision,
} from "@/types/api";

export interface ListRevisionsParams {
  problemId?: string;
  completed?: boolean;
  dueBefore?: string;
  dueAfter?: string;
  page?: number;
  limit?: number;
}

export interface ListRevisionsResult {
  revisions: Revision[];
  pagination: PaginationMeta;
}

function toQuery(
  params: ListRevisionsParams,
): Record<string, string | number | boolean> {
  const query: Record<string, string | number | boolean> = {};
  if (params.problemId) query.problemId = params.problemId;
  if (params.completed !== undefined) {
    query.completed = params.completed ? "true" : "false";
  }
  if (params.dueBefore) query.dueBefore = params.dueBefore;
  if (params.dueAfter) query.dueAfter = params.dueAfter;
  if (params.page !== undefined) query.page = params.page;
  if (params.limit !== undefined) query.limit = params.limit;
  return query;
}

export const revisionApi = {
  list(params: ListRevisionsParams = {}) {
    return apiRequest<ListRevisionsResult>({
      method: "GET",
      url: "/revisions",
      params: toQuery(params),
    });
  },

  /** Incomplete revisions with dueDate ≤ today (overdue included — no cron). */
  listDueToday(limit = 100) {
    return revisionApi.list({
      completed: false,
      dueBefore: dueBeforeEndOfTodayUtc(),
      limit,
    });
  },

  listByProblem(problemId: string, limit = 100) {
    return revisionApi.list({ problemId, limit });
  },

  markCompleted(id: string, input: MarkRevisionCompletedInput) {
    return apiRequest<MarkRevisionCompletedResult>({
      method: "PATCH",
      url: `/revisions/${id}`,
      data: {
        completed: true,
        result: input.result,
        confidence: input.confidence,
        ...(input.timeTaken !== undefined
          ? { timeTaken: input.timeTaken }
          : {}),
      },
    });
  },

  /** One-click retry: mark failed review complete and schedule tomorrow. */
  retryTomorrow(id: string) {
    return apiRequest<RetryFailedRevisionResult>({
      method: "POST",
      url: `/revisions/${id}/retry-tomorrow`,
    });
  },

  scheduleAdditional(problemId: string, days: AdditionalRevisionDays) {
    return apiRequest<{ revision: Revision }>({
      method: "POST",
      url: "/revisions/schedule-additional",
      data: { problemId, days },
    });
  },
};
