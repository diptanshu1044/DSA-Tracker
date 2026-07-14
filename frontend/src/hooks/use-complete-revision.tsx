"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CompleteRevisionDialog } from "@/components/revisions/complete-revision-dialog";
import { RevisionCycleCompleteDialog } from "@/components/revisions/revision-cycle-complete-dialog";
import { ApiError } from "@/lib/api";
import { getRevisionProblemId } from "@/lib/revision";
import { revisionApi } from "@/services/revision.service";
import type {
  AdditionalRevisionDays,
  MarkRevisionCompletedInput,
} from "@/types/api";

async function invalidateRevisionQueries(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
    queryClient.invalidateQueries({ queryKey: ["revisions"] }),
    queryClient.invalidateQueries({ queryKey: ["problems"] }),
    queryClient.invalidateQueries({ queryKey: ["analytics"] }),
    queryClient.invalidateQueries({ queryKey: ["activity"] }),
  ]);
}

/**
 * Opens a performance dialog, marks a revision complete, and shows the
 * post-cycle dialog when no pending revisions remain for that problem.
 * Failed reviews (Needed Solution) use one-click retry for tomorrow.
 */
export function useCompleteRevision() {
  const queryClient = useQueryClient();
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [pendingRevisionId, setPendingRevisionId] = useState<string | null>(
    null,
  );
  const [pendingRevisionLabel, setPendingRevisionLabel] = useState<
    string | undefined
  >(undefined);
  const [cycleDialogOpen, setCycleDialogOpen] = useState(false);
  const [cycleProblemId, setCycleProblemId] = useState<string | null>(null);

  const completeMutation = useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: MarkRevisionCompletedInput;
    }) => revisionApi.markCompleted(id, input),
    onSuccess: async (data) => {
      toast.success("Revision marked complete");
      setCompleteDialogOpen(false);
      setPendingRevisionId(null);
      setPendingRevisionLabel(undefined);
      await invalidateRevisionQueries(queryClient);

      if (data.revisionCycleComplete) {
        const problemId = getRevisionProblemId(data.revision);
        if (problemId) {
          setCycleProblemId(problemId);
          setCycleDialogOpen(true);
        }
      }
    },
    onError: (error: Error) => {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Could not mark revision as completed.",
      );
    },
  });

  const retryMutation = useMutation({
    mutationFn: (id: string) => revisionApi.retryTomorrow(id),
    onSuccess: async () => {
      toast.success("Review rescheduled for tomorrow.");
      setCompleteDialogOpen(false);
      setPendingRevisionId(null);
      setPendingRevisionLabel(undefined);
      await invalidateRevisionQueries(queryClient);
    },
    onError: (error: Error) => {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Could not reschedule review for tomorrow.",
      );
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: ({
      problemId,
      days,
    }: {
      problemId: string;
      days: AdditionalRevisionDays;
    }) => revisionApi.scheduleAdditional(problemId, days),
    onSuccess: async (_data, variables) => {
      toast.success(`Revision scheduled in ${variables.days} days`);
      setCycleDialogOpen(false);
      setCycleProblemId(null);
      await invalidateRevisionQueries(queryClient);
    },
    onError: (error: Error) => {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Could not schedule additional revision.",
      );
    },
  });

  const dialogBusy =
    completeMutation.isPending || retryMutation.isPending;

  const completingId = dialogBusy
    ? (completeMutation.variables?.id ??
      retryMutation.variables ??
      pendingRevisionId)
    : null;

  function markCompleted(id: string, label?: string) {
    setPendingRevisionId(id);
    setPendingRevisionLabel(label);
    setCompleteDialogOpen(true);
  }

  function handleCompleteConfirm(input: MarkRevisionCompletedInput) {
    if (!pendingRevisionId) return;
    completeMutation.mutate({ id: pendingRevisionId, input });
  }

  function handleRetryTomorrow() {
    if (!pendingRevisionId) return;
    retryMutation.mutate(pendingRevisionId);
  }

  function handleCompleteDialogOpenChange(open: boolean) {
    if (dialogBusy) return;
    setCompleteDialogOpen(open);
    if (!open) {
      setPendingRevisionId(null);
      setPendingRevisionLabel(undefined);
    }
  }

  function handleSchedule(days: AdditionalRevisionDays) {
    if (!cycleProblemId) return;
    scheduleMutation.mutate({ problemId: cycleProblemId, days });
  }

  function handleConfident() {
    setCycleDialogOpen(false);
    setCycleProblemId(null);
    toast.success("Great! This problem has been marked as completed.");
  }

  function handleCycleDialogOpenChange(open: boolean) {
    if (scheduleMutation.isPending) return;
    setCycleDialogOpen(open);
    if (!open) {
      setCycleProblemId(null);
    }
  }

  const dialogs = (
    <>
      <CompleteRevisionDialog
        open={completeDialogOpen}
        onOpenChange={handleCompleteDialogOpenChange}
        loading={dialogBusy}
        revisionLabel={pendingRevisionLabel}
        onConfirm={handleCompleteConfirm}
        onRetryTomorrow={handleRetryTomorrow}
      />
      <RevisionCycleCompleteDialog
        open={cycleDialogOpen}
        onOpenChange={handleCycleDialogOpenChange}
        loading={scheduleMutation.isPending}
        onSchedule={handleSchedule}
        onConfident={handleConfident}
      />
    </>
  );

  return {
    markCompleted,
    completingId,
    cycleDialog: dialogs,
  };
}
