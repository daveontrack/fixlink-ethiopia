"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  isNavItemActive,
  ROLE_NAV,
  type NavItem,
} from "@/components/layout/navigation";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";

interface AppSidebarProps {
  role: UserRole;
  onNavigate?: () => void;
  collapsed?: boolean;
}

const SECTION_LABELS: Record<UserRole, string[]> = {
  customer: ["Overview", "Jobs & payments", "Messages", "Account"],
  professional: ["Overview", "Work", "Growth", "Account"],
  admin: ["Overview", "Operations", "Governance", "System"],
};

/**
 * Splits a role's flat navigation into small labelled groups so the sidebar
 * stays scannable as the product grows. Existing links are reused untouched.
 */
function groupNavigation(role: UserRole, items: NavItem[]): NavItem[][] {
  const byHref = (href: string) => items.find((item) => item.href === href);
  const pick = (hrefs: string[]) =>
    hrefs.map(byHref).filter((item): item is NavItem => Boolean(item));

  if (role === "customer") {
    return [
      pick(["/customer/dashboard", "/customer/services"]),
      pick([
        "/customer/requests",
        "/customer/quotations",
        "/customer/bookings",
        "/customer/history",
        "/customer/reviews",
      ]),
      pick(["/customer/messages", "/customer/notifications"]),
      pick([
        "/customer/reports",
        "/customer/settings",
        "/customer/profile",
        "/contact",
      ]),
    ];
  }

  if (role === "professional") {
    return [
      // Overview section
      pick(["/professional/dashboard"]),
      // Work section
      pick([
        "/professional/requests",
        "/professional/quotations",
        "/professional/bookings",
        "/professional/availability",
      ]),
      // Growth section
      pick([
        "/professional/profile",
        "/professional/services",
        "/professional/verification",
      ]),
      // Account section
      pick([
        "/professional/messages",
        "/professional/notifications",
        "/professional/reviews",
        "/professional/earnings",
        "/professional/settings",
        "/professional/report",
      ]),
    ];
  }

  return [
    pick(["/admin/dashboard"]),
    pick([
      "/admin/users",
      "/admin/professionals",
      "/admin/verifications",
      "/admin/categories",
      "/admin/service-areas",
    ]),
    pick([
      "/admin/requests",
      "/admin/bookings",
      "/admin/reports",
      "/admin/disputes",
      "/admin/audit-logs",
    ]),
    pick(["/admin/notifications", "/admin/settings"]),
  ];
}

export function AppSidebar({ role, onNavigate, collapsed = false }: AppSidebarProps) {
  const pathname = usePathname() ?? "";
  const groups = groupNavigation(role, ROLE_NAV[role]);
  const label = SECTION_LABELS[role];

  return (
    <nav aria-label="Dashboard navigation" className="space-y-5">
      {groups.map((items, groupIndex) =>
        items.length === 0 ? null : (
          <div key={label[groupIndex] ?? groupIndex}>
            {!collapsed ? (
              <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">
                {label[groupIndex]}
              </p>
            ) : null}
            <ul className="space-y-0.5">
              {items.map((item) => {
                const active = isNavItemActive(pathname, item);
                const Icon = item.icon;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      aria-label={collapsed ? item.title : undefined}
                      title={collapsed ? item.title : undefined}
                      className={cn(
                        "group relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200",
                        collapsed && "justify-center px-2",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2",
                        active
                          ? "role-gradient text-white shadow-md shadow-[color-mix(in_srgb,var(--role-accent)_30%,transparent)]"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-[var(--role-ink)]",
                      )}
                    >
                      {active ? (
                        <span
                          className="absolute inset-y-1 left-0 w-[3px] rounded-full bg-white/50"
                          aria-hidden
                        />
                      ) : null}
                      <Icon
                        className={cn(
                          "size-4 shrink-0 transition-colors duration-200",
                          active
                            ? "text-white"
                            : "text-muted-foreground group-hover:text-[var(--role-ink)]",
                        )}
                        aria-hidden
                      />
                      <span className={cn("min-w-0 flex-1 truncate", collapsed && "sr-only")}>
                        {item.title}
                      </span>
                      {item.badge && !collapsed ? (
                        <span
                          className={cn(
                            "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                            active
                              ? "bg-white/20 text-white"
                              : "bg-[var(--role-soft)] text-[var(--role-ink)]",
                          )}
                        >
                          {item.badge}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ),
      )}
    </nav>
  );
}
