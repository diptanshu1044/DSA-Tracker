"use client";

import { ExternalLink, Check, Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { useCompleteRevision } from "@/hooks/use-complete-revision";
import { formatDueLabel } from "@/lib/dates";
import { attemptTypeLabel } from "@/lib/revision";
import type { DashboardQueueItem } from "@/types/api";

interface RevisionQueueProps {
  items: DashboardQueueItem[];
}

export function RevisionQueue({ items }: RevisionQueueProps) {
  const { markCompleted, completingId, cycleDialog } = useCompleteRevision();

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="space-y-1">
              <CardTitle>Today&apos;s revision queue</CardTitle>
              <CardDescription>
                Overdue reviews first, then everything due today.
              </CardDescription>
            </div>
            <Link
              href="/revisions"
              className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 hover:underline"
            >
              Open full list
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="All caught up"
              description="No revisions due today. Nice work staying current."
              className="border-0 py-8"
            />
          ) : (
            <ul className="divide-border divide-y">
              {items.map((item) => {
                const title = item.problem?.title ?? "Deleted problem";
                const url = item.problem?.url;
                const attemptType = item.problem?.attemptType;
                const problemId = item.problem?._id;
                const isCompleting = completingId === item._id;

                return (
                  <li
                    key={item._id}
                    className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {url ? (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-primary inline-flex max-w-full items-center gap-1.5 truncate font-medium"
                          >
                            <span className="truncate">{title}</span>
                            <ExternalLink className="size-3.5 shrink-0 opacity-60" />
                          </a>
                        ) : (
                          <span className="truncate font-medium">{title}</span>
                        )}
                        <Badge
                          variant={item.overdue ? "destructive" : "secondary"}
                        >
                          {formatDueLabel(item.dueDate, item.overdue)}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-xs">
                        Revision #{item.revisionNumber}
                        {attemptType
                          ? ` · ${attemptTypeLabel(attemptType)}`
                          : null}
                        {problemId ? (
                          <>
                            {" · "}
                            <Link
                              href={`/problems/${problemId}`}
                              className="hover:text-foreground underline-offset-4 hover:underline"
                            >
                              History
                            </Link>
                          </>
                        ) : null}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isCompleting || item.completed}
                      onClick={() => markCompleted(item._id)}
                    >
                      {isCompleting ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Check className="size-4" />
                      )}
                      Mark Completed
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
      {cycleDialog}
    </>
  );
}
