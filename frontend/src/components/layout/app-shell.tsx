import type { ReactNode } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Sidebar } from "@/components/layout/sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div
      data-app-shell
      className="bg-background flex h-svh max-h-svh w-full overflow-hidden"
    >
      <Sidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <Navbar />
        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
