"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Plus } from "lucide-react";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { RevisionQueue } from "@/components/dashboard/revision-queue";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { dashboardApi } from "@/services/dashboard.service";
import { PENDING_REVISION_LIMIT } from "@/types/api";
import { ApiError } from "@/lib/api";

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

export function DashboardView() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const result = await dashboardApi.get();
      return result.dashboard;
    },
  });

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (isError || !data) {
    const message =
      error instanceof ApiError
        ? error.message
        : "Could not load your dashboard.";

    return (
      <div className="space-y-4">
        <PageHeader title="Dashboard" description={message} />
        <Button type="button" variant="outline" onClick={() => void refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const backlogBlocked = !data.canAddProblem;
  const pending = data.stats.pendingRevisions;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of your practice activity."
        actions={
          backlogBlocked ? (
            <Button type="button" disabled aria-disabled="true">
              <Plus className="size-4" />
              Add Problem
            </Button>
          ) : (
            <Button type="button" render={<Link href="/problems/new" />}>
              <Plus className="size-4" />
              Add Problem
            </Button>
          )
        }
      />

      {backlogBlocked ? (
        <div
          role="alert"
          className="border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-100 flex gap-3 rounded-xl border px-4 py-3 text-sm"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="space-y-1">
            <p className="font-medium">Revision backlog is too high</p>
            <p className="text-amber-900/80 dark:text-amber-100/80">
              You have {pending} pending revisions (limit{" "}
              {PENDING_REVISION_LIMIT}). Clear some reviews before adding new
              problems.
            </p>
          </div>
        </div>
      ) : null}

      <StatsCards stats={data.stats} />

      <RevisionQueue items={data.revisionQueue} />

      {isFetching ? (
        <p className="text-muted-foreground text-xs" aria-live="polite">
          Refreshing…
        </p>
      ) : null}
    </div>
  );
}
