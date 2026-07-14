"use client";

import {
  BookPlus,
  CalendarDays,
  Clock3,
  Flame,
  HandHelping,
  Lightbulb,
  ListChecks,
  Percent,
  Trophy,
  UserCheck,
  Video,
} from "lucide-react";
import { StatCardsGrid, type StatCardItem } from "@/components/analytics/stat-cards-grid";
import type { AnalyticsSummary } from "@/types/api";

function formatMinutes(value: number | null): string {
  if (value == null) return "—";
  return `${value} min`;
}

function formatPercent(value: number | null): string {
  if (value == null) return "—";
  return `${value}%`;
}

function formatDays(value: number): string {
  return value === 1 ? "1 day" : `${value} days`;
}

interface OverallProgressProps {
  summary: AnalyticsSummary;
}

export function OverallProgress({ summary }: OverallProgressProps) {
  const items: StatCardItem[] = [
    {
      key: "problemsAdded",
      label: "Problems Added",
      value: summary.problemsAdded,
      description: "Total problems logged",
      icon: BookPlus,
      href: "/problems",
    },
    {
      key: "problemsSolved",
      label: "Problems Solved",
      value: summary.problemsSolved,
      description: "Problems you have attempted",
      icon: ListChecks,
      href: "/problems",
    },
    {
      key: "solvedWithoutHelp",
      label: "Solved Without Help",
      value: summary.solvedWithoutHelp,
      description: "Solved independently (SELF)",
      icon: UserCheck,
      href: "/problems?attemptType=SELF",
    },
    {
      key: "solvedUsingHint",
      label: "Needed Hint",
      value: summary.solvedUsingHint,
      description: "Solved with a hint",
      icon: Lightbulb,
      href: "/problems?attemptType=HINT",
    },
    {
      key: "solvedUsingSolution",
      label: "Needed Solution",
      value: summary.solvedUsingSolution,
      description: "Used a full solution",
      icon: Video,
      href: "/problems?attemptType=VIDEO",
    },
    {
      key: "neededHelp",
      label: "Needed Help",
      value: summary.neededHelp,
      description: "Hint or solution combined",
      icon: HandHelping,
      href: "/problems",
    },
    {
      key: "reviewsCompleted",
      label: "Reviews Completed",
      value: summary.reviewsCompleted,
      description: "Total revision sessions finished",
      icon: ListChecks,
      href: "/revisions",
    },
    {
      key: "currentStreak",
      label: "Current Streak",
      value: formatDays(summary.currentStreak),
      description: "Consecutive study days",
      icon: Flame,
    },
    {
      key: "longestStreak",
      label: "Longest Streak",
      value: formatDays(summary.longestStreak),
      description: "Best consecutive study run",
      icon: Trophy,
    },
    {
      key: "totalStudyDays",
      label: "Total Study Days",
      value: summary.totalStudyDays,
      description: "Days with any learning activity",
      icon: CalendarDays,
    },
    {
      key: "averageSolveTime",
      label: "Average Solve Time",
      value: formatMinutes(summary.averageSolveTime),
      description: "Mean time on initial solves",
      icon: Clock3,
    },
    {
      key: "averageReviewTime",
      label: "Average Review Time",
      value: formatMinutes(summary.averageReviewTime),
      description: "Mean time on reviews",
      icon: Clock3,
    },
    {
      key: "reviewSuccessRate",
      label: "Review Success Rate",
      value: formatPercent(summary.reviewSuccessRate),
      description: "Reviews completed without help",
      icon: Percent,
    },
  ];

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">Overall Progress</h2>
        <p className="text-muted-foreground text-sm">
          Long-term achievements that track how far you have come.
        </p>
      </div>
      <StatCardsGrid items={items} columns="sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" />
    </section>
  );
}
