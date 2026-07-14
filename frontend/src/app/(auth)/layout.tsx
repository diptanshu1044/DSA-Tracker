import { GuestRoute } from "@/components/auth/guest-route";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <GuestRoute>
      <div className="from-background via-background to-muted/30 flex min-h-svh items-center justify-center bg-gradient-to-b px-4 py-10">
        {children}
      </div>
    </GuestRoute>
  );
}
