"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface StatCardItem {
  key: string;
  label: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  href?: string;
  emphasize?: boolean;
  tone?: "default" | "danger" | "warning" | "success";
}

interface StatCardsGridProps {
  items: StatCardItem[];
  columns?: string;
  className?: string;
}

const toneClass: Record<NonNullable<StatCardItem["tone"]>, string> = {
  default: "",
  danger: "text-destructive",
  warning: "text-amber-700 dark:text-amber-400",
  success: "text-emerald-700 dark:text-emerald-400",
};

export function StatCardsGrid({
  items,
  columns = "sm:grid-cols-2 xl:grid-cols-4",
  className,
}: StatCardsGridProps) {
  return (
    <div className={cn("grid gap-4", columns, className)}>
      {items.map((item) => {
        const Icon = item.icon;
        const content = (
          <Card
            size="sm"
            className={cn(
              item.href &&
                "transition-colors hover:border-foreground/20 hover:bg-muted/40",
              item.emphasize && "border-primary/40 bg-primary/5",
            )}
          >
            <CardHeader className="flex flex-row items-start justify-between gap-2">
              <div className="space-y-1">
                <CardDescription>{item.label}</CardDescription>
                <CardTitle
                  className={cn(
                    "text-3xl font-semibold tracking-tight",
                    toneClass[item.tone ?? "default"],
                  )}
                >
                  {item.value}
                </CardTitle>
              </div>
              {Icon ? (
                <div className="bg-muted text-muted-foreground flex size-9 items-center justify-center rounded-lg">
                  <Icon className="size-4" />
                </div>
              ) : null}
            </CardHeader>
            {item.description ? (
              <CardContent>
                <p className="text-muted-foreground text-xs">
                  {item.description}
                </p>
              </CardContent>
            ) : null}
          </Card>
        );

        if (!item.href) {
          return <div key={item.key}>{content}</div>;
        }

        return (
          <Link
            key={item.key}
            href={item.href}
            className="block rounded-xl focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none"
          >
            {content}
          </Link>
        );
      })}
    </div>
  );
}
