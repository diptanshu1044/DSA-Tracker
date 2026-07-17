import type { Metadata } from "next";
import { ScheduleRevisionForm } from "@/components/revisions/schedule-revision-form";

export const metadata: Metadata = {
  title: "Schedule Revision",
};

export default function ScheduleRevisionPage() {
  return <ScheduleRevisionForm />;
}
