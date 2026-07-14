"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
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
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from "@/lib/validations/auth";
import { authApi } from "@/services/auth.service";
import { ApiError } from "@/lib/api";

export function ForgotPasswordForm() {
  const [submitted, setSubmitted] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const mutation = useMutation({
    mutationFn: authApi.forgotPassword,
    onSuccess: (data) => {
      setSubmitted(true);
      toast.success("Check your email for a reset link");
      if (data && typeof data === "object" && "resetUrl" in data && data.resetUrl) {
        setDevResetUrl(data.resetUrl);
      }
    },
    onError: (error: Error) => {
      const message =
        error instanceof ApiError ? error.message : "Request failed";
      setError("root", { message });
      toast.error(message);
    },
  });

  return (
    <Card className="w-full max-w-md border-none shadow-none">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Forgot password</CardTitle>
        <CardDescription>
          Enter your email and we&apos;ll send a reset link if an account exists.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {submitted ? (
          <div className="space-y-3">
            <p className="text-sm">
              If that email is registered, a reset link has been sent. Check
              your inbox (and the server console in development).
            </p>
            {devResetUrl ? (
              <p className="text-muted-foreground text-sm break-all">
                Dev reset link:{" "}
                <Link href={devResetUrl} className="text-foreground underline">
                  {devResetUrl}
                </Link>
              </p>
            ) : null}
          </div>
        ) : (
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
                {...register("email")}
              />
              {errors.email ? (
                <p className="text-destructive text-sm">
                  {errors.email.message}
                </p>
              ) : null}
            </div>

            {errors.root ? (
              <p className="text-destructive text-sm">{errors.root.message}</p>
            ) : null}

            <Button
              type="submit"
              className="w-full"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Sending..." : "Send reset link"}
            </Button>
          </form>
        )}
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-muted-foreground text-sm">
          Remembered it?{" "}
          <Link href="/login" className="text-foreground underline">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
