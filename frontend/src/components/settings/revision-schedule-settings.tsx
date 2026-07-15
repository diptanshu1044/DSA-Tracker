"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import type { AttemptType, RevisionIntervals } from "@/types/api";
import {
  ATTEMPT_REVISION_LABELS,
  DEFAULT_REVISION_INTERVALS,
  MAX_REVISION_INTERVALS,
  formatRevisionSchedule,
  normalizeRevisionIntervals,
  revisionIntervalsSchema,
} from "@/lib/validations/revision-intervals";
import { useAuth } from "@/providers/auth-provider";
import { authApi } from "@/services/auth.service";

const ATTEMPT_ORDER: AttemptType[] = ["SELF", "HINT", "VIDEO"];

function intervalsEqual(
  a: RevisionIntervals,
  b: RevisionIntervals,
): boolean {
  return ATTEMPT_ORDER.every(
    (key) =>
      a[key].length === b[key].length &&
      a[key].every((day, index) => day === b[key][index]),
  );
}

export function RevisionScheduleSettings() {
  const { user, setUser } = useAuth();
  const saved = normalizeRevisionIntervals(user?.revisionIntervals);
  const [draft, setDraft] = useState<RevisionIntervals>(saved);
  const [fieldErrors, setFieldErrors] = useState<Partial<
    Record<AttemptType, string>
  >>({});

  const savedKey = JSON.stringify(saved);

  useEffect(() => {
    setDraft(JSON.parse(savedKey) as RevisionIntervals);
    setFieldErrors({});
  }, [savedKey]);

  const isDirty = !intervalsEqual(draft, saved);

  const mutation = useMutation({
    mutationFn: (revisionIntervals: RevisionIntervals) =>
      authApi.updateProfile({ revisionIntervals }),
    onSuccess: (data) => {
      setUser(data.user);
      setDraft(normalizeRevisionIntervals(data.user.revisionIntervals));
      setFieldErrors({});
      toast.success("Revision schedule updated");
    },
    onError: (error: Error) => {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Could not update revision schedule",
      );
    },
  });

  function updateDay(
    attemptType: AttemptType,
    index: number,
    raw: string,
  ): void {
    const parsed = raw === "" ? Number.NaN : Number(raw);
    setDraft((prev) => {
      const next = [...prev[attemptType]];
      next[index] = parsed;
      return { ...prev, [attemptType]: next };
    });
  }

  function addRevision(attemptType: AttemptType): void {
    setDraft((prev) => {
      if (prev[attemptType].length >= MAX_REVISION_INTERVALS) {
        return prev;
      }
      const last = prev[attemptType][prev[attemptType].length - 1] ?? 0;
      return {
        ...prev,
        [attemptType]: [...prev[attemptType], last + 1],
      };
    });
  }

  function removeRevision(attemptType: AttemptType, index: number): void {
    setDraft((prev) => ({
      ...prev,
      [attemptType]: prev[attemptType].filter((_, i) => i !== index),
    }));
  }

  function resetToDefaults(): void {
    setDraft({
      SELF: [...DEFAULT_REVISION_INTERVALS.SELF],
      HINT: [...DEFAULT_REVISION_INTERVALS.HINT],
      VIDEO: [...DEFAULT_REVISION_INTERVALS.VIDEO],
    });
    setFieldErrors({});
  }

  function handleSave(): void {
    const normalized: RevisionIntervals = {
      SELF: [...draft.SELF].sort((a, b) => a - b),
      HINT: [...draft.HINT].sort((a, b) => a - b),
      VIDEO: [...draft.VIDEO].sort((a, b) => a - b),
    };

    const parsed = revisionIntervalsSchema.safeParse(normalized);
    if (!parsed.success) {
      const nextErrors: Partial<Record<AttemptType, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (key === "SELF" || key === "HINT" || key === "VIDEO") {
          nextErrors[key] ??= issue.message;
        }
      }
      setFieldErrors(nextErrors);
      toast.error("Fix the revision schedule before saving");
      return;
    }

    setFieldErrors({});
    mutation.mutate(parsed.data);
  }

  if (!user) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revision schedule</CardTitle>
        <CardDescription>
          Choose how many follow-up revisions (0–{MAX_REVISION_INTERVALS}) to
          schedule for each solve type, and after how many days. Changes apply
          only to newly added problems — existing revisions stay as-is.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {ATTEMPT_ORDER.map((attemptType) => {
          const days = draft[attemptType];
          return (
            <div key={attemptType} className="space-y-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <Label>{ATTEMPT_REVISION_LABELS[attemptType]}</Label>
                  <p className="text-muted-foreground text-xs">
                    {formatRevisionSchedule(
                      days.filter((day) => Number.isFinite(day) && day > 0),
                    )}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={days.length >= MAX_REVISION_INTERVALS}
                  onClick={() => addRevision(attemptType)}
                >
                  <Plus className="size-3.5" />
                  Add revision
                </Button>
              </div>

              {days.length === 0 ? (
                <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-2 text-sm">
                  No revisions scheduled for this type.
                </p>
              ) : (
                <ul className="space-y-2">
                  {days.map((day, index) => (
                    <li
                      key={`${attemptType}-${index}`}
                      className="flex items-center gap-2"
                    >
                      <span className="text-muted-foreground w-20 shrink-0 text-sm">
                        Revision {index + 1}
                      </span>
                      <Input
                        type="number"
                        min={1}
                        max={365}
                        inputMode="numeric"
                        className="max-w-28"
                        value={Number.isFinite(day) ? day : ""}
                        aria-label={`${ATTEMPT_REVISION_LABELS[attemptType]} revision ${index + 1} day offset`}
                        onChange={(event) =>
                          updateDay(attemptType, index, event.target.value)
                        }
                      />
                      <span className="text-muted-foreground text-sm">
                        day{day === 1 ? "" : "s"} after adding
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Remove revision ${index + 1}`}
                        onClick={() => removeRevision(attemptType, index)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}

              {fieldErrors[attemptType] ? (
                <p role="alert" className="text-destructive text-sm">
                  {fieldErrors[attemptType]}
                </p>
              ) : null}
            </div>
          );
        })}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={!isDirty || mutation.isPending}
            onClick={handleSave}
          >
            {mutation.isPending ? "Saving…" : "Save schedule"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={mutation.isPending}
            onClick={resetToDefaults}
          >
            <RotateCcw className="size-3.5" />
            Reset defaults
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
