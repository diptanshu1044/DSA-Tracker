"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  RotateCcw,
  BarChart3,
  Settings,
  Menu,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/revisions", label: "Revisions", icon: RotateCcw },
  { href: "/problems", label: "Problems", icon: BookOpen },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

function NavLinks({
  onNavigate,
  className,
}: {
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex flex-col gap-1", className)}>
      {navItems.map(({ href, label, icon: Icon }) => {
        const active =
          pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  return (
    <aside className="border-sidebar-border bg-sidebar text-sidebar-foreground hidden h-svh w-64 shrink-0 flex-col border-r md:flex">
      <div className="flex h-14 items-center px-4">
        <Link
          href="/dashboard"
          className="text-lg font-semibold tracking-tight"
        >
          DSA Tracker
        </Link>
      </div>
      <Separator />
      <ScrollArea className="flex-1 px-3 py-4">
        <NavLinks />
      </ScrollArea>
    </aside>
  );
}

export function MobileSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "md:hidden",
        )}
      >
        <Menu className="size-5" />
        <span className="sr-only">Open navigation</span>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-b px-4 py-3 text-left">
          <SheetTitle>DSA Tracker</SheetTitle>
        </SheetHeader>
        <div className="px-3 py-4">
          <NavLinks onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
