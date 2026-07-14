"use client";

import {
  AlertTriangle,
  BookOpen,
  CalendarCheck,
  Flame,
  RefreshCw,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { StatCardsGrid, type StatCardItem } from "@/components/analytics/stat-cards-grid";
import type { ActionableStats } from "@/types/api";

interface ActionableStatsSectionProps {
  actionable: ActionableStats;
}

export function ActionableStatsSection({
  actionable,
}: ActionableStatsSectionProps) {
  const items: StatCardItem[] = [
    {
      key: "overdue",
      label: "🔥 Overdue Problems",
      value: actionable.overdue,
      description: "Past due and need attention",
      icon: Flame,
      href: "/problems?status=overdue",
      emphasize: actionable.overdue > 0,
      tone: actionable.overdue > 0 ? "danger" : "default",
    },
    {
      key: "dueToday",
      label: "📅 Reviews Due Today",
      value: actionable.dueToday,
      description: "Scheduled for today",
      icon: CalendarCheck,
      href: "/revisions",
      emphasize: actionable.dueToday > 0,
      tone: actionable.dueToday > 0 ? "warning" : "default",
    },
    {
      key: "learning",
      label: "📚 Currently Learning",
      value: actionable.learning,
      description: "Active revision cycles",
      icon: BookOpen,
      href: "/problems?status=learning",
    },
    {
      key: "mastered",
      label: "✅ Mastered Problems",
      value: actionable.mastered,
      description: "Completed or independent solves",
      icon: Target,
      href: "/problems?status=mastered",
      tone: "success",
    },
    {
      key: "newProblems",
      label: "🆕 New Problems",
      value: actionable.newProblems,
      description: "Logged but never reviewed",
      icon: Sparkles,
      href: "/problems?status=new",
    },
    {
      key: "scheduledReviews",
      label: "🔄 Scheduled Reviews",
      value: actionable.scheduledReviews,
      description: "Upcoming incomplete revisions",
      icon: RefreshCw,
      href: "/revisions",
    },
    {
      key: "forgotten",
      label: "⚠️ Forgotten Problems",
      value: actionable.forgotten,
      description: "Overdue for 7+ days",
      icon: AlertTriangle,
      href: "/problems?status=forgotten",
      emphasize: actionable.forgotten > 0,
      tone: actionable.forgotten > 0 ? "danger" : "default",
    },
    {
      key: "weakestTopic",
      label: "📈 Weakest Topic",
      value: actionable.weakestTopic ?? "—",
      description: "Needs the most practice",
      icon: TrendingDown,
      href: actionable.weakestTopic
        ? `/problems?topic=${encodeURIComponent(actionable.weakestTopic)}`
        : undefined,
    },
    {
      key: "strongestTopic",
      label: "🎯 Strongest Topic",
      value: actionable.strongestTopic ?? "—",
      description: "Your best topic so far",
      icon: TrendingUp,
      href: actionable.strongestTopic
        ? `/problems?topic=${encodeURIComponent(actionable.strongestTopic)}`
        : undefined,
      tone: "success",
    },
  ];

  return (
    <section className="space-y-4 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">Current Status</h2>
        <p className="text-muted-foreground text-sm">
          What needs attention today — click a card to jump into the work.
        </p>
      </div>
      <StatCardsGrid items={items} columns="sm:grid-cols-2 lg:grid-cols-3" />
    </section>
  );
}
