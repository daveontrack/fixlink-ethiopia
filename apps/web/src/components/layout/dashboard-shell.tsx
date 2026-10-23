"use client";

import { UserButton } from "@clerk/nextjs";
import {
  Bell,
  BriefcaseBusiness,
  ChevronRight,
  Menu,
  PanelLeft,
  PanelLeftClose,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import {
  isNavItemActive,
  ROLE_NAV,
  type NavItem,
} from "@/components/layout/navigation";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { APP_NAME, ROLE_HOME } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";

interface DashboardShellProps {
  role: UserRole;
  title: string;
  children: React.ReactNode;
  unreadCount?: number;
}

const ROLE_META: Record<
  UserRole,
  { label: string; workspace: string; icon: typeof UserRound }
> = {
  customer: {
    label: "Customer",
    workspace: "Customer workspace",
    icon: UserRound,
  },
  professional: {
    label: "Professional",
    workspace: "Professional workspace",
    icon: BriefcaseBusiness,
  },
  admin: {
    label: "Administrator",
    workspace: "Admin workspace",
    icon: ShieldCheck,
  },
};

const MOBILE_HREFS: Record<UserRole, string[]> = {
  customer: [
    "/customer/dashboard",
    "/customer/requests",
    "/customer/bookings",
    "/customer/messages",
  ],
  professional: [
    "/professional/dashboard",
    "/professional/requests",
    "/professional/quotations",
    "/professional/bookings",
    "/professional/reviews",
  ],
  admin: [
    "/admin/dashboard",
    "/admin/verifications",
    "/admin/requests",
    "/admin/bookings",
  ],
};

const NOTIFICATIONS_HREF: Record<UserRole, string> = {
  customer: "/customer/notifications",
  professional: "/professional/notifications",
  admin: "/admin/notifications",
};

function BrandMark({ role, compact = false }: { role: UserRole; compact?: boolean }) {
  return (
    <Link
      href={ROLE_HOME[role]}
      className="group flex items-center gap-3 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
    >
      <span className="role-gradient grid size-10 shrink-0 place-items-center rounded-2xl text-sm font-bold tracking-tight text-white shadow-lg shadow-[color-mix(in_srgb,var(--role-accent)_28%,transparent)] transition-transform duration-200 group-hover:scale-105">
        FL
      </span>
      <span className={cn("min-w-0", compact && "sr-only")}>
        <span className="block truncate text-[15px] font-semibold tracking-tight">
          {APP_NAME}
        </span>
        <span className="block text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Dire Dawa
        </span>
      </span>
    </Link>
  );
}

export function DashboardShell({
  role,
  title,
  children,
  unreadCount = 0,
}: DashboardShellProps) {
  const [open, setOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const pathname = usePathname() ?? "";
  const meta = ROLE_META[role];
  const RoleIcon = meta.icon;

  const mobileItems = MOBILE_HREFS[role]
    .map((href) => ROLE_NAV[role].find((item) => item.href === href))
    .filter((item): item is NavItem => Boolean(item));

  /* Find the current page title for the breadcrumb */
  const currentPage = ROLE_NAV[role].find((item) =>
    isNavItemActive(pathname, item),
  );

  return (
    <div data-role={role} className="role-canvas flex min-h-dvh">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden shrink-0 border-r border-sidebar-border bg-sidebar transition-[width] duration-200 lg:block",
          sidebarCollapsed ? "w-[84px]" : "w-[272px]",
        )}
      >
        <div className="sticky top-0 flex h-dvh flex-col">
          <div className={cn("pb-4 pt-6", sidebarCollapsed ? "px-3" : "px-5")}>
            <BrandMark role={role} compact={sidebarCollapsed} />

            <div
              title={sidebarCollapsed ? meta.workspace : undefined}
              className={cn(
                "mt-5 flex items-center gap-2.5 rounded-2xl border border-[var(--role-accent)]/10 bg-[var(--role-soft)]/60 px-3.5 py-2.5 text-xs font-semibold text-[var(--role-ink)]",
                sidebarCollapsed && "justify-center px-2",
              )}
            >
              <RoleIcon className="size-4 shrink-0" aria-hidden />
              <span className={cn("truncate", sidebarCollapsed && "sr-only")}>
                {meta.workspace}
              </span>
            </div>
          </div>

          <div className="scrollbar-thin flex-1 overflow-y-auto px-3 pb-6">
            <AppSidebar role={role} collapsed={sidebarCollapsed} />
          </div>

          <div className="border-t border-sidebar-border p-4">
            <div className={cn(
              "flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3 shadow-sm",
              sidebarCollapsed && "justify-center px-2",
            )}>
              <UserButton
                appearance={{ elements: { avatarBox: "size-9 rounded-xl" } }}
              />
              <div className={cn("min-w-0", sidebarCollapsed && "sr-only")}>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Signed in
                </p>
                <p className="truncate text-sm font-medium">{title}</p>
              </div>
            </div>
            <p className="mt-3 px-1 text-[11px] text-muted-foreground">
              Pilot · Dire Dawa city administration
            </p>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur-xl backdrop-saturate-150 sm:px-6 lg:px-8">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="bg-card shadow-sm lg:hidden"
              >
                <Menu className="size-5" aria-hidden />
                <span className="sr-only">Open navigation</span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              data-role={role}
              className="w-[288px] border-r border-sidebar-border bg-sidebar p-0"
            >
              <SheetHeader className="border-b border-sidebar-border px-5 py-4 text-left">
                <SheetTitle className="sr-only">{APP_NAME}</SheetTitle>
                <SheetDescription className="sr-only">
                  {meta.workspace} navigation
                </SheetDescription>
                <BrandMark role={role} />
              </SheetHeader>
              <div className="scrollbar-thin max-h-[calc(100dvh-5rem)] overflow-y-auto px-3 py-4">
                <AppSidebar role={role} onNavigate={() => setOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="hidden shrink-0 lg:inline-flex"
            onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!sidebarCollapsed}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? (
              <PanelLeft className="size-4" aria-hidden />
            ) : (
              <PanelLeftClose className="size-4" aria-hidden />
            )}
          </Button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <span>{meta.label}</span>
              {currentPage ? (
                <>
                  <ChevronRight className="size-3 text-muted-foreground/50" aria-hidden />
                  <span className="text-foreground/70">{currentPage.title}</span>
                </>
              ) : null}
            </div>
            <h1 className="truncate text-sm font-semibold tracking-tight">
              {title}
            </h1>
          </div>

          <div className="ml-auto flex items-center gap-2.5">
            <Link
              href={NOTIFICATIONS_HREF[role]}
              className="relative grid size-9 place-items-center rounded-xl border border-border/60 bg-card text-muted-foreground shadow-sm transition-all duration-200 hover:border-[var(--role-accent)]/30 hover:text-[var(--role-ink)] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              <Bell className="size-4" aria-hidden />
              <span className="sr-only">Notifications</span>
              {unreadCount > 0 ? (
                <span className="absolute -right-1 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-[var(--role-accent)] px-1 text-[9px] font-bold leading-none text-white ring-2 ring-background" aria-hidden>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              ) : null}
              {unreadCount > 0 ? (
                <span className="sr-only">{unreadCount} unread</span>
              ) : null}
            </Link>
            <div className="hidden sm:block">
              <UserButton
                appearance={{ elements: { avatarBox: "size-9 rounded-xl" } }}
              />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-10">
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur-xl backdrop-saturate-150 lg:hidden"
        aria-label={`${meta.label} mobile navigation`}
      >
        <div className="mx-auto grid max-w-lg grid-cols-5 px-1.5 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1.5">
          {mobileItems.map((item) => {
            const Icon = item.icon;
                const active = isNavItemActive(pathname, item);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
                  active
                    ? "bg-[var(--role-soft)] text-[var(--role-ink)] shadow-sm"
                    : "text-muted-foreground hover:bg-[var(--role-soft)]/60 hover:text-[var(--role-ink)]",
                )}
                aria-label={item.title}
              >
                <Icon className={cn("size-5", active && "drop-shadow-sm")} aria-hidden />
                <span className="truncate">{item.title}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-semibold text-muted-foreground transition-all duration-200 hover:bg-[var(--role-soft)]/60 hover:text-[var(--role-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            aria-label="Open all navigation"
          >
            <Menu className="size-5" aria-hidden />
            <span>More</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
