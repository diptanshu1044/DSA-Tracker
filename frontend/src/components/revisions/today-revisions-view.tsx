"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { RevisionCard } from "@/components/revisions/revision-card";
import { useCompleteRevision } from "@/hooks/use-complete-revision";
import { ApiError } from "@/lib/api";
import { isOverdue } from "@/lib/dates";
import { revisionApi } from "@/services/revision.service";

function TodayRevisionsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-44 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function TodayRevisionsView() {
  const { markCompleted, completingId, cycleDialog } = useCompleteRevision();

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["revisions", "due-today"],
    queryFn: async () => {
      const result = await revisionApi.listDueToday();
      return result.revisions;
    },
  });

  if (isLoading) {
    return <TodayRevisionsSkeleton />;
  }

  if (isError || !data) {
    const message =
      error instanceof ApiError
        ? error.message
        : "Could not load today's revisions.";

    return (
      <div className="space-y-4">
        <PageHeader title="Today's Revision" description={message} />
        <Button type="button" variant="outline" onClick={() => void refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Today's Revision"
        description="Incomplete reviews due today or earlier. Missed items stay in this list until you complete them."
        actions={
          <Button type="button" render={<Link href="/revisions/schedule" />}>
            <Plus className="size-4" />
            Schedule revision
          </Button>
        }
      />

      {data.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="No revisions due today"
          description="Nice work staying current. Schedule a review for any problem you've already logged."
          action={
            <Button
              type="button"
              variant="outline"
              render={<Link href="/revisions/schedule" />}
            >
              <Plus className="size-4" />
              Schedule revision
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map((revision) => (
            <RevisionCard
              key={revision._id}
              revision={revision}
              overdue={isOverdue(revision.dueDate)}
              isCompleting={completingId === revision._id}
              onMarkCompleted={markCompleted}
            />
          ))}
        </div>
      )}

      {isFetching ? (
        <p className="text-muted-foreground text-xs">Refreshing…</p>
      ) : null}

      {cycleDialog}
    </div>
  );
}
