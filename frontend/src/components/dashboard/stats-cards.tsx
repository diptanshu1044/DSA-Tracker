"use client";

import {
  BookPlus,
  CalendarPlus,
  CircleAlert,
  ListTodo,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DashboardStats } from "@/types/api";

const statCards = [
  {
    key: "problemsAdded" as const,
    label: "Problems Added",
    description: "Total problems logged",
    icon: BookPlus,
  },
  {
    key: "pendingRevisions" as const,
    label: "Pending Revisions",
    description: "Incomplete review sessions",
    icon: ListTodo,
  },
  {
    key: "overdue" as const,
    label: "Overdue",
    description: "Past due and not done",
    icon: CircleAlert,
  },
  {
    key: "addedToday" as const,
    label: "Added Today",
    description: "Problems logged today",
    icon: CalendarPlus,
  },
];

interface StatsCardsProps {
  stats: DashboardStats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {statCards.map((card) => {
        const Icon = card.icon;
        const value = stats[card.key];
        const highlight =
          card.key === "overdue" && value > 0 ? "text-destructive" : "";

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
