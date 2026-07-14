"use client";

import Link from "next/link";
import { Check, ExternalLink, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDueLabel } from "@/lib/dates";
import { attemptTypeLabel, getRevisionProblem } from "@/lib/revision";
import type { Revision } from "@/types/api";

interface RevisionCardProps {
  revision: Revision;
  overdue: boolean;
  isCompleting?: boolean;
  onMarkCompleted: (id: string) => void;
}

export function RevisionCard({
  revision,
  overdue,
  isCompleting = false,
  onMarkCompleted,
}: RevisionCardProps) {
  const problem = getRevisionProblem(revision);
  const title = problem?.title ?? "Deleted problem";
  const url = problem?.url;
  const attemptType = problem?.attemptType;
  const problemId = problem?._id;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle className="text-base leading-snug">
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary inline-flex items-start gap-1.5"
              >
                <span>{title}</span>
                <ExternalLink className="mt-0.5 size-3.5 shrink-0 opacity-60" />
              </a>
            ) : (
              title
            )}
          </CardTitle>
          <Badge variant={overdue ? "destructive" : "secondary"}>
            {formatDueLabel(revision.dueDate, overdue)}
          </Badge>
        </div>
        <p className="text-muted-foreground text-xs">
          Revision #{revision.revisionNumber}
          {attemptType ? ` · ${attemptTypeLabel(attemptType)}` : null}
        </p>
      </CardHeader>
      <CardContent className="pb-3">
        {problemId ? (
          <Link
            href={`/problems/${problemId}`}
            className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 hover:underline"
          >
            View problem &amp; history
          </Link>
        ) : null}
      </CardContent>
      <CardFooter>
        <Button
          type="button"
          size="sm"
          disabled={isCompleting || revision.completed}
          onClick={() => onMarkCompleted(revision._id)}
        >
          {isCompleting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Check className="size-4" />
          )}
          Mark Completed
        </Button>
      </CardFooter>
    </Card>
  );
}
