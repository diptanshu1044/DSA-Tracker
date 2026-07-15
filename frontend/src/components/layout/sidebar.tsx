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
    <nav className={cn("flex flex-col gap-0.5", className)} aria-label="Main">
      {navItems.map(({ href, label, icon: Icon }) => {
        const active =
          pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              "focus-visible:ring-sidebar-ring focus-visible:ring-2 focus-visible:outline-none",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="size-4 shrink-0 opacity-80" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  return (
    <aside className="border-sidebar-border bg-sidebar text-sidebar-foreground hidden h-full min-h-0 w-60 shrink-0 flex-col overflow-hidden border-r md:flex">
      <div className="flex h-14 items-center gap-2.5 px-4">
        <span
          className="bg-sidebar-primary text-sidebar-primary-foreground flex size-7 items-center justify-center rounded-md text-xs font-bold tracking-tight"
          aria-hidden
        >
          DSA
        </span>
        <Link
          href="/dashboard"
          className="text-sm font-semibold tracking-tight focus-visible:ring-sidebar-ring rounded-sm focus-visible:ring-2 focus-visible:outline-none"
        >
          DSA Tracker
        </Link>
      </div>
      <Separator className="opacity-60" />
      <ScrollArea className="flex-1 px-2.5 py-3">
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
          <SheetTitle className="flex items-center gap-2.5">
            <span
              className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-md text-xs font-bold"
              aria-hidden
            >
              DSA
            </span>
            DSA Tracker
          </SheetTitle>
        </SheetHeader>
        <div className="px-2.5 py-3">
          <NavLinks onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
