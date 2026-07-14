import { apiRequest } from "@/lib/api";
import type {
  AttemptType,
  PaginationMeta,
  Problem,
} from "@/types/api";

export interface CreateProblemInput {
  title: string;
  url: string;
  attemptType: AttemptType;
  timeTaken?: number;
}

export interface ListProblemsParams {
  page?: number;
  limit?: number;
  attemptType?: AttemptType;
  search?: string;
}

export interface ListProblemsResult {
  problems: Problem[];
  pagination: PaginationMeta;
}

function toQuery(
  params: ListProblemsParams,
): Record<string, string | number> {
  const query: Record<string, string | number> = {};
  if (params.page !== undefined) query.page = params.page;
  if (params.limit !== undefined) query.limit = params.limit;
  if (params.attemptType) query.attemptType = params.attemptType;
  if (params.search) query.search = params.search;
  return query;
}

export const problemApi = {
  list(params: ListProblemsParams = {}) {
    return apiRequest<ListProblemsResult>({
      method: "GET",
      url: "/problems",
      params: toQuery(params),
    });
  },

  create(data: CreateProblemInput) {
    return apiRequest<{ problem: Problem }>({
      method: "POST",
      url: "/problems",
      data,
    });
  },

  getById(id: string) {
    return apiRequest<{ problem: Problem }>({
      method: "GET",
      url: `/problems/${id}`,
    });
  },

  remove(id: string) {
    return apiRequest<void>({
      method: "DELETE",
      url: `/problems/${id}`,
    });
  },
};
