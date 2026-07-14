"use client";

import { useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { authApi } from "@/services/auth.service";
import { PageLoader } from "@/components/shared/page-loader";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuth();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    async function completeAuth() {
      try {
        const code = searchParams.get("code");
        if (!code) {
          router.replace("/login?error=missing_token");
          return;
        }

        // One-time handoff code from the API OAuth callback — not cookies.
        const session = await authApi.exchangeOAuthCode(code);
        setAuth(session.user, session.accessToken, session.refreshToken);
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
