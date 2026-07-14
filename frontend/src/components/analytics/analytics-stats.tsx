"use client";

import {
  BookPlus,
  HandHelping,
  ListTodo,
  UserCheck,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AnalyticsSummary } from "@/types/api";
import { PENDING_REVISION_LIMIT } from "@/types/api";

const statCards = [
  {
    key: "problemsAdded" as const,
    label: "Problems Added",
    description: "Total problems logged",
    icon: BookPlus,
  },
  {
    key: "solvedMyself" as const,
    label: "Solved Myself",
    description: "Solved without help (SELF)",
    icon: UserCheck,
  },
  {
    key: "neededHelp" as const,
    label: "Needed Help",
    description: "Used a hint or video",
    icon: HandHelping,
  },
  {
    key: "pendingRevisions" as const,
    label: "Pending Revisions",
    description: "Incomplete review sessions",
    icon: ListTodo,
  },
];

interface AnalyticsStatsProps {
  summary: AnalyticsSummary;
}

export function AnalyticsStats({ summary }: AnalyticsStatsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {statCards.map((card) => {
        const Icon = card.icon;
        const value = summary[card.key];
        const highlight =
          card.key === "pendingRevisions" && value > PENDING_REVISION_LIMIT
            ? "text-amber-700 dark:text-amber-400"
            : "";

        return (
          <Card key={card.key} size="sm">
            <CardHeader className="flex flex-row items-start justify-between gap-2">
              <div className="space-y-1">
                <CardDescription>{card.label}</CardDescription>
                <CardTitle
                  className={`text-3xl font-semibold tracking-tight ${highlight}`}
                >
                  {value}
                </CardTitle>
              </div>
              <div className="bg-muted text-muted-foreground flex size-9 items-center justify-center rounded-lg">
                <Icon className="size-4" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-xs">{card.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
