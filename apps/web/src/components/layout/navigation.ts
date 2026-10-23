import {
  BadgeCheck,
  BriefcaseBusiness,
  AlertTriangle,
  Bell,
  CalendarDays,
  ClipboardList,
  FileText,
  History,
  FolderTree,
  LayoutDashboard,
  MapPin,
  Menu,
  MessageSquare,
  MessageSquareMore,
  Scale,
  Scissors,
  Search,
  Settings,
  ShieldCheck,
  Star,
  Users,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { UserRole } from "@/types";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  description?: string;
  badge?: string;
}

export const PUBLIC_NAV: NavItem[] = [
  { title: "Home", href: "/", icon: LayoutDashboard },
  { title: "Services", href: "/services", icon: BriefcaseBusiness },
  { title: "Professionals", href: "/professionals", icon: Users },
  { title: "About", href: "/about", icon: ShieldCheck },
  { title: "Contact", href: "/contact", icon: MessageSquareMore },
];

// Primary items shown in the desktop top navbar.
export const CUSTOMER_PRIMARY_NAV: NavItem[] = [
  { title: "Dashboard", href: "/customer/dashboard", icon: LayoutDashboard },
  { title: "Find Services", href: "/customer/services", icon: Search },
  { title: "My Requests", href: "/customer/requests", icon: ClipboardList },
  { title: "Quotations", href: "/customer/quotations", icon: FileText },
  { title: "My Bookings", href: "/customer/bookings", icon: CalendarDays },
  { title: "Messages", href: "/customer/messages", icon: MessageSquare },
  { title: "Notifications", href: "/customer/notifications", icon: BadgeCheck },
];

// Items shown under the "More" menu.
export const CUSTOMER_MORE_NAV: NavItem[] = [
  { title: "Job History", href: "/customer/history", icon: History },
  { title: "My Reviews", href: "/customer/reviews", icon: Star },
  { title: "Reports", href: "/customer/reports", icon: AlertTriangle },
  { title: "Help & Support", href: "/contact", icon: MessageSquareMore },
  { title: "Settings", href: "/customer/settings", icon: Settings },
];

// Bottom nav items for mobile (5 destinations).
export const CUSTOMER_BOTTOM_NAV: NavItem[] = [
  { title: "Home", href: "/customer/dashboard", icon: LayoutDashboard },
  { title: "Services", href: "/customer/services", icon: Search },
  { title: "Requests", href: "/customer/requests", icon: ClipboardList },
  { title: "Bookings", href: "/customer/bookings", icon: CalendarDays },
  { title: "More", href: "/customer/more", icon: Menu },
];

// Backward-compatible alias.
export const CUSTOMER_NAV = [...CUSTOMER_PRIMARY_NAV, ...CUSTOMER_MORE_NAV];

export const PROFESSIONAL_NAV: NavItem[] = [
  { title: "Dashboard", href: "/professional/dashboard", icon: LayoutDashboard },
  { title: "Requests", href: "/professional/requests", icon: ClipboardList },
  { title: "Quotations", href: "/professional/quotations", icon: FileText },
  { title: "Bookings", href: "/professional/bookings", icon: CalendarDays },
  { title: "Services", href: "/professional/services", icon: Wrench },
  { title: "Availability", href: "/professional/availability", icon: CalendarDays },
  {
    title: "Verification",
    href: "/professional/verification",
    icon: BadgeCheck,
    badge: "Required",
  },
  { title: "Messages", href: "/professional/messages", icon: MessageSquare },
  { title: "Notifications", href: "/professional/notifications", icon: BadgeCheck },
  { title: "Completed Jobs", href: "/professional/history", icon: History },
  { title: "Reviews", href: "/professional/reviews", icon: Star },
  { title: "Report a Problem", href: "/professional/report", icon: AlertTriangle },
  { title: "Profile", href: "/professional/profile", icon: Settings },
];

export const ADMIN_NAV: NavItem[] = [
  { title: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { title: "Users", href: "/admin/users", icon: Users },
  { title: "Professionals", href: "/admin/professionals", icon: BriefcaseBusiness },
  { title: "Verifications", href: "/admin/verifications", icon: BadgeCheck },
  { title: "Categories", href: "/admin/categories", icon: FolderTree },
  { title: "Service Areas", href: "/admin/service-areas", icon: MapPin },
  { title: "Requests", href: "/admin/requests", icon: ClipboardList },
  { title: "Bookings", href: "/admin/bookings", icon: CalendarDays },
  { title: "Reports", href: "/admin/reports", icon: AlertTriangle },
  { title: "Disputes", href: "/admin/disputes", icon: Scale },
  { title: "Notifications", href: "/admin/notifications", icon: Bell },
  { title: "Audit logs", href: "/admin/audit-logs", icon: ShieldCheck },
  { title: "Settings", href: "/admin/settings", icon: Settings },
];

export const ROLE_NAV: Record<UserRole, NavItem[]> = {
  customer: CUSTOMER_NAV,
  professional: PROFESSIONAL_NAV,
  admin: ADMIN_NAV,
};
