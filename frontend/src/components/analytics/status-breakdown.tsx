"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import type { StatusBreakdown } from "@/types/api";

function ChartFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative h-72 w-full min-h-0 shrink-0">
      <div className="absolute inset-0">{children}</div>
    </div>
  );
}

const STATUS_CONFIG = [
  {
    key: "mastered" as const,
    label: "Mastered",
    color: "var(--chart-1)",
    href: "/problems?status=mastered",
  },
  {
    key: "learning" as const,
    label: "Learning",
    color: "var(--chart-2)",
    href: "/problems?status=learning",
  },
  {
    key: "needReview" as const,
    label: "Need Review",
    color: "var(--chart-3)",
    href: "/revisions",
  },
  {
    key: "overdue" as const,
    label: "Overdue",
    color: "var(--chart-4)",
    href: "/problems?status=overdue",
  },
  {
    key: "newProblems" as const,
    label: "New",
    color: "var(--chart-5)",
    href: "/problems?status=new",
  },
  {
    key: "forgotten" as const,
    label: "Forgotten",
    color: "hsl(0 72% 51%)",
    href: "/problems?status=forgotten",
  },
];

interface StatusBreakdownSectionProps {
  breakdown: StatusBreakdown;
}

export function StatusBreakdownSection({
  breakdown,
}: StatusBreakdownSectionProps) {
  const data = STATUS_CONFIG.map((item) => ({
    ...item,
    value: breakdown[item.key],
  })).filter((item) => item.value > 0);

  const total = STATUS_CONFIG.reduce(
    (sum, item) => sum + breakdown[item.key],
    0,
  );

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">Problem Status</h2>
        <p className="text-muted-foreground text-sm">
          How your problems are distributed across learning stages.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Status mix</CardTitle>
            <CardDescription>{total} total problems</CardDescription>
          </CardHeader>
          <CardContent>
            {total === 0 ? (
              <EmptyState
                title="No problems yet"
                description="Log problems to see your status breakdown."
                className="h-72 border-0 py-8"
              />
            ) : (
              <ChartFrame>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data}
                      dataKey="value"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={88}
                      paddingAngle={2}
                    >
                      {data.map((entry) => (
                        <Cell key={entry.key} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [Number(value ?? 0), "Problems"]}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ChartFrame>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Breakdown</CardTitle>
            <CardDescription>Counts by learning status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {STATUS_CONFIG.map((item) => {
              const value = breakdown[item.key];
              const percent =
                total === 0 ? 0 : Math.round((value / total) * 100);
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className="hover:bg-muted/50 block space-y-1.5 rounded-lg p-2 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2 font-medium">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: item.color }}
                        aria-hidden
                      />
                      {item.label}
                    </span>
                    <span className="text-muted-foreground tabular-nums">
                      {value} · {percent}%
                    </span>
                  </div>
                  <div className="bg-muted h-2 overflow-hidden rounded-full">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${percent}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
