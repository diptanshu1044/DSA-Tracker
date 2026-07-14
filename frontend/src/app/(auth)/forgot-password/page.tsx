import type { Metadata } from "next";
import { GuestRoute } from "@/components/auth/guest-route";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot password",
};

export default function ForgotPasswordPage() {
  return (
    <GuestRoute>
      <div className="flex min-h-svh items-center justify-center p-6">
        <ForgotPasswordForm />
      </div>
    </GuestRoute>
  );
}
