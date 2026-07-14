import type { Metadata } from "next";
import { ProblemsListView } from "@/components/problems/problems-list-view";

export const metadata: Metadata = {
  title: "Problems",
};

export default function ProblemsPage() {
  return <ProblemsListView />;
}
