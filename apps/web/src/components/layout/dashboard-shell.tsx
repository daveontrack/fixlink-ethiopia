"use client";

import { UserButton } from "@clerk/nextjs";
import { Bell, Menu } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { APP_NAME, ROLE_HOME } from "@/lib/constants";
import type { UserRole } from "@/types";

interface DashboardShellProps {
  role: UserRole;
  title: string;
  children: React.ReactNode;
}

export function DashboardShell({ role, title, children }: DashboardShellProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-dvh bg-muted/20">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-background lg:block">
        <div className="sticky top-0 flex h-dvh flex-col gap-6 p-4">
          <Link
            href={ROLE_HOME[role]}
            className="flex items-center gap-2 px-2 font-semibold tracking-tight"
          >
            <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              FL
            </span>
            {APP_NAME}
          </Link>
          <AppSidebar role={role} />
          <div className="mt-auto rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            Signed in as <span className="font-medium capitalize">{role}</span>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="size-5" aria-hidden />
                <span className="sr-only">Open navigation</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="px-4 pt-4">
                <SheetTitle className="text-left">{APP_NAME}</SheetTitle>
              </SheetHeader>
              <div className="px-2 py-4">
                <AppSidebar role={role} />
              </div>
            </SheetContent>
          </Sheet>

          <h1 className="truncate text-sm font-medium text-muted-foreground">
            {title}
          </h1>

          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="icon" asChild>
              <Link
                href={
                  role === "customer"
                    ? "/customer/notifications"
                    : role === "professional"
                      ? "/professional/messages"
                      : "/admin/users"
                }
              >
                <Bell className="size-5" aria-hidden />
                <span className="sr-only">Notifications</span>
              </Link>
            </Button>
            <UserButton />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
