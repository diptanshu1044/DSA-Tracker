"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { authApi } from "@/services/auth.service";
import { PageLoader } from "@/components/shared/page-loader";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuth();

  useEffect(() => {
    const accessToken =
      searchParams.get("accessToken") ?? searchParams.get("token");
    const refreshToken = searchParams.get("refreshToken");

    async function completeAuth() {
      if (!accessToken || !refreshToken) {
        router.replace("/login?error=missing_token");
        return;
      }

      try {
        localStorage.setItem("access_token", accessToken);
        localStorage.setItem("refresh_token", refreshToken);
        localStorage.setItem("token", accessToken);
        const { user } = await authApi.me();
        setAuth(user, accessToken, refreshToken);
        router.replace("/dashboard");
      } catch {
        router.replace("/login?error=google_auth_failed");
      }
    }

    void completeAuth();
  }, [router, searchParams, setAuth]);

  return <PageLoader label="Completing sign in..." />;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<PageLoader label="Completing sign in..." />}>
      <AuthCallbackContent />
    </Suspense>
  );
}
