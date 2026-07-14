import type { Metadata } from "next";
import { GuestRoute } from "@/components/auth/guest-route";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <GuestRoute>
      <div className="flex min-h-svh items-center justify-center p-6">
        <LoginForm />
      </div>
    </GuestRoute>
  );
}
