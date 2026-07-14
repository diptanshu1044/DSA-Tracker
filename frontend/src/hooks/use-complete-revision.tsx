"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RevisionCycleCompleteDialog } from "@/components/revisions/revision-cycle-complete-dialog";
import { ApiError } from "@/lib/api";
import { getRevisionProblemId } from "@/lib/revision";
import { revisionApi } from "@/services/revision.service";
import type { AdditionalRevisionDays } from "@/types/api";

async function invalidateRevisionQueries(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
    queryClient.invalidateQueries({ queryKey: ["revisions"] }),
    queryClient.invalidateQueries({ queryKey: ["analytics"] }),
  ]);
}

/**
 * Marks a revision complete and opens the post-cycle dialog when no pending
 * revisions remain for that problem.
 */
export function useCompleteRevision() {
  const queryClient = useQueryClient();
  const [cycleDialogOpen, setCycleDialogOpen] = useState(false);
  const [cycleProblemId, setCycleProblemId] = useState<string | null>(null);

  const completeMutation = useMutation({
    mutationFn: (id: string) => revisionApi.markCompleted(id),
    onSuccess: async (data) => {
      toast.success("Revision marked complete");
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

  const completingId =
    completeMutation.isPending && typeof completeMutation.variables === "string"
      ? completeMutation.variables
      : null;

  function handleSchedule(days: AdditionalRevisionDays) {
    if (!cycleProblemId) return;
    scheduleMutation.mutate({ problemId: cycleProblemId, days });
  }

  function handleConfident() {
    setCycleDialogOpen(false);
    setCycleProblemId(null);
    toast.success("Great! This problem has been marked as completed.");
  }

  function handleDialogOpenChange(open: boolean) {
    if (scheduleMutation.isPending) return;
    setCycleDialogOpen(open);
    if (!open) {
      setCycleProblemId(null);
    }
  }

  const cycleDialog = (
    <RevisionCycleCompleteDialog
      open={cycleDialogOpen}
      onOpenChange={handleDialogOpenChange}
      loading={scheduleMutation.isPending}
      onSchedule={handleSchedule}
      onConfident={handleConfident}
    />
  );

  return {
    markCompleted: (id: string) => completeMutation.mutate(id),
    completingId,
    cycleDialog,
  };
}
