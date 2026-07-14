import type { Metadata } from "next";
import { GuestRoute } from "@/components/auth/guest-route";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = {
  title: "Reset password",
};

export default function ResetPasswordPage() {
  return (
    <GuestRoute>
      <div className="flex min-h-svh items-center justify-center p-6">
        <ResetPasswordForm />
      </div>
    </GuestRoute>
  );
}
