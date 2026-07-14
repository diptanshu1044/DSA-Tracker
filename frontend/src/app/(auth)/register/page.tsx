import type { Metadata } from "next";
import { GuestRoute } from "@/components/auth/guest-route";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Create account",
};

export default function RegisterPage() {
  return (
    <GuestRoute>
      <div className="flex min-h-svh items-center justify-center p-6">
        <RegisterForm />
      </div>
    </GuestRoute>
  );
}
