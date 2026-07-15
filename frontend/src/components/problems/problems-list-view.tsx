"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { ExternalLink, Plus, Search, BookOpen, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ProblemsCalendar } from "@/components/problems/problems-calendar";
import {
  ProblemsDateFilter,
  applyDateFilterToParams,
  dateFilterFromSearchParams,
  dateFilterLabel,
  toListDateParams,
  type DateFilterValue,
} from "@/components/problems/problems-date-filter";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { ApiError } from "@/lib/api";
import { formatShortDate } from "@/lib/dates";
import { attemptTypeLabel } from "@/lib/revision";
import { ATTEMPT_TYPE_OPTIONS } from "@/lib/validations/problem";
import { problemApi } from "@/services/problem.service";
import {
  PROBLEM_STATUSES,
  type AttemptType,
  type ProblemStatus,
} from "@/types/api";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

const FILTER_OPTIONS: Array<{ value: AttemptType | "ALL"; label: string }> = [
  { value: "ALL", label: "All" },
  ...ATTEMPT_TYPE_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label,
  })),
];

const STATUS_LABELS: Record<ProblemStatus, string> = {
  mastered: "Mastered",
  learning: "Learning",
  need_review: "Need Review",
  overdue: "Overdue",
  new: "New",
  forgotten: "Forgotten",
};

function isProblemStatus(value: string | null): value is ProblemStatus {
  return (
    value != null &&
    (PROBLEM_STATUSES as readonly string[]).includes(value)
  );
}

function isAttemptType(value: string | null): value is AttemptType {
  return value === "SELF" || value === "HINT" || value === "VIDEO";
}

function parseAttemptType(value: string | null): AttemptType | "ALL" {
  return isAttemptType(value) ? value : "ALL";
}

function parseStatus(value: string | null): ProblemStatus | null {
  return isProblemStatus(value) ? value : null;
}

function parseTopic(value: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function dateFilterFromParams(params: URLSearchParams): DateFilterValue {
  return dateFilterFromSearchParams({
    days: params.get("days"),
    createdAfter: params.get("createdAfter"),
    createdBefore: params.get("createdBefore"),
  });
}

/** Prefer the real URL after history.replaceState; fall back to Next search params. */
function readFilterParams(fallback: URLSearchParams): URLSearchParams {
  if (typeof window !== "undefined") {
    return new URLSearchParams(window.location.search);
  }
  return fallback;
}

function ProblemsListSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-8 w-32" />
      </div>
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
  );
}

function ProblemsListContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const paramsKey = searchParams.toString();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [attemptType, setAttemptType] = useState<AttemptType | "ALL">(() =>
    parseAttemptType(readFilterParams(searchParams).get("attemptType")),
  );
  const [statusFilter, setStatusFilter] = useState<ProblemStatus | null>(() =>
    parseStatus(readFilterParams(searchParams).get("status")),
  );
  const [topicFilter, setTopicFilter] = useState<string | null>(() =>
    parseTopic(readFilterParams(searchParams).get("topic")),
  );
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(() =>
    dateFilterFromParams(readFilterParams(searchParams)),
  );
  const [page, setPage] = useState(1);

  // Sync when Next.js updates search params (Analytics deep links / browser nav).
  // Local filter changes use history.replaceState so they do not fight this effect.
  useEffect(() => {
    const params = readFilterParams(new URLSearchParams(paramsKey));
    setAttemptType(parseAttemptType(params.get("attemptType")));
    setStatusFilter(parseStatus(params.get("status")));
    setTopicFilter(parseTopic(params.get("topic")));
    setDateFilter(dateFilterFromParams(params));
    setPage(1);
  }, [paramsKey]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(id);
  }, [search]);

  const dateParams = toListDateParams(dateFilter);
  const dateLabel = dateFilterLabel(dateFilter);

  function writeFiltersToUrl(next: {
    attemptType: AttemptType | "ALL";
    status: ProblemStatus | null;
    topic: string | null;
    date: DateFilterValue;
  }) {
    const params = new URLSearchParams();
    if (next.attemptType !== "ALL") {
      params.set("attemptType", next.attemptType);
    }
    if (next.status) {
      params.set("status", next.status);
    }
    if (next.topic) {
      params.set("topic", next.topic);
    }
    applyDateFilterToParams(params, next.date);
    const query = params.toString();
    window.history.replaceState(
      null,
      "",
      query ? `${pathname}?${query}` : pathname,
    );
  }

  function updateAttemptType(next: AttemptType | "ALL") {
    setAttemptType(next);
    setPage(1);
    writeFiltersToUrl({
      attemptType: next,
      status: statusFilter,
      topic: topicFilter,
      date: dateFilter,
    });
  }

  function updateDateFilter(next: DateFilterValue) {
    setDateFilter(next);
    setPage(1);
    writeFiltersToUrl({
      attemptType,
      status: statusFilter,
      topic: topicFilter,
      date: next,
    });
  }

  function clearStatusAndTopicFilters() {
    setStatusFilter(null);
    setTopicFilter(null);
    setPage(1);
    writeFiltersToUrl({
      attemptType,
      status: null,
      topic: null,
      date: dateFilter,
    });
  }

  function clearAllFilters() {
    setSearch("");
    setDebouncedSearch("");
    setAttemptType("ALL");
    setStatusFilter(null);
    setTopicFilter(null);
    setDateFilter({ mode: "all" });
    setPage(1);
    writeFiltersToUrl({
      attemptType: "ALL",
      status: null,
      topic: null,
      date: { mode: "all" },
    });
  }

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: [
      "problems",
      {
        search: debouncedSearch,
        attemptType: attemptType === "ALL" ? undefined : attemptType,
        status: statusFilter ?? undefined,
        topic: topicFilter ?? undefined,
        ...dateParams,
        page,
        limit: PAGE_SIZE,
      },
    ],
    queryFn: async () => {
      return problemApi.list({
        page,
        limit: PAGE_SIZE,
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        ...(attemptType !== "ALL" ? { attemptType } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(topicFilter ? { topic: topicFilter } : {}),
        ...dateParams,
      });
    },
    placeholderData: keepPreviousData,
    refetchInterval: (query) => {
      const problems = query.state.data?.problems ?? [];
      const pending = problems.some(
        (problem) => problem.metadataFetched === false,
      );
      return pending ? 2000 : false;
    },
  });

  if (isLoading && !data) {
    return <ProblemsListSkeleton />;
  }

  if ((isError && !data) || !data) {
    const message =
      error instanceof ApiError
        ? error.message
        : "Could not load problems.";

    return (
      <div className="space-y-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Problems</h1>
          <p className="text-muted-foreground text-sm">{message}</p>
        </div>
        <Button type="button" variant="outline" onClick={() => void refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const { problems, pagination } = data;
  const hasFilters =
    Boolean(debouncedSearch) ||
    attemptType !== "ALL" ||
    Boolean(statusFilter) ||
    Boolean(topicFilter) ||
    dateFilter.mode !== "all";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Problems"
        description="Browse and manage tracked problems."
        actions={
          <Button type="button" render={<Link href="/problems/new" />}>
            <Plus className="size-4" />
            Add Problem
          </Button>
        }
      />

      <section
        aria-label="Problem filters"
        className="bg-card text-card-foreground rounded-xl ring-1 ring-foreground/10"
      >
        <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-start lg:gap-6">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="problems-search">Search</Label>
              <div className="relative max-w-md">
                <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
                <Input
                  id="problems-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by title…"
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-sm font-medium" id="attempt-type-label">
                Attempt type
              </p>
              <div
                className="flex flex-wrap gap-1.5"
                role="group"
                aria-labelledby="attempt-type-label"
              >
                {FILTER_OPTIONS.map((option) => {
                  const selected = attemptType === option.value;
                  return (
                    <Button
                      key={option.value}
                      type="button"
                      size="sm"
                      variant={selected ? "secondary" : "outline"}
                      aria-pressed={selected}
                      onClick={() => updateAttemptType(option.value)}
                    >
                      {option.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-sm font-medium" id="date-filter-label">
                Solved date
              </p>
              <div aria-labelledby="date-filter-label">
                <ProblemsDateFilter
                  value={dateFilter}
                  onChange={updateDateFilter}
                />
              </div>
            </div>

            {hasFilters ? (
              <div className="flex flex-wrap items-center gap-2 border-t pt-3">
                {debouncedSearch ? (
                  <Badge variant="secondary">Search: {debouncedSearch}</Badge>
                ) : null}
                {attemptType !== "ALL" ? (
                  <Badge variant="secondary">
                    Attempt: {attemptTypeLabel(attemptType)}
                  </Badge>
                ) : null}
                {dateLabel ? (
                  <Badge variant="secondary">Solved: {dateLabel}</Badge>
                ) : null}
                {statusFilter ? (
                  <Badge variant="secondary">
                    Status: {STATUS_LABELS[statusFilter]}
                  </Badge>
                ) : null}
                {topicFilter ? (
                  <Badge variant="secondary">Topic: {topicFilter}</Badge>
                ) : null}
                {statusFilter || topicFilter ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={clearStatusAndTopicFilters}
                  >
                    <X className="size-3.5" />
                    Clear status / topic
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={clearAllFilters}
                >
                  <X className="size-3.5" />
                  Clear all
                </Button>
              </div>
            ) : null}
          </div>

          <ProblemsCalendar
            className="mx-auto lg:mx-0 lg:sticky lg:top-4"
            filter={dateFilter}
            onSelectDay={(date) => {
              if (dateFilter.mode === "day" && dateFilter.date === date) {
                updateDateFilter({ mode: "all" });
                return;
              }
              updateDateFilter({ mode: "day", date });
            }}
          />
        </div>
      </section>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Your problems</CardTitle>
          <CardDescription>
            {pagination.total === 0
              ? hasFilters
                ? "No problems match your search or filters."
                : "No problems yet. Add one to get started."
              : `${pagination.total} problem${pagination.total === 1 ? "" : "s"}${
                  dateLabel ? ` solved (${dateLabel})` : ""
                }`}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {problems.length === 0 ? (
            <EmptyState
              icon={hasFilters ? Search : BookOpen}
              title={hasFilters ? "No matching problems" : "No problems yet"}
              description={
                hasFilters
                  ? "Try a different date, title, or clear the active filters."
                  : "Problems you log will show up here."
              }
              action={
                hasFilters ? undefined : (
                  <Button type="button" render={<Link href="/problems/new" />}>
                    <Plus className="size-4" />
                    Add Problem
                  </Button>
                )
              }
              className="border-0"
            />
          ) : (
            <ul
              className={cn(
                "divide-border divide-y",
                isFetching && "opacity-70 transition-opacity",
              )}
            >
              {problems.map((problem) => (
                <li
                  key={problem._id}
                  className="flex flex-col gap-3 py-3.5 first:pt-3 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/problems/${problem._id}`}
                        className="hover:text-primary truncate font-medium underline-offset-4 hover:underline"
                      >
                        {problem.title}
                      </Link>
                      {problem.metadataFetched === false ? (
                        <Badge variant="secondary">Fetching details...</Badge>
                      ) : null}
                      {problem.difficulty ? (
                        <Badge
                          variant="outline"
                          className={cn(
                            problem.difficulty === "Easy" &&
                              "border-emerald-500/30 text-emerald-700 dark:text-emerald-400",
                            problem.difficulty === "Medium" &&
                              "border-amber-500/30 text-amber-700 dark:text-amber-400",
                            problem.difficulty === "Hard" &&
                              "border-rose-500/30 text-rose-700 dark:text-rose-400",
                          )}
                        >
                          {problem.difficulty}
                        </Badge>
                      ) : null}
                      <Badge variant="outline">
                        {attemptTypeLabel(problem.attemptType)}
                      </Badge>
                    </div>
                    {problem.metadataFetched && problem.topics?.length ? (
                      <p className="text-muted-foreground text-xs">
                        {problem.topics.slice(0, 4).join(" · ")}
                        {problem.topics.length > 4
                          ? ` · +${problem.topics.length - 4}`
                          : null}
                      </p>
                    ) : null}
                    <p className="text-muted-foreground text-xs">
                      Added {formatShortDate(problem.createdAt)}
                      {problem.timeTaken != null
                        ? ` · ${problem.timeTaken} min`
                        : null}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      render={
                        <a
                          href={problem.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        />
                      }
                    >
                      <ExternalLink className="size-3.5" />
                      Open
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      render={<Link href={`/problems/${problem._id}`} />}
                    >
                      Details
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {pagination.totalPages > 1 ? (
        <nav
          className="flex flex-wrap items-center justify-between gap-3"
          aria-label="Pagination"
        >
          <p className="text-muted-foreground text-xs">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!pagination.hasPrev}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!pagination.hasNext}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </Button>
          </div>
        </nav>
      ) : null}

      {isFetching ? (
        <p className="text-muted-foreground text-xs" aria-live="polite">
          Refreshing…
        </p>
      ) : null}
    </div>
  );
}

export function ProblemsListView() {
  return (
    <Suspense fallback={<ProblemsListSkeleton />}>
      <ProblemsListContent />
    </Suspense>
  );
}
