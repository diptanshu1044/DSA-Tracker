"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatShortDate, startOfUtcDay } from "@/lib/dates";
import {
  confidenceLabel,
  deriveReviewLearningSummary,
  deriveReviewStats,
  reviewResultEmoji,
  reviewResultLabel,
  type ReviewDerivedStats,
  type ReviewLearningSummary,
} from "@/lib/review-history";
import { cn } from "@/lib/utils";
import type { ReviewHistoryEntry } from "@/types/api";

function nextReviewPhrase(nextScheduledReview: string | null): string | null {
  if (!nextScheduledReview) return null;
  const due = startOfUtcDay(new Date(nextScheduledReview)).getTime();
  const today = startOfUtcDay().getTime();
  const tomorrow = today + 24 * 60 * 60 * 1000;
  if (due === tomorrow) return "tomorrow";
  if (due === today) return "today";
  return formatShortDate(nextScheduledReview);
}

function SummaryGrid({
  items,
}: {
  items: { label: string; value: string }[];
}) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="bg-muted/40 rounded-lg border px-3 py-2.5"
        >
          <dt className="text-muted-foreground text-xs">{item.label}</dt>
          <dd className="mt-1 text-sm font-medium">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function formatOptionalDate(value: string | null): string {
  return value ? formatShortDate(value) : "—";
}

function formatPercent(value: number | null): string {
  return value === null ? "—" : `${value}%`;
}

function formatDays(value: number | null): string {
  if (value === null) return "—";
  if (value === 0) return "Today";
  if (value === 1) return "1 day";
  return `${value} days`;
}

function LearningSummaryCard({ summary }: { summary: ReviewLearningSummary }) {
  const items = [
    {
      label: "Date added",
      value: formatOptionalDate(summary.dateAdded),
    },
    { label: "Current status", value: summary.currentStatus },
    {
      label: "Initial attempt",
      value: summary.initialAttemptResult
        ? `${reviewResultEmoji(summary.initialAttemptResult)} ${reviewResultLabel(summary.initialAttemptResult)}`
        : "—",
    },
    {
      label: "Reviews completed",
      value: String(summary.reviewsCompleted),
    },
    {
      label: "Successful reviews",
      value: String(summary.successfulReviews),
    },
    {
      label: "Needed hint",
      value: String(summary.reviewsRequiringHint),
    },
    {
      label: "Needed solution",
      value: String(summary.reviewsRequiringSolution),
    },
    {
      label: "Success streak",
      value:
        summary.currentSuccessStreak === 0
          ? "0"
          : `${summary.currentSuccessStreak}`,
    },
    {
      label: "Last review",
      value: formatOptionalDate(summary.lastReviewDate),
    },
    {
      label: "Next scheduled review",
      value: formatOptionalDate(summary.nextScheduledReview),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Learning summary</CardTitle>
        <CardDescription>
          Instant overview of how this problem has progressed over time.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SummaryGrid items={items} />
      </CardContent>
    </Card>
  );
}

function ReviewStatsCard({ stats }: { stats: ReviewDerivedStats }) {
  const items = [
    { label: "Total attempts", value: String(stats.totalAttempts) },
    { label: "Total reviews", value: String(stats.totalReviews) },
    {
      label: "Successful reviews",
      value: String(stats.successfulReviews),
    },
    { label: "Hint reviews", value: String(stats.hintReviews) },
    { label: "Solution reviews", value: String(stats.solutionReviews) },
    {
      label: "Review success rate",
      value: formatPercent(stats.reviewSuccessPercentage),
    },
    {
      label: "Days since added",
      value: formatDays(stats.daysSinceAdded),
    },
    {
      label: "Days since first independent solve",
      value: formatDays(stats.daysSinceFirstIndependentSolve),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Statistics</CardTitle>
        <CardDescription>
          Derived from your review history — nothing stored separately.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SummaryGrid items={items} />
      </CardContent>
    </Card>
  );
}

function TimelineEntryCard({
  entry,
  isLast,
}: {
  entry: ReviewHistoryEntry;
  isLast: boolean;
}) {
  const isInitial = entry.type === "INITIAL";
  const title = isInitial
    ? "Initial Attempt"
    : `Review #${entry.revisionNumber ?? "?"}`;
  const dateLabel = formatShortDate(entry.completedAt);

  return (
    <li className="relative flex gap-4 pb-8 last:pb-0">
      {!isLast ? (
        <span
          aria-hidden
          className="bg-border absolute top-3 left-[7px] h-[calc(100%-0.25rem)] w-px"
        />
      ) : null}
      <span
        aria-hidden
        className="bg-background border-foreground/40 relative z-10 mt-1.5 size-3.5 shrink-0 rounded-full border-2"
      />
      <div className="bg-card min-w-0 flex-1 rounded-xl border p-4 shadow-xs">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-medium">
            {isInitial ? "Added" : title}
          </p>
          <p className="text-muted-foreground text-xs">{dateLabel}</p>
        </div>
        {isInitial ? (
          <p className="text-muted-foreground mt-1 text-sm">{title}</p>
        ) : null}
        <div className="mt-3 space-y-1.5 text-sm">
          <p>
            <span className="mr-1.5" aria-hidden>
              {reviewResultEmoji(entry.result)}
            </span>
            {reviewResultLabel(entry.result)}
          </p>
          {!entry.autoRescheduled && entry.confidence ? (
            <p className="text-muted-foreground">
              Confidence: {confidenceLabel(entry.confidence)}
            </p>
          ) : null}
          {!entry.autoRescheduled && entry.timeTaken != null ? (
            <p className="text-muted-foreground">
              Time: {entry.timeTaken} min
            </p>
          ) : null}
          {entry.autoRescheduled && entry.nextReviewDate ? (
            <div className="border-border/70 mt-3 space-y-1 border-t pt-3">
              <p className="text-muted-foreground text-xs tracking-wide uppercase">
                Automatically Rescheduled
              </p>
              <p>
                Next Review:{" "}
                <span className="font-medium">
                  {formatShortDate(entry.nextReviewDate)}
                </span>
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function ReviewHistoryEmptyState({
  initial,
  nextScheduledReview,
}: {
  initial: ReviewHistoryEntry | null;
  nextScheduledReview: string | null;
}) {
  const nextPhrase = nextReviewPhrase(nextScheduledReview);

  return (
    <div className="space-y-4">
      {initial ? (
        <div className="bg-card rounded-xl border p-4 shadow-xs">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-medium">Initial Attempt</p>
            <p className="text-muted-foreground text-xs">
              {formatShortDate(initial.completedAt)}
            </p>
          </div>
          <p className="mt-3 text-sm">
            <span className="mr-1.5" aria-hidden>
              {reviewResultEmoji(initial.result)}
            </span>
            {reviewResultLabel(initial.result)}
          </p>
          {initial.confidence ? (
            <p className="text-muted-foreground mt-1.5 text-sm">
              Confidence: {confidenceLabel(initial.confidence)}
            </p>
          ) : null}
          {initial.timeTaken != null ? (
            <p className="text-muted-foreground mt-1.5 text-sm">
              Time: {initial.timeTaken} min
            </p>
          ) : null}
        </div>
      ) : null}
      <div className="text-muted-foreground space-y-1 text-sm">
        <p>No review sessions completed yet.</p>
        {nextPhrase ? (
          <p>Your first scheduled revision is {nextPhrase}.</p>
        ) : (
          <p>No revisions are currently scheduled for this problem.</p>
        )}
      </div>
    </div>
  );
}

interface ReviewHistorySectionProps {
  history: ReviewHistoryEntry[];
  statusLabel: string;
  nextScheduledReview: string | null;
  isLoading?: boolean;
}

export function ReviewHistorySection({
  history,
  statusLabel,
  nextScheduledReview,
  isLoading = false,
}: ReviewHistorySectionProps) {
  const summary = deriveReviewLearningSummary(history, {
    statusLabel,
    nextScheduledReview,
  });
  const stats = deriveReviewStats(history);
  const reviews = history.filter((entry) => entry.type === "REVIEW");
  const initial =
    history.find((entry) => entry.type === "INITIAL") ?? null;
  const showEmptyReviews = reviews.length === 0;

  return (
    <div className="space-y-6">
      {!isLoading && history.length > 0 ? (
        <>
          <LearningSummaryCard summary={summary} />
          <ReviewStatsCard stats={stats} />
        </>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Review History</CardTitle>
          <CardDescription>
            Your learning journey for this problem, from the day it was added.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Loading history…</p>
          ) : showEmptyReviews ? (
            <ReviewHistoryEmptyState
              initial={initial}
              nextScheduledReview={nextScheduledReview}
            />
          ) : (
            <ol className={cn("relative")}>
              {history.map((entry, index) => (
                <TimelineEntryCard
                  key={entry._id}
                  entry={entry}
                  isLast={index === history.length - 1}
                />
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
