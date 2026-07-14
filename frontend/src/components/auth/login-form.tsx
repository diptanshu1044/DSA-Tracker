"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { loginSchema, type LoginFormValues } from "@/lib/validations/auth";
import { authApi } from "@/services/auth.service";
import { useAuth } from "@/providers/auth-provider";
import { ApiError } from "@/lib/api";
import { PageLoader } from "@/components/shared/page-loader";

const LOGIN_ERRORS: Record<string, string> = {
  google_auth_failed: "Google sign-in failed. Please try again.",
  google_email_in_use:
    "An account with that email already exists. Sign in with email and password instead.",
  missing_token: "Sign-in session expired. Please try again.",
};

function LoginFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    const errorKey = searchParams.get("error");
    if (errorKey && LOGIN_ERRORS[errorKey]) {
      const message = LOGIN_ERRORS[errorKey];
      setError("root", { message });
      toast.error(message);
    }

    if (searchParams.get("reset") === "success") {
      toast.success("Password updated. You can sign in now.");
    }
  }, [searchParams, setError]);

  const mutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.refreshToken);
      toast.success("Welcome back");
      router.replace("/dashboard");
    },
    onError: (error: Error) => {
      const message =
        error instanceof ApiError ? error.message : "Login failed";
      setError("root", { message });
      toast.error(message);
    },
  });

  return (
    <Card className="w-full max-w-md border-none shadow-none">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Welcome back</CardTitle>
        <CardDescription>
          Sign in to continue tracking your DSA practice.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={handleSubmit((values) => mutation.mutate(values))}
          noValidate
        >
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "email-error" : undefined}
              {...register("email")}
            />
            {errors.email ? (
              <p id="email-error" role="alert" className="text-destructive text-sm">
                {errors.email.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-muted-foreground text-xs underline"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "password-error" : undefined}
              {...register("password")}
            />
            {errors.password ? (
              <p
                id="password-error"
                role="alert"
                className="text-destructive text-sm"
              >
                {errors.password.message}
              </p>
            ) : null}
          </div>

          {errors.root ? (
            <p role="alert" className="text-destructive text-sm">
              {errors.root.message}
            </p>
          ) : null}

          <Button
            type="submit"
            className="w-full"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="bg-border w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card text-muted-foreground px-2">Or</span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => {
            window.location.href = authApi.googleAuthUrl();
          }}
        >
          Continue with Google
        </Button>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-muted-foreground text-sm">
          No account?{" "}
          <Link href="/register" className="text-foreground underline">
            Create one
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}

export function LoginForm() {
  return (
    <Suspense fallback={<PageLoader label="Loading…" />}>
      <LoginFormInner />
    </Suspense>
  );
}
