"use client";

import Link from "next/link";
import {
  Gauge,
  Layers3,
  RefreshCcw,
  Sparkles,
  Timer,
  Trophy,
} from "lucide-react";
import { StatCardsGrid, type StatCardItem } from "@/components/analytics/stat-cards-grid";
import type { LearningMetrics } from "@/types/api";

function formatPercent(value: number | null): string {
  if (value == null) return "—";
  return `${value}%`;
}

function formatNumber(value: number | null, suffix = ""): string {
  if (value == null) return "—";
  return `${value}${suffix}`;
}

interface LearningMetricsSectionProps {
  metrics: LearningMetrics;
}

export function LearningMetricsSection({
  metrics,
}: LearningMetricsSectionProps) {
  const items: StatCardItem[] = [
    {
      key: "firstAttemptSuccessRate",
      label: "First Attempt Success",
      value: formatPercent(metrics.firstAttemptSuccessRate),
      description: "Solved independently on first try",
      icon: Sparkles,
    },
    {
      key: "averageReviewsBeforeMastery",
      label: "Avg Reviews to Mastery",
      value: formatNumber(metrics.averageReviewsBeforeMastery),
      description: "Reviews before a problem is mastered",
      icon: RefreshCcw,
    },
    {
      key: "averageDaysToMaster",
      label: "Avg Days to Master",
      value: formatNumber(metrics.averageDaysToMaster, " days"),
      description: "Time from first log to mastery",
      icon: Timer,
    },
    {
      key: "problemsRequiringMultipleRetries",
      label: "Multiple Retries",
      value: metrics.problemsRequiringMultipleRetries,
      description: "Problems with 3+ reviews",
      icon: Layers3,
      href: "/problems?status=learning",
    },
    {
      key: "longestLearningStreak",
      label: "Longest Learning Streak",
      value: metrics.longestLearningStreak,
      description: "Longest consecutive independent solves",
      icon: Trophy,
    },
    {
      key: "fastestMastered",
      label: "Fastest Mastered",
      value: metrics.fastestMasteredProblem
        ? `${metrics.fastestMasteredProblem.daysToMaster}d`
        : "—",
      description: metrics.fastestMasteredProblem?.title ?? "No mastered problems yet",
      icon: Gauge,
      href: metrics.fastestMasteredProblem
        ? `/problems/${metrics.fastestMasteredProblem.problemId}`
        : undefined,
    },
    {
      key: "mostReviewed",
      label: "Most Reviewed",
      value: metrics.mostReviewedProblem
        ? metrics.mostReviewedProblem.reviewCount
        : "—",
      description: metrics.mostReviewedProblem?.title ?? "No reviews yet",
      icon: RefreshCcw,
      href: metrics.mostReviewedProblem
        ? `/problems/${metrics.mostReviewedProblem.problemId}`
        : undefined,
    },
  ];

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">Learning Metrics</h2>
        <p className="text-muted-foreground text-sm">
          How effectively you are learning — not just how much you have solved.
        </p>
      </div>
      <StatCardsGrid items={items} columns="sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" />
      {metrics.mostReviewedProblem ? (
        <p className="text-muted-foreground text-xs">
          Most reviewed:{" "}
          <Link
            href={`/problems/${metrics.mostReviewedProblem.problemId}`}
            className="text-foreground font-medium underline-offset-4 hover:underline"
          >
            {metrics.mostReviewedProblem.title}
          </Link>{" "}
          ({metrics.mostReviewedProblem.reviewCount} reviews)
        </p>
      ) : null}
    </section>
  );
}
