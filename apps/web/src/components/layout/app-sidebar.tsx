"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ROLE_NAV } from "@/components/layout/navigation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";

interface AppSidebarProps {
  role: UserRole;
  className?: string;
}

export function AppSidebar({ role, className }: AppSidebarProps) {
  const pathname = usePathname();
  const items = ROLE_NAV[role];

  return (
    <nav className={cn("flex flex-col gap-1", className)} aria-label="Dashboard">
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            <span className="flex-1 truncate">{item.title}</span>
            {item.badge ? (
              <Badge variant="outline" className="text-[10px]">
                {item.badge}
              </Badge>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
