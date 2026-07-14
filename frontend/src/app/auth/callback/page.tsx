"use client";

import { useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { authApi } from "@/services/auth.service";
import { PageLoader } from "@/components/shared/page-loader";

function AuthCallbackContent() {
  const router = useRouter();
  const { setAuth } = useAuth();

  useEffect(() => {
    async function completeAuth() {
      try {
        // Tokens are set as httpOnly cookies by the OAuth callback — never via URL.
        const session = await authApi.session();
        setAuth(session.user, session.accessToken, session.refreshToken);
        router.replace("/dashboard");
      } catch {
        router.replace("/login?error=google_auth_failed");
      }
    }

    void completeAuth();
  }, [router, setAuth]);

  return <PageLoader label="Completing sign in..." />;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<PageLoader label="Completing sign in..." />}>
      <AuthCallbackContent />
    </Suspense>
  );
}
