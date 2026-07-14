"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Plus } from "lucide-react";
import { ActionableStatsSection } from "@/components/analytics/actionable-stats";
import { AnalyticsCharts } from "@/components/analytics/analytics-charts";
import { LearningMetricsSection } from "@/components/analytics/learning-metrics";
import { OverallProgress } from "@/components/analytics/overall-progress";
import { StatusBreakdownSection } from "@/components/analytics/status-breakdown";
import { TopicStatsSection } from "@/components/analytics/topic-stats";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api";
import { analyticsApi } from "@/services/analytics.service";

function AnalyticsSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-48 w-full rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-28 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-80 w-full rounded-xl" />
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
        <PageHeader title="Analytics" description={message} />
        <Button type="button" variant="outline" onClick={() => void refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const isEmpty = data.summary.problemsAdded === 0;

  return (
    <div className="space-y-10">
      <PageHeader
        title="Analytics"
        description="Motivation from what you have accomplished, and clarity on what to work on next."
      />

      {isEmpty ? (
        <EmptyState
          icon={BarChart3}
          title="No statistics available yet"
          description="Start solving your first problem to begin tracking your progress."
          action={
            <Button type="button" render={<Link href="/problems/new" />}>
              <Plus className="size-4" />
              Add Problem
            </Button>
          }
        />
      ) : (
        <>
          <ActionableStatsSection actionable={data.actionable} />
          <OverallProgress summary={data.summary} />
          <StatusBreakdownSection breakdown={data.statusBreakdown} />
          <LearningMetricsSection metrics={data.learningMetrics} />
          <TopicStatsSection topics={data.topicStats} />
          <AnalyticsCharts
            problemsByDay={data.problemsByDay}
            attemptTypeBreakdown={data.attemptTypeBreakdown}
            revisionsByWeek={data.revisionsByWeek}
            trends={data.trends}
          />
        </>
      )}

      {isFetching ? (
        <p className="text-muted-foreground text-xs" aria-live="polite">
          Refreshing…
        </p>
      ) : null}
    </div>
  );
}
