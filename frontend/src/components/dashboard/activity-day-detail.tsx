"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { activityApi } from "@/services/activity.service";
import { ApiError } from "@/lib/api";

function formatLongDate(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

interface ActivityDayDetailSheetProps {
  date: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ActivityDayDetailSheet({
  date,
  open,
  onOpenChange,
}: ActivityDayDetailSheetProps) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["activity", "day", date],
    queryFn: async () => {
      if (!date) throw new Error("Missing date");
      const result = await activityApi.getDay(date);
      return result.day;
    },
    enabled: open && Boolean(date),
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>
            {date ? formatLongDate(date) : "Day activity"}
          </SheetTitle>
          <SheetDescription>
            Problems added and reviews completed on this day.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : null}

          {isError ? (
            <p className="text-muted-foreground text-sm">
              {error instanceof ApiError
                ? error.message
                : "Could not load this day's activity."}
            </p>
          ) : null}

          {data && data.totalActivity === 0 ? (
            <p className="text-muted-foreground text-sm">
              No activity recorded.
            </p>
          ) : null}

          {data && data.totalActivity > 0 ? (
            <div className="space-y-6">
              <section className="space-y-2">
                <h3 className="text-sm font-medium">
                  Added Problems
                  <span className="text-muted-foreground ml-2 font-normal">
                    ({data.problemsAdded.length})
                  </span>
                </h3>
                {data.problemsAdded.length === 0 ? (
                  <p className="text-muted-foreground text-sm">None</p>
                ) : (
                  <ul className="space-y-1.5">
                    {data.problemsAdded.map((problem) => (
                      <li key={`added-${problem.problemId}`}>
                        <Link
                          href={`/problems/${problem.problemId}`}
                          className="text-foreground hover:text-primary inline-flex items-center gap-2 text-sm underline-offset-4 hover:underline"
                        >
                          <BookOpen className="text-muted-foreground size-3.5 shrink-0" />
                          {problem.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-medium">
                  Completed Reviews
                  <span className="text-muted-foreground ml-2 font-normal">
                    ({data.reviewsCompleted.length})
                  </span>
                </h3>
                {data.reviewsCompleted.length === 0 ? (
                  <p className="text-muted-foreground text-sm">None</p>
                ) : (
                  <ul className="space-y-1.5">
                    {data.reviewsCompleted.map((problem) => (
                      <li key={`review-${problem.problemId}`}>
                        <Link
                          href={`/problems/${problem.problemId}`}
                          className="text-foreground hover:text-primary inline-flex items-center gap-2 text-sm underline-offset-4 hover:underline"
                        >
                          <BookOpen className="text-muted-foreground size-3.5 shrink-0" />
                          {problem.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface EmptyActivityStateProps {
  canAddProblem: boolean;
}

export function EmptyActivityState({ canAddProblem }: EmptyActivityStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-8 text-center">
      <p className="text-sm font-medium">No activity yet.</p>
      <p className="text-muted-foreground max-w-sm text-sm">
        Start solving your first problem to begin building your learning streak.
      </p>
      {canAddProblem ? (
        <Button type="button" render={<Link href="/problems/new" />}>
          <Plus className="size-4" />
          Add Your First Problem
        </Button>
      ) : (
        <p className="text-muted-foreground text-xs">
          Clear some revisions due tomorrow before adding a new problem.
        </p>
      )}
    </div>
  );
}
