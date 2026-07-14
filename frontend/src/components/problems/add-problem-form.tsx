"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ATTEMPT_TYPE_OPTIONS,
  createProblemSchema,
  type CreateProblemFormValues,
  type CreateProblemPayload,
} from "@/lib/validations/problem";
import { problemApi } from "@/services/problem.service";
import { dashboardApi } from "@/services/dashboard.service";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { PENDING_REVISION_LIMIT } from "@/types/api";

export function AddProblemForm() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const canAddQuery = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const result = await dashboardApi.get();
      return result.dashboard;
    },
  });

  const canAddProblem = canAddQuery.data?.canAddProblem ?? true;
  const pending = canAddQuery.data?.stats.pendingRevisions;

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<CreateProblemFormValues, unknown, CreateProblemPayload>({
    resolver: zodResolver(createProblemSchema),
    defaultValues: {
      title: "",
      url: "",
      attemptType: undefined,
      timeTaken: "",
    },
  });

  const mutation = useMutation({
    mutationFn: problemApi.create,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["problems"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["revisions"] }),
        queryClient.invalidateQueries({ queryKey: ["analytics"] }),
      ]);
      toast.success("Problem added");
      router.push("/dashboard");
    },
    onError: (error: Error) => {
      if (error instanceof ApiError && error.errors) {
        for (const [field, messages] of Object.entries(error.errors)) {
          if (
            field === "title" ||
            field === "url" ||
            field === "attemptType" ||
            field === "timeTaken"
          ) {
            setError(field, { message: messages[0] ?? error.message });
          }
        }
      }

      const message =
        error instanceof ApiError ? error.message : "Could not add problem";
      setError("root", { message });
      toast.error(message);
    },
  });

  return (
    <Card className="max-w-xl border-none shadow-none">
      <CardHeader className="space-y-1 px-0 pt-0">
        <CardTitle className="text-2xl">Add Problem</CardTitle>
        <CardDescription>
          Log a problem you practiced. Hints and solutions schedule revisions
          for tomorrow and in 7 days; solving yourself skips revisions.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        {!canAddQuery.isLoading && !canAddProblem ? (
          <div
            role="alert"
            className="border-amber-500/30 bg-amber-500/10 mb-5 rounded-lg border px-3 py-3 text-sm"
          >
            You have {pending ?? "too many"} pending revisions (limit{" "}
            {PENDING_REVISION_LIMIT}).{" "}
            <Link href="/revisions" className="underline underline-offset-4">
              Complete some revisions
            </Link>{" "}
            before adding new problems.
          </div>
        ) : null}

        <form
          className="space-y-5"
          onSubmit={handleSubmit((values) =>
            mutation.mutate({
              title: values.title,
              url: values.url,
              attemptType: values.attemptType,
              ...(values.timeTaken !== undefined
                ? { timeTaken: values.timeTaken }
                : {}),
            }),
          )}
          noValidate
        >
          <div className="space-y-2">
            <Label htmlFor="title">Problem Name</Label>
            <Input
              id="title"
              placeholder="Two Sum"
              autoComplete="off"
              aria-invalid={Boolean(errors.title)}
              aria-describedby={errors.title ? "title-error" : undefined}
              {...register("title")}
            />
            {errors.title ? (
              <p id="title-error" role="alert" className="text-destructive text-sm">
                {errors.title.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">Problem Link</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://leetcode.com/problems/two-sum"
              autoComplete="off"
              aria-invalid={Boolean(errors.url)}
              aria-describedby={errors.url ? "url-error" : undefined}
              {...register("url")}
            />
            {errors.url ? (
              <p id="url-error" role="alert" className="text-destructive text-sm">
                {errors.url.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-3">
            <Label id="attempt-label">Attempt</Label>
            <Controller
              name="attemptType"
              control={control}
              render={({ field }) => (
                <div
                  className="flex flex-col gap-2"
                  role="radiogroup"
                  aria-labelledby="attempt-label"
                >
                  {ATTEMPT_TYPE_OPTIONS.map((option) => {
                    const selected = field.value === option.value;
                    return (
                      <label
                        key={option.value}
                        className={cn(
                          "hover:bg-muted/50 flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors",
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
                          onBlur={field.onBlur}
                        />
                        <span>{option.label}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            />
            {errors.attemptType ? (
              <p role="alert" className="text-destructive text-sm">
                {errors.attemptType.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="timeTaken">
              Time Taken{" "}
              <span className="text-muted-foreground font-normal">
                (optional, minutes)
              </span>
            </Label>
            <Input
              id="timeTaken"
              type="number"
              inputMode="numeric"
              min={0}
              max={1440}
              step={1}
              placeholder="45"
              aria-invalid={Boolean(errors.timeTaken)}
              aria-describedby={
                errors.timeTaken ? "timeTaken-error" : undefined
              }
              {...register("timeTaken")}
            />
            {errors.timeTaken ? (
              <p
                id="timeTaken-error"
                role="alert"
                className="text-destructive text-sm"
              >
                {errors.timeTaken.message}
              </p>
            ) : null}
          </div>

          {errors.root ? (
            <p role="alert" className="text-destructive text-sm">
              {errors.root.message}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3 pt-1">
            <Button
              type="submit"
              disabled={mutation.isPending || !canAddProblem}
            >
              {mutation.isPending ? "Saving..." : "Add Problem"}
            </Button>
            <Button
              type="button"
              variant="outline"
              render={<Link href="/dashboard" />}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
