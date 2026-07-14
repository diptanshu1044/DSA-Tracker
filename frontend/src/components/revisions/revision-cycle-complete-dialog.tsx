"use client";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { AdditionalRevisionDays } from "@/types/api";

const REVIEW_OPTIONS: { days: AdditionalRevisionDays; label: string }[] = [
  { days: 3, label: "Review again in 3 days" },
  { days: 7, label: "Review again in 7 days" },
  { days: 10, label: "Review again in 10 days" },
];

interface RevisionCycleCompleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading?: boolean;
  onSchedule: (days: AdditionalRevisionDays) => void;
  onConfident: () => void;
}

export function RevisionCycleCompleteDialog({
  open,
  onOpenChange,
  loading = false,
  onSchedule,
  onConfident,
}: RevisionCycleCompleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader className="sm:place-items-start sm:text-left">
          <AlertDialogTitle>🎉 Congratulations</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">
              You&apos;ve completed all scheduled revisions for this problem.
            </span>
            <span className="block">
              Would you like to review it once more?
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex flex-col items-stretch gap-2 sm:flex-col sm:justify-start">
          {REVIEW_OPTIONS.map((option) => (
            <Button
              key={option.days}
              type="button"
              disabled={loading}
              onClick={() => onSchedule(option.days)}
            >
              {option.label}
            </Button>
          ))}
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={onConfident}
          >
            I&apos;m confident
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
