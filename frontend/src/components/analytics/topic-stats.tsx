"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import type { TopicStat } from "@/types/api";

type TopicSort = "active" | "problems" | "success";

interface TopicStatsSectionProps {
  topics: TopicStat[];
}

export function TopicStatsSection({ topics }: TopicStatsSectionProps) {
  const [sort, setSort] = useState<TopicSort>("active");

  const sorted = useMemo(() => {
    const copy = [...topics];
    copy.sort((a, b) => {
      if (sort === "problems") return b.problemsAdded - a.problemsAdded;
      if (sort === "success") {
        return (b.successRate ?? -1) - (a.successRate ?? -1);
      }
      if (b.activeProblems !== a.activeProblems) {
        return b.activeProblems - a.activeProblems;
      }
      return b.problemsAdded - a.problemsAdded;
    });
    return copy;
  }, [topics, sort]);

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">Topic Statistics</h2>
          <p className="text-muted-foreground text-sm">
            Topic-wise progress across mastery, learning, and reviews.
          </p>
        </div>
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Sort topics"
        >
          {(
            [
              { value: "active", label: "Active" },
              { value: "problems", label: "Problems" },
              { value: "success", label: "Success" },
            ] as const
          ).map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={sort === option.value ? "secondary" : "outline"}
              aria-pressed={sort === option.value}
              onClick={() => setSort(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          title="No topics yet"
          description="Topics appear once problem metadata is fetched from LeetCode."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sorted.map((topic) => (
            <Card key={topic.topic} size="sm">
              <CardHeader>
                <CardTitle className="text-base">
                  <Link
                    href={`/problems?topic=${encodeURIComponent(topic.topic)}`}
                    className="hover:text-primary underline-offset-4 hover:underline"
                  >
                    {topic.topic}
                  </Link>
                </CardTitle>
                <CardDescription>
                  {topic.problemsAdded} added ·{" "}
                  {topic.successRate == null
                    ? "No reviews yet"
                    : `${topic.successRate}% success`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Mastered</dt>
                    <dd className="tabular-nums font-medium">{topic.mastered}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Learning</dt>
                    <dd className="tabular-nums font-medium">{topic.learning}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Need Review</dt>
                    <dd className="tabular-nums font-medium">
                      {topic.needReview}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Overdue</dt>
                    <dd className="tabular-nums font-medium">
                      {topic.overdue + topic.forgotten}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">New</dt>
                    <dd className="tabular-nums font-medium">
                      {topic.newProblems}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Success</dt>
                    <dd className="tabular-nums font-medium">
                      {topic.successRate == null ? "—" : `${topic.successRate}%`}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
