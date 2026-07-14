"use client";

import Link from "next/link";
import { Check, ExternalLink, Loader2, PartyPopper, Plus } from "lucide-react";
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
import { formatAddedLabel, formatDaysOverdue } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type {
  NewProblemQueueItem,
  QueueItem,
  QueueSection,
  QueueSectionId,
  ReviewQueueItem,
  TodaysQueue,
} from "@/types/api";

interface TodaysQueueViewProps {
  queue: TodaysQueue;
}

const SECTION_EMPHASIS: Record<
  string,
  { shell: string; heading: string; item: string }
> = {
  overdue: {
    shell: "ring-destructive/25 bg-destructive/[0.03]",
    heading: "text-destructive",
    item: "border-destructive/20 bg-background/80",
  },
  due_today: {
    shell: "",
    heading: "",
    item: "border-border/80 bg-background/60",
  },
  new_problems: {
    shell: "ring-border/40 bg-muted/20",
    heading: "text-muted-foreground",
    item: "border-transparent bg-muted/30",
  },
};

function topicLabel(topics: string[]): string | null {
  if (topics.length === 0) {
    return null;
  }
  return topics[0] ?? null;
}

function metaLine(parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join(" · ");
}

function QueueSummary({ queue }: { queue: TodaysQueue }) {
  const { summary } = queue;

  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
      <span className="text-foreground font-medium">Today&apos;s Work</span>
      <span className="text-destructive/90">
        🔥 Overdue: {summary.overdue}
      </span>
      <span className="text-muted-foreground">
        📅 Due Today: {summary.dueToday}
      </span>
      <span className="text-muted-foreground/80">
        ✨ New Problems: {summary.newProblems}
      </span>
      <span className="text-foreground/80 font-medium">
        Total Tasks: {summary.totalTasks}
      </span>
    </div>
  );
}

function ReviewItemCard({
  item,
  sectionId,
  completingId,
  onMarkCompleted,
}: {
  item: ReviewQueueItem;
  sectionId: QueueSectionId;
  completingId: string | null;
  onMarkCompleted: (id: string, label?: string) => void;
}) {
  const title = item.problem?.title ?? "Deleted problem";
  const url = item.problem?.url;
  const problemId = item.problem?._id;
  const isCompleting = completingId === item.revisionId;
  const emphasis = SECTION_EMPHASIS[sectionId] ?? SECTION_EMPHASIS.due_today;
  const isOverdue = sectionId === "overdue";
  const days = item.daysOverdue;

  return (
    <li
      className={cn(
        "flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between",
        emphasis.item,
      )}
    >
      <div className="min-w-0 space-y-1.5">
        <p className="truncate font-medium">{title}</p>
        {isOverdue && typeof days === "number" ? (
          <p className="text-destructive text-xs font-medium">
            {formatDaysOverdue(days)}
          </p>
        ) : null}
        <p className="text-muted-foreground text-xs">
          {metaLine([
            item.problem?.difficulty,
            topicLabel(item.problem?.topics ?? []),
            `Review #${item.revisionNumber}`,
          ])}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {url ? (
          <Button
            type="button"
            size="sm"
            variant={isOverdue ? "default" : "secondary"}
            render={
              <a href={url} target="_blank" rel="noopener noreferrer" />
            }
          >
            <ExternalLink className="size-3.5" />
            Start Review
          </Button>
        ) : null}
        {problemId ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            render={<Link href={`/problems/${problemId}`} />}
          >
            Details
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isCompleting}
          onClick={() =>
            onMarkCompleted(item.revisionId, `Revision #${item.revisionNumber}`)
          }
        >
          {isCompleting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Check className="size-4" />
          )}
          Mark Completed
        </Button>
      </div>
    </li>
  );
}

function NewProblemItemCard({ item }: { item: NewProblemQueueItem }) {
  const { problem, addedToday } = item;
  const emphasis = SECTION_EMPHASIS.new_problems;

  return (
    <li
      className={cn(
        "flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between",
        emphasis.item,
      )}
    >
      <div className="min-w-0 space-y-1.5">
        <p className="truncate font-medium">{problem.title}</p>
        <p className="text-muted-foreground text-xs">
          {metaLine([
            problem.difficulty,
            topicLabel(problem.topics),
            formatAddedLabel(problem.createdAt, addedToday),
          ])}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          render={
            <a href={problem.url} target="_blank" rel="noopener noreferrer" />
          }
        >
          <ExternalLink className="size-3.5" />
          Start Solving
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          render={<Link href={`/problems/${problem._id}`} />}
        >
          Details
        </Button>
      </div>
    </li>
  );
}

function QueueItemRow({
  item,
  sectionId,
  completingId,
  onMarkCompleted,
}: {
  item: QueueItem;
  sectionId: QueueSectionId;
  completingId: string | null;
  onMarkCompleted: (id: string, label?: string) => void;
}) {
  if (item.kind === "review") {
    return (
      <ReviewItemCard
        item={item}
        sectionId={sectionId}
        completingId={completingId}
        onMarkCompleted={onMarkCompleted}
      />
    );
  }
  return <NewProblemItemCard item={item} />;
}

function QueueSectionBlock({
  section,
  completingId,
  onMarkCompleted,
}: {
  section: QueueSection;
  completingId: string | null;
  onMarkCompleted: (id: string, label?: string) => void;
}) {
  const emphasis =
    SECTION_EMPHASIS[section.id] ?? SECTION_EMPHASIS.due_today;

  return (
    <section
      className={cn(
        "space-y-3 rounded-xl p-4 ring-1 ring-transparent",
        emphasis.shell,
      )}
    >
      <header className="flex items-center gap-2">
        <span className="text-base leading-none" aria-hidden>
          {section.icon}
        </span>
        <h3 className={cn("text-sm font-semibold", emphasis.heading)}>
          {section.title}
        </h3>
        <Badge variant="secondary" className="ml-auto">
          {section.items.length}
        </Badge>
      </header>
      <ul className="space-y-2">
        {section.items.map((item) => (
          <QueueItemRow
            key={
              item.kind === "review" ? item.revisionId : item.problem._id
            }
            item={item}
            sectionId={section.id}
            completingId={completingId}
            onMarkCompleted={onMarkCompleted}
          />
        ))}
      </ul>
    </section>
  );
}

export function TodaysQueueView({ queue }: TodaysQueueViewProps) {
  const { markCompleted, completingId, cycleDialog } = useCompleteRevision();
  const isEmpty = queue.sections.length === 0;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="space-y-1">
              <CardTitle>Today&apos;s Queue</CardTitle>
              <CardDescription>
                What should you solve first today? Overdue reviews, then due
                today, then new problems.
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
        <CardContent className="space-y-5">
          <QueueSummary queue={queue} />

          {isEmpty ? (
            <EmptyState
              icon={PartyPopper}
              title="You're all caught up!"
              description={
                "You have no reviews or new problems waiting today. Why not solve a new problem and continue your streak?"
              }
              className="border-0 py-8"
              action={
                <Button
                  type="button"
                  render={<Link href="/problems/new" />}
                >
                  <Plus className="size-4" />
                  Solve a New Problem
                </Button>
              }
            />
          ) : (
            <div className="space-y-4">
              {queue.sections.map((section) => (
                <QueueSectionBlock
                  key={section.id}
                  section={section}
                  completingId={completingId}
                  onMarkCompleted={markCompleted}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      {cycleDialog}
    </>
  );
}
