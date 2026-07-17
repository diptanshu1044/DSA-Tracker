"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { toast } from "sonner";
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
import { PageHeader } from "@/components/shared/page-header";
import { ApiError } from "@/lib/api";
import { formatShortDate, toUtcDateKey } from "@/lib/dates";
import { attemptTypeLabel } from "@/lib/revision";
import {
  defaultRepeatingStartDate,
  previewRepeatingDueDates,
  scheduleRevisionFormSchema,
  toSchedulePayload,
  type ScheduleRevisionFormValues,
} from "@/lib/validations/schedule-revision";
import { problemApi } from "@/services/problem.service";
import { revisionApi } from "@/services/revision.service";
import type { Problem } from "@/types/api";
import { cn } from "@/lib/utils";

const SEARCH_DEBOUNCE_MS = 300;

function fieldErrorMessage(error: unknown): string | undefined {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return undefined;
}

function problemLabel(problem: Problem): string {
  const id = problem.problemId?.trim();
  return id ? `#${id} · ${problem.title}` : problem.title;
}

export function ScheduleRevisionForm() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [search]);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
    setError,
  } = useForm<ScheduleRevisionFormValues>({
    resolver: zodResolver(scheduleRevisionFormSchema),
    defaultValues: {
      mode: "once",
      problemId: "",
      dueDate: toUtcDateKey(),
      intervalDays: 7,
      times: 5,
      startDate: defaultRepeatingStartDate(7),
    },
  });

  const mode = useWatch({ control, name: "mode" });
  const intervalDays = useWatch({ control, name: "intervalDays" });
  const times = useWatch({ control, name: "times" });
  const startDate = useWatch({ control, name: "startDate" });

  const searchQuery = useQuery({
    queryKey: ["problems", "schedule-search", debouncedSearch],
    queryFn: async () => {
      const result = await problemApi.list({
        search: debouncedSearch,
        limit: 8,
      });
      return result.problems;
    },
    enabled: debouncedSearch.length >= 1 && !selectedProblem,
  });

  const previewDates = useMemo(() => {
    if (mode !== "repeating") return [];
    const interval = Number(intervalDays);
    const count = Number(times);
    if (!startDate || !Number.isFinite(interval) || !Number.isFinite(count)) {
      return [];
    }
    return previewRepeatingDueDates(startDate, interval, count);
  }, [mode, intervalDays, times, startDate]);

  const mutation = useMutation({
    mutationFn: revisionApi.schedule,
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["revisions"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["problems"] }),
        queryClient.invalidateQueries({ queryKey: ["analytics"] }),
      ]);
      const count = result.revisions.length;
      toast.success(
        count === 1 ? "Revision scheduled" : `${count} revisions scheduled`,
      );
      router.push("/revisions");
    },
    onError: (error: Error) => {
      const message =
        error instanceof ApiError
          ? error.message
          : "Could not schedule revision";
      setError("root", { message });
      toast.error(message);
    },
  });

  function selectProblem(problem: Problem) {
    setSelectedProblem(problem);
    setValue("problemId", problem._id, { shouldValidate: true });
    setSearch("");
    setDebouncedSearch("");
  }

  function clearProblem() {
    setSelectedProblem(null);
    setValue("problemId", "", { shouldValidate: true });
  }

  function switchMode(next: "once" | "repeating") {
    setValue("mode", next);
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader
        title="Schedule Revision"
        description="Find a problem you already logged, then schedule a one-time review or a repeating series."
      />

      <Card>
        <CardHeader>
          <CardTitle>Revision details</CardTitle>
          <CardDescription>
            Search by LeetCode id (e.g. 1) or question name.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-5"
            onSubmit={handleSubmit((values) =>
              mutation.mutate(toSchedulePayload(values)),
            )}
            noValidate
          >
            <div className="space-y-2">
              <Label htmlFor="problem-search">Problem</Label>
              {selectedProblem ? (
                <div className="border-border flex items-start justify-between gap-3 rounded-lg border px-3 py-2.5">
                  <div className="min-w-0 space-y-0.5">
                    <p className="truncate text-sm font-medium">
                      {problemLabel(selectedProblem)}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {attemptTypeLabel(selectedProblem.attemptType)}
                      {selectedProblem.difficulty
                        ? ` · ${selectedProblem.difficulty}`
                        : ""}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0"
                    onClick={clearProblem}
                    aria-label="Clear selected problem"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search
                      className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                      aria-hidden
                    />
                    <Input
                      id="problem-search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search by id or name…"
                      autoComplete="off"
                      className="pl-9"
                      aria-invalid={Boolean(errors.problemId)}
                      aria-describedby={
                        errors.problemId ? "problemId-error" : undefined
                      }
                    />
                  </div>
                  {debouncedSearch.length >= 1 ? (
                    <div className="border-border max-h-56 overflow-y-auto rounded-lg border">
                      {searchQuery.isLoading ? (
                        <p className="text-muted-foreground px-3 py-2 text-sm">
                          Searching…
                        </p>
                      ) : searchQuery.isError ? (
                        <p className="text-destructive px-3 py-2 text-sm">
                          {searchQuery.error instanceof ApiError
                            ? searchQuery.error.message
                            : "Could not search problems."}
                        </p>
                      ) : (searchQuery.data?.length ?? 0) === 0 ? (
                        <p className="text-muted-foreground px-3 py-2 text-sm">
                          No problems match “{debouncedSearch}”.
                        </p>
                      ) : (
                        <ul role="listbox" aria-label="Matching problems">
                          {searchQuery.data!.map((problem) => (
                            <li key={problem._id}>
                              <button
                                type="button"
                                role="option"
                                className="hover:bg-muted/60 flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm transition-colors"
                                onClick={() => selectProblem(problem)}
                              >
                                <span className="font-medium">
                                  {problemLabel(problem)}
                                </span>
                                <span className="text-muted-foreground text-xs">
                                  {attemptTypeLabel(problem.attemptType)}
                                  {problem.difficulty
                                    ? ` · ${problem.difficulty}`
                                    : ""}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : null}
                </div>
              )}
              {fieldErrorMessage(errors.problemId) ? (
                <p
                  id="problemId-error"
                  role="alert"
                  className="text-destructive text-sm"
                >
                  {fieldErrorMessage(errors.problemId)}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label id="mode-label">Schedule type</Label>
              <div
                className="grid grid-cols-2 gap-2"
                role="radiogroup"
                aria-labelledby="mode-label"
              >
                {(
                  [
                    { value: "once" as const, label: "Specific day" },
                    { value: "repeating" as const, label: "Repeating" },
                  ] as const
                ).map((option) => {
                  const selected = mode === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-sm transition-colors",
                        selected
                          ? "border-foreground/20 bg-muted"
                          : "hover:bg-muted/60",
                      )}
                      onClick={() => switchMode(option.value)}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {mode === "once" ? (
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  aria-invalid={Boolean(errors.dueDate)}
                  aria-describedby={
                    errors.dueDate ? "dueDate-error" : undefined
                  }
                  {...register("dueDate")}
                />
                {fieldErrorMessage(errors.dueDate) ? (
                  <p
                    id="dueDate-error"
                    role="alert"
                    className="text-destructive text-sm"
                  >
                    {fieldErrorMessage(errors.dueDate)}
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="times">Times</Label>
                    <Input
                      id="times"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={20}
                      step={1}
                      aria-invalid={Boolean(errors.times)}
                      {...register("times")}
                    />
                    {fieldErrorMessage(errors.times) ? (
                      <p role="alert" className="text-destructive text-sm">
                        {fieldErrorMessage(errors.times)}
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="intervalDays">Every (days)</Label>
                    <Input
                      id="intervalDays"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={365}
                      step={1}
                      aria-invalid={Boolean(errors.intervalDays)}
                      {...register("intervalDays", {
                        onChange: (event) => {
                          const next = Number(event.target.value);
                          if (Number.isFinite(next) && next >= 1) {
                            setValue(
                              "startDate",
                              defaultRepeatingStartDate(next),
                              { shouldValidate: true },
                            );
                          }
                        },
                      })}
                    />
                    {fieldErrorMessage(errors.intervalDays) ? (
                      <p role="alert" className="text-destructive text-sm">
                        {fieldErrorMessage(errors.intervalDays)}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="startDate">First due date</Label>
                  <Controller
                    name="startDate"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="startDate"
                        type="date"
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        aria-invalid={Boolean(errors.startDate)}
                      />
                    )}
                  />
                  {fieldErrorMessage(errors.startDate) ? (
                    <p role="alert" className="text-destructive text-sm">
                      {fieldErrorMessage(errors.startDate)}
                    </p>
                  ) : null}
                </div>

                {previewDates.length > 0 ? (
                  <div className="bg-muted/40 rounded-lg px-3 py-2.5 text-sm">
                    <p className="text-muted-foreground mb-1.5 text-xs font-medium tracking-wide uppercase">
                      Preview · {previewDates.length} review
                      {previewDates.length === 1 ? "" : "s"}
                    </p>
                    <p className="text-pretty">
                      {previewDates.map(formatShortDate).join(" · ")}
                    </p>
                  </div>
                ) : null}
              </div>
            )}

            {fieldErrorMessage(errors.root) ? (
              <p role="alert" className="text-destructive text-sm">
                {fieldErrorMessage(errors.root)}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2 pt-1">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Scheduling..." : "Schedule"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={mutation.isPending}
                render={<Link href="/revisions" />}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
