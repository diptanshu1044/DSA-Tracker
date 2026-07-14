"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ExternalLink, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ApiError } from "@/lib/api";
import { formatShortDate, isOverdue } from "@/lib/dates";
import { attemptTypeLabel } from "@/lib/revision";
import { cn } from "@/lib/utils";
import {
  ATTEMPT_TYPE_OPTIONS,
  updateProblemSchema,
  type UpdateProblemFormValues,
  type UpdateProblemPayload,
} from "@/lib/validations/problem";
import { problemApi } from "@/services/problem.service";
import { revisionApi } from "@/services/revision.service";
import type { AttemptType, Problem, Revision } from "@/types/api";

function ProblemDetailsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-32" />
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-56 w-full rounded-xl" />
    </div>
  );
}

function revisionStatus(revision: Revision): {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
} {
  if (revision.completed) {
    return { label: "Completed", variant: "secondary" };
  }
  if (isOverdue(revision.dueDate)) {
    return { label: "Overdue", variant: "destructive" };
  }
  return { label: "Pending", variant: "outline" };
}

function problemStatus(revisions: Revision[]): {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
} {
  if (revisions.length === 0) {
    return { label: "No revisions", variant: "secondary" };
  }

  const incomplete = revisions.filter((revision) => !revision.completed);
  if (incomplete.length === 0) {
    return { label: "Completed", variant: "secondary" };
  }
  if (incomplete.some((revision) => isOverdue(revision.dueDate))) {
    return { label: "Overdue", variant: "destructive" };
  }
  return { label: "In progress", variant: "outline" };
}

function RevisionList({
  revisions,
  emptyMessage,
}: {
  revisions: Revision[];
  emptyMessage: string;
}) {
  if (revisions.length === 0) {
    return <EmptyState title={emptyMessage} className="border-0 py-8" />;
  }

  return (
    <ul className="divide-border divide-y">
      {revisions.map((revision) => {
        const status = revisionStatus(revision);
        return (
          <li
            key={revision._id}
            className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="space-y-1">
              <p className="font-medium">
                Revision #{revision.revisionNumber}
              </p>
              <p className="text-muted-foreground text-xs">
                Due {formatShortDate(revision.dueDate)}
                {revision.completed && revision.completedAt
                  ? ` · Completed ${formatShortDate(revision.completedAt)}`
                  : null}
              </p>
            </div>
            <Badge variant={status.variant}>{status.label}</Badge>
          </li>
        );
      })}
    </ul>
  );
}

function EditProblemForm({
  problem,
  onCancel,
  onSaved,
}: {
  problem: Problem;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const queryClient = useQueryClient();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isDirty },
    setError,
  } = useForm<UpdateProblemFormValues, unknown, UpdateProblemPayload>({
    resolver: zodResolver(updateProblemSchema),
    defaultValues: {
      title: problem.title,
      url: problem.url,
      attemptType: problem.attemptType,
      timeTaken: problem.timeTaken ?? "",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: UpdateProblemPayload) =>
      problemApi.update(problem._id, {
        ...(values.title !== undefined ? { title: values.title } : {}),
        ...(values.url !== undefined ? { url: values.url } : {}),
        ...(values.attemptType !== undefined
          ? { attemptType: values.attemptType }
          : {}),
        timeTaken:
          values.timeTaken === undefined ? null : (values.timeTaken ?? null),
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["problems"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["revisions"] }),
        queryClient.invalidateQueries({ queryKey: ["analytics"] }),
      ]);
      toast.success("Problem updated");
      onSaved();
    },
    onError: (error: Error) => {
      const message =
        error instanceof ApiError ? error.message : "Could not update problem";
      setError("root", { message });
      toast.error(message);
    },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      noValidate
    >
      <div className="space-y-2">
        <Label htmlFor="edit-title">Problem name</Label>
        <Input
          id="edit-title"
          aria-invalid={Boolean(errors.title)}
          {...register("title")}
        />
        {errors.title ? (
          <p role="alert" className="text-destructive text-sm">
            {errors.title.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-url">LeetCode URL</Label>
        <Input
          id="edit-url"
          type="url"
          aria-invalid={Boolean(errors.url)}
          {...register("url")}
        />
        <p className="text-muted-foreground text-xs">
          Changing the URL re-fetches title, difficulty, and topics.
        </p>
        {errors.url ? (
          <p role="alert" className="text-destructive text-sm">
            {errors.url.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label id="edit-attempt-label">Attempt type</Label>
        <Controller
          name="attemptType"
          control={control}
          render={({ field }) => (
            <div
              className="flex flex-col gap-2"
              role="radiogroup"
              aria-labelledby="edit-attempt-label"
            >
              {ATTEMPT_TYPE_OPTIONS.map((option) => {
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
        <p className="text-muted-foreground text-xs">
          Changing attempt type clears incomplete revisions and reschedules
          based on the new type.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-timeTaken">Time taken (minutes)</Label>
        <Input
          id="edit-timeTaken"
          type="number"
          min={0}
          max={1440}
          {...register("timeTaken")}
        />
      </div>

      {errors.root ? (
        <p role="alert" className="text-destructive text-sm">
          {errors.root.message}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={!isDirty || mutation.isPending}>
          {mutation.isPending ? "Saving…" : "Save changes"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={mutation.isPending}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function ProblemDetailsView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useParams<{ id: string }>();
  const problemId = params.id;
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  const problemQuery = useQuery({
    queryKey: ["problems", problemId],
    queryFn: async () => {
      const result = await problemApi.getById(problemId);
      return result.problem;
    },
    enabled: Boolean(problemId),
    refetchInterval: (query) => {
      const problem = query.state.data;
      return problem?.metadataFetched === false ? 2000 : false;
    },
  });

  const revisionsQuery = useQuery({
    queryKey: ["revisions", "problem", problemId],
    queryFn: async () => {
      const result = await revisionApi.listByProblem(problemId);
      return result.revisions;
    },
    enabled: Boolean(problemId),
  });

  const deleteMutation = useMutation({
    mutationFn: () => problemApi.remove(problemId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["problems"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["revisions"] }),
        queryClient.invalidateQueries({ queryKey: ["analytics"] }),
      ]);
      toast.success("Problem deleted");
      router.replace("/problems");
    },
    onError: (error: Error) => {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Could not delete problem",
      );
    },
  });

  const retryMetadataMutation = useMutation({
    mutationFn: () => problemApi.retryMetadata(problemId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["problems"] });
      toast.success("Retrying metadata fetch...");
      void problemQuery.refetch();
    },
    onError: (error: Error) => {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Could not retry metadata fetch",
      );
    },
  });

  if (problemQuery.isLoading) {
    return <ProblemDetailsSkeleton />;
  }

  if (problemQuery.isError || !problemQuery.data) {
    const message =
      problemQuery.error instanceof ApiError
        ? problemQuery.error.message
        : "Could not load this problem.";

    return (
      <div className="space-y-4">
        <Link
          href="/problems"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
        >
          <ArrowLeft className="size-4" />
          Back to problems
        </Link>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Problem</h1>
          <p className="text-muted-foreground text-sm">{message}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => void problemQuery.refetch()}
        >
          Try again
        </Button>
      </div>
    );
  }

  const problem = problemQuery.data;
  const revisions = [...(revisionsQuery.data ?? [])].sort(
    (a, b) => a.revisionNumber - b.revisionNumber,
  );
  const upcomingRevisions = revisions.filter((revision) => !revision.completed);
  const completedRevisions = revisions.filter((revision) => revision.completed);
  const status = problemStatus(revisions);
  const topics = problem.topics ?? [];

  return (
    <div className="space-y-6">
      <Link
        href="/problems"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-4" />
        Back to problems
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {problem.title}
            </h1>
            {problem.metadataFetched === false ? (
              <Badge variant="secondary">Fetching details...</Badge>
            ) : null}
            {problem.difficulty ? (
              <Badge variant="outline">{problem.difficulty}</Badge>
            ) : null}
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            {attemptTypeLabel(problem.attemptType as AttemptType)}
            {problem.timeTaken != null
              ? ` · ${problem.timeTaken} min`
              : null}
          </p>
          {topics.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {topics.map((topic) => (
                <Badge key={topic} variant="outline">
                  {topic}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            render={
              <a href={problem.url} target="_blank" rel="noopener noreferrer" />
            }
          >
            <ExternalLink className="size-4" />
            Open problem
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setEditing((value) => !value)}
          >
            <Pencil className="size-4" />
            {editing ? "Close editor" : "Edit"}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4" />
            Delete
          </Button>
        </div>
      </div>

      {problem.metadataError && problem.metadataFetched === false ? (
        <div
          role="alert"
          className="border-destructive/30 bg-destructive/5 flex flex-col gap-3 rounded-lg border px-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
        >
          <p>
            Could not fetch problem details.{" "}
            <span className="text-muted-foreground">{problem.metadataError}</span>
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={retryMetadataMutation.isPending}
            onClick={() => retryMetadataMutation.mutate()}
          >
            <RefreshCw className="size-3.5" />
            {retryMetadataMutation.isPending ? "Retrying…" : "Retry fetch"}
          </Button>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{editing ? "Edit problem" : "Details"}</CardTitle>
          <CardDescription>
            {editing
              ? "Update problem fields. Changing the URL re-fetches LeetCode metadata."
              : "Core info for this tracked problem."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {editing ? (
            <EditProblemForm
              problem={problem}
              onCancel={() => setEditing(false)}
              onSaved={() => {
                setEditing(false);
                void problemQuery.refetch();
                void revisionsQuery.refetch();
              }}
            />
          ) : (
            <div className="space-y-3 text-sm">
              <div className="flex flex-col gap-1 sm:flex-row sm:gap-3">
                <span className="text-muted-foreground w-28 shrink-0">
                  Problem name
                </span>
                <span className="font-medium">{problem.title}</span>
              </div>
              <div className="flex flex-col gap-1 sm:flex-row sm:gap-3">
                <span className="text-muted-foreground w-28 shrink-0">Link</span>
                <a
                  href={problem.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary break-all underline-offset-4 hover:underline"
                >
                  {problem.url}
                </a>
              </div>
              {problem.difficulty ? (
                <div className="flex flex-col gap-1 sm:flex-row sm:gap-3">
                  <span className="text-muted-foreground w-28 shrink-0">
                    Difficulty
                  </span>
                  <Badge variant="outline">{problem.difficulty}</Badge>
                </div>
              ) : null}
              {topics.length > 0 ? (
                <div className="flex flex-col gap-1 sm:flex-row sm:gap-3">
                  <span className="text-muted-foreground w-28 shrink-0">
                    Topics
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {topics.map((topic) => (
                      <Badge key={topic} variant="outline">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
              {problem.problemId ? (
                <div className="flex flex-col gap-1 sm:flex-row sm:gap-3">
                  <span className="text-muted-foreground w-28 shrink-0">
                    LeetCode ID
                  </span>
                  <span>{problem.problemId}</span>
                </div>
              ) : null}
              <div className="flex flex-col gap-1 sm:flex-row sm:gap-3">
                <span className="text-muted-foreground w-28 shrink-0">
                  Attempt type
                </span>
                <Badge variant="outline">
                  {attemptTypeLabel(problem.attemptType as AttemptType)}
                </Badge>
              </div>
              <div className="flex flex-col gap-1 sm:flex-row sm:gap-3">
                <span className="text-muted-foreground w-28 shrink-0">
                  Created date
                </span>
                <span>{formatShortDate(problem.createdAt)}</span>
              </div>
              <div className="flex flex-col gap-1 sm:flex-row sm:gap-3">
                <span className="text-muted-foreground w-28 shrink-0">
                  Status
                </span>
                <Badge variant={status.variant}>{status.label}</Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming revisions</CardTitle>
          <CardDescription>
            Pending and overdue reviews still left for this problem.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {revisionsQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, index) => (
                <Skeleton key={index} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : revisionsQuery.isError ? (
            <div className="space-y-3">
              <p className="text-muted-foreground text-sm">
                {revisionsQuery.error instanceof ApiError
                  ? revisionsQuery.error.message
                  : "Could not load revisions."}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void revisionsQuery.refetch()}
              >
                Try again
              </Button>
            </div>
          ) : (
            <RevisionList
              revisions={upcomingRevisions}
              emptyMessage="No upcoming revisions for this problem."
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Completed revisions</CardTitle>
          <CardDescription>
            Reviews you have already finished for this problem.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {revisionsQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, index) => (
                <Skeleton key={index} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : revisionsQuery.isError ? (
            <p className="text-muted-foreground text-sm">
              Could not load completed revisions.
            </p>
          ) : (
            <RevisionList
              revisions={completedRevisions}
              emptyMessage="No completed revisions yet."
            />
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this problem?"
        description="This removes the problem and all of its revisions. This cannot be undone."
        confirmLabel="Delete problem"
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={async () => {
          await deleteMutation.mutateAsync();
          setDeleteOpen(false);
        }}
      />
    </div>
  );
}
