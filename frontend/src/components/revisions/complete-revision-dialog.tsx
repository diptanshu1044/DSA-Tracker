"use client";

import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CONFIDENCE_OPTIONS,
  REVIEW_RESULT_OPTIONS,
} from "@/lib/review-history";
import { cn } from "@/lib/utils";
import type {
  ConfidenceLevel,
  MarkRevisionCompletedInput,
  ReviewResult,
} from "@/types/api";

const completeRevisionSchema = z.object({
  result: z.enum(["SELF", "HINT", "VIDEO"], {
    error: "Select how the review went",
  }),
  confidence: z.enum(["LOW", "MEDIUM", "HIGH"], {
    error: "Select your confidence",
  }),
  timeTaken: z
    .union([z.string(), z.number()])
    .optional()
    .transform((value) => {
      if (value === "" || value === null || value === undefined) {
        return undefined;
      }
      const parsed = typeof value === "number" ? value : Number(value);
      return Number.isFinite(parsed) ? parsed : Number.NaN;
    })
    .pipe(
      z
        .number()
        .min(0, "Time taken cannot be negative")
        .max(24 * 60, "Time taken cannot exceed 24 hours")
        .optional(),
    ),
});

type CompleteRevisionFormValues = z.input<typeof completeRevisionSchema>;
type CompleteRevisionPayload = z.output<typeof completeRevisionSchema>;

interface CompleteRevisionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading?: boolean;
  revisionLabel?: string;
  onConfirm: (input: MarkRevisionCompletedInput) => void;
  /** One-click retry for Needed Solution — completes + schedules tomorrow. */
  onRetryTomorrow: () => void;
}

export function CompleteRevisionDialog({
  open,
  onOpenChange,
  loading = false,
  revisionLabel,
  onConfirm,
  onRetryTomorrow,
}: CompleteRevisionDialogProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CompleteRevisionFormValues, unknown, CompleteRevisionPayload>({
    resolver: zodResolver(completeRevisionSchema),
    defaultValues: {
      result: undefined,
      confidence: undefined,
      timeTaken: "",
    },
  });

  const selectedResult = useWatch({ control, name: "result" });
  const isFailedRetry = selectedResult === "VIDEO";

  function handleOpenChange(nextOpen: boolean) {
    if (loading) return;
    if (!nextOpen) {
      reset();
      setSubmitError(null);
    }
    onOpenChange(nextOpen);
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader className="sm:place-items-start sm:text-left">
          <AlertDialogTitle>Complete revision</AlertDialogTitle>
          <AlertDialogDescription>
            {revisionLabel
              ? `Log how ${revisionLabel} went so it becomes part of your learning journey.`
              : "Log how this review went so it becomes part of your learning journey."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <form
          className="space-y-4"
          onSubmit={handleSubmit((values) => {
            if (values.result === "VIDEO") {
              setSubmitError(null);
              onRetryTomorrow();
              return;
            }
            setSubmitError(null);
            onConfirm({
              result: values.result as ReviewResult,
              confidence: values.confidence as ConfidenceLevel,
              ...(values.timeTaken !== undefined
                ? { timeTaken: values.timeTaken }
                : {}),
            });
          })}
          noValidate
        >
          <div className="space-y-2">
            <Label id="complete-result-label">Result</Label>
            <Controller
              name="result"
              control={control}
              render={({ field }) => (
                <div
                  className="flex flex-col gap-2"
                  role="radiogroup"
                  aria-labelledby="complete-result-label"
                >
                  {REVIEW_RESULT_OPTIONS.map((option) => {
                    const selected = field.value === option.value;
                    return (
                      <label
                        key={option.value}
                        className={cn(
                          "hover:bg-muted/50 flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm",
                          selected
                            ? "border-foreground/30 bg-muted/40"
                            : "border-border",
                        )}
                      >
                        <input
                          type="radio"
                          className="accent-foreground size-4"
                          name={field.name}
                          value={option.value}
                          checked={selected}
                          onChange={() => field.onChange(option.value)}
                        />
                        <span>
                          {option.emoji} {option.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            />
            {errors.result ? (
              <p role="alert" className="text-destructive text-sm">
                {errors.result.message}
              </p>
            ) : null}
          </div>

          {isFailedRetry ? (
            <div className="bg-muted/40 space-y-2 rounded-lg border px-3 py-3">
              <p className="text-sm font-medium">Review Tomorrow</p>
              <p className="text-muted-foreground text-sm">
                We&apos;ll mark this review complete and schedule the next one
                for tomorrow — no date picking needed.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label id="complete-confidence-label">Confidence</Label>
                <Controller
                  name="confidence"
                  control={control}
                  render={({ field }) => (
                    <div
                      className="flex flex-col gap-2"
                      role="radiogroup"
                      aria-labelledby="complete-confidence-label"
                    >
                      {CONFIDENCE_OPTIONS.map((option) => {
                        const selected = field.value === option.value;
                        return (
                          <label
                            key={option.value}
                            className={cn(
                              "hover:bg-muted/50 flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm",
                              selected
                                ? "border-foreground/30 bg-muted/40"
                                : "border-border",
                            )}
                          >
                            <input
                              type="radio"
                              className="accent-foreground size-4"
                              name={field.name}
                              value={option.value}
                              checked={selected}
                              onChange={() => field.onChange(option.value)}
                            />
                            <span>{option.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                />
                {errors.confidence ? (
                  <p role="alert" className="text-destructive text-sm">
                    {errors.confidence.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="complete-timeTaken">
                  Time taken{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional, minutes)
                  </span>
                </Label>
                <Input
                  id="complete-timeTaken"
                  type="number"
                  min={0}
                  max={1440}
                  placeholder="25"
                  {...register("timeTaken")}
                />
                {errors.timeTaken ? (
                  <p role="alert" className="text-destructive text-sm">
                    {errors.timeTaken.message}
                  </p>
                ) : null}
              </div>
            </>
          )}

          {submitError ? (
            <p role="alert" className="text-destructive text-sm">
              {submitError}
            </p>
          ) : null}

          <AlertDialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            {isFailedRetry ? (
              <Button
                type="button"
                disabled={loading}
                onClick={() => {
                  setSubmitError(null);
                  onRetryTomorrow();
                }}
              >
                {loading ? "Saving…" : "Review Tomorrow"}
              </Button>
            ) : (
              <Button type="submit" disabled={loading}>
                {loading ? "Saving…" : "Mark completed"}
              </Button>
            )}
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
