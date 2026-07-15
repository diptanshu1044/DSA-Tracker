import { GuestRoute } from "@/components/auth/guest-route";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <GuestRoute>
      <div className="relative flex min-h-svh items-center justify-center overflow-hidden px-4 py-10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklch,var(--primary)_12%,transparent),transparent_55%),linear-gradient(to_bottom,var(--background),color-mix(in_oklch,var(--muted)_45%,var(--background)))]"
        />
        <div className="relative z-10 w-full max-w-md">{children}</div>
      </div>
    </GuestRoute>
  );
}
