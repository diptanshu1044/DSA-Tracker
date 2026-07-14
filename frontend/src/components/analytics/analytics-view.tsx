"use client";

import { useQuery } from "@tanstack/react-query";
import { AnalyticsCharts } from "@/components/analytics/analytics-charts";
import { AnalyticsStats } from "@/components/analytics/analytics-stats";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api";
import { analyticsApi } from "@/services/analytics.service";

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-80 w-full rounded-xl" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-80 w-full rounded-xl" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    </div>
  );
}

export function AnalyticsView() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["analytics"],
    queryFn: async () => {
      const result = await analyticsApi.get();
      return result.analytics;
    },
  });

  if (isLoading) {
    return <AnalyticsSkeleton />;
  }

  if (isError || !data) {
    const message =
      error instanceof ApiError
        ? error.message
        : "Could not load your analytics.";

    return (
      <div className="space-y-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground text-sm">{message}</p>
        </div>
        <Button type="button" variant="outline" onClick={() => void refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground text-sm">
          Track how you add problems, seek help, and complete revisions.
        </p>
      </div>

      <AnalyticsStats summary={data.summary} />

      <AnalyticsCharts
        problemsByDay={data.problemsByDay}
        attemptTypeBreakdown={data.attemptTypeBreakdown}
        revisionsByWeek={data.revisionsByWeek}
      />

      {isFetching ? (
        <p className="text-muted-foreground text-xs">Refreshing…</p>
      ) : null}
    </div>
  );
}
