import type { Metadata } from "next";
import { AddProblemForm } from "@/components/problems/add-problem-form";

export const metadata: Metadata = {
  title: "Add Problem",
};

export default function AddProblemPage() {
  return <AddProblemForm />;
}
