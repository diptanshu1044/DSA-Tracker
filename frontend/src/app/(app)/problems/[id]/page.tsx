import type { Metadata } from "next";
import { ProblemDetailsView } from "@/components/problems/problem-details-view";

export const metadata: Metadata = {
  title: "Problem",
};

export default function ProblemDetailsPage() {
  return <ProblemDetailsView />;
}
