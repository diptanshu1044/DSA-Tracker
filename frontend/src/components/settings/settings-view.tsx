"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Monitor, Moon, Sun, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { ApiError } from "@/lib/api";
import { getInitials } from "@/lib/initials";
import {
  updateProfileSchema,
  type UpdateProfileFormValues,
} from "@/lib/validations/auth";
import { useAuth } from "@/providers/auth-provider";
import { authApi } from "@/services/auth.service";
import { cn } from "@/lib/utils";

const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export function SettingsView() {
  const router = useRouter();
  const { user, setUser, clearAuth } = useAuth();
  const { theme, setTheme } = useTheme();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    setError,
  } = useForm<UpdateProfileFormValues>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { name: user?.name ?? "" },
  });

  useEffect(() => {
    if (user?.name) {
      reset({ name: user.name });
    }
  }, [user?.name, reset]);

  const updateMutation = useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: (data) => {
      setUser(data.user);
      reset({ name: data.user.name });
      toast.success("Profile updated");
    },
    onError: (error: Error) => {
      const message =
        error instanceof ApiError ? error.message : "Could not update profile";
      setError("root", { message });
      toast.error(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: authApi.deleteAccount,
    onSuccess: () => {
      clearAuth();
      toast.success("Account deleted");
      router.replace("/register");
    },
    onError: (error: Error) => {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Could not delete account",
      );
    },
  });

  if (!user) {
    return null;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your profile, appearance, and account."
      />

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Update how your name appears across the app.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={handleSubmit((values) => updateMutation.mutate(values))}
            noValidate
          >
            <div className="flex items-center gap-4">
              <Avatar className="size-14">
                {user.avatar ? (
                  <AvatarImage src={user.avatar} alt={user.name} />
                ) : null}
                <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 space-y-1">
                <p className="truncate font-medium">{user.name}</p>
                <p className="text-muted-foreground truncate text-sm">
                  {user.email}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Display name</Label>
              <Input
                id="name"
                autoComplete="name"
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? "name-error" : undefined}
                {...register("name")}
              />
              {errors.name ? (
                <p id="name-error" role="alert" className="text-destructive text-sm">
                  {errors.name.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user.email} disabled readOnly />
              <p className="text-muted-foreground text-xs">
                Signed in with {user.provider === "google" ? "Google" : "email"}
                .{" "}
                <Link href="/profile" className="underline underline-offset-4">
                  View profile
                </Link>
              </p>
            </div>

            {errors.root ? (
              <p role="alert" className="text-destructive text-sm">
                {errors.root.message}
              </p>
            ) : null}

            <Button
              type="submit"
              disabled={!isDirty || updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving…" : "Save changes"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Choose light, dark, or follow your system preference.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="grid grid-cols-1 gap-2 sm:grid-cols-3"
            role="radiogroup"
            aria-label="Theme"
          >
            {THEME_OPTIONS.map(({ value, label, icon: Icon }) => {
              const selected = theme === value;
              return (
                <label
                  key={value}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-3 text-sm transition-colors",
                    selected
                      ? "border-foreground/20 bg-muted"
                      : "hover:bg-muted/60",
                  )}
                >
                  <input
                    type="radio"
                    name="theme"
                    value={value}
                    checked={selected}
                    onChange={() => setTheme(value)}
                    className="sr-only"
                  />
                  <Icon className="size-4 shrink-0" aria-hidden />
                  {label}
                </label>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="text-destructive">Danger zone</CardTitle>
          <CardDescription>
            Permanently delete your account and all tracked problems and
            revisions. This cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4" />
            Delete account
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete your account?"
        description="All problems, revisions, and account data will be permanently removed. This action cannot be undone."
        confirmLabel="Delete account"
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={async () => {
          await deleteMutation.mutateAsync();
          setDeleteOpen(false);
        }}
      />
    </div>
  );
}
