import type { Metadata } from "next";
import { TodayRevisionsView } from "@/components/revisions/today-revisions-view";

export const metadata: Metadata = {
  title: "Today's Revision",
};

export default function RevisionsPage() {
  return <TodayRevisionsView />;
}
