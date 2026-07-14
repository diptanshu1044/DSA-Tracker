import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="from-background via-background to-muted/40 flex min-h-svh flex-col items-center justify-center bg-gradient-to-b px-6 text-center">
      <div className="mx-auto max-w-2xl space-y-6">
        <p className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
          Practice with purpose
        </p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          DSA Tracker
        </h1>
        <p className="text-muted-foreground text-base sm:text-lg">
          A focused workspace to log problems, review patterns, and watch your
          consistency grow.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/register">
            <Button size="lg">Get started</Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline">
              Sign in
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
