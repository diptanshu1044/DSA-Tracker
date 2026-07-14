"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/shared/page-loader";
import { useAuth } from "@/providers/auth-provider";

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || isAuthenticated) {
    return <PageLoader label="Loading…" />;
  }

  return (
    <div className="from-background via-background to-muted/40 flex min-h-svh flex-col items-center justify-center bg-gradient-to-b px-6 text-center">
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          DSA Tracker
        </h1>
        <p className="text-muted-foreground text-base sm:text-lg">
          A focused workspace to log problems, review patterns, and watch your
          consistency grow.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" render={<Link href="/register" />}>
            Get started
          </Button>
          <Button size="lg" variant="outline" render={<Link href="/login" />}>
            Sign in
          </Button>
        </div>
      </div>
    </div>
  );
}
