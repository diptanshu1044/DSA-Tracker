import type { Metadata } from "next";
import { AnalyticsView } from "@/components/analytics/analytics-view";

export const metadata: Metadata = {
  title: "Analytics",
  description:
    "Overall progress and actionable learning statistics for your DSA practice.",
};

export default function AnalyticsPage() {
  return <AnalyticsView />;
}
