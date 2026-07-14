"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Plus, Search, BookOpen } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { ApiError } from "@/lib/api";
import { formatShortDate } from "@/lib/dates";
import { attemptTypeLabel } from "@/lib/revision";
import { ATTEMPT_TYPE_OPTIONS } from "@/lib/validations/problem";
import { problemApi } from "@/services/problem.service";
import type { AttemptType } from "@/types/api";

const PAGE_SIZE = 10;

const FILTER_OPTIONS: Array<{ value: AttemptType | "ALL"; label: string }> = [
  { value: "ALL", label: "All" },
  ...ATTEMPT_TYPE_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label,
  })),
];

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
      <Skeleton className="h-8 w-full max-w-sm" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-7 w-24 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
  );
}

export function ProblemsListView() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [attemptType, setAttemptType] = useState<AttemptType | "ALL">("ALL");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(id);
  }, [search]);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: [
      "problems",
      {
        search: debouncedSearch,
        attemptType: attemptType === "ALL" ? undefined : attemptType,
        page,
        limit: PAGE_SIZE,
      },
    ],
    queryFn: async () => {
      const result = await problemApi.list({
        page,
        limit: PAGE_SIZE,
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        ...(attemptType !== "ALL" ? { attemptType } : {}),
      });
      return result;
    },
  });

  if (isLoading) {
    return <ProblemsListSkeleton />;
  }

  if (isError || !data) {
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
  const hasFilters = Boolean(debouncedSearch) || attemptType !== "ALL";

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

      <div className="flex flex-col gap-3">
        <div className="relative max-w-sm">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by title…"
            aria-label="Search problems by title"
            className="pl-8"
          />
        </div>

        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Filter by attempt type"
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
                onClick={() => {
                  setAttemptType(option.value);
                  setPage(1);
                }}
              >
                {option.label}
              </Button>
            );
          })}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your problems</CardTitle>
          <CardDescription>
            {pagination.total === 0
              ? hasFilters
                ? "No problems match your search or filters."
                : "No problems yet. Add one to get started."
              : `${pagination.total} problem${pagination.total === 1 ? "" : "s"}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {problems.length === 0 ? (
            <EmptyState
              icon={hasFilters ? Search : BookOpen}
              title={
                hasFilters
                  ? "No matching problems"
                  : "No problems yet"
              }
              description={
                hasFilters
                  ? "Try a different title or clear the attempt filter."
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
            <ul className="divide-border divide-y">
              {problems.map((problem) => (
                <li
                  key={problem._id}
                  className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/problems/${problem._id}`}
                        className="hover:text-primary truncate font-medium underline-offset-4 hover:underline"
                      >
                        {problem.title}
                      </Link>
                      <Badge variant="outline">
                        {attemptTypeLabel(problem.attemptType)}
                      </Badge>
                    </div>
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
        <div className="flex flex-wrap items-center justify-between gap-3">
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
        </div>
      ) : null}

      {isFetching ? (
        <p className="text-muted-foreground text-xs" aria-live="polite">
          Refreshing…
        </p>
      ) : null}
    </div>
  );
}
