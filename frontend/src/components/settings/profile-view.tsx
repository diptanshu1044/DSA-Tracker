"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { getInitials } from "@/lib/initials";
import { useAuth } from "@/providers/auth-provider";

export function ProfileView() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link
        href="/settings"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-4" />
        Back to settings
      </Link>

      <PageHeader
        title="Profile"
        description="Your account details. Edit your display name in Settings."
      />

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Avatar className="size-16">
              {user.avatar ? (
                <AvatarImage src={user.avatar} alt={user.name} />
              ) : null}
              <AvatarFallback className="text-lg">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <CardTitle>{user.name}</CardTitle>
              <CardDescription className="break-all">
                {user.email}
              </CardDescription>
              <Badge variant="outline" className="w-fit capitalize">
                {user.provider}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button render={<Link href="/settings" />}>Edit in Settings</Button>
        </CardContent>
      </Card>
    </div>
  );
}
