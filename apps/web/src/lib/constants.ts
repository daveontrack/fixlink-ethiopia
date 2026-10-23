import type { SelectOption, UserRole } from "@/types";

export const APP_NAME = "FIXLINK";
export const APP_TAGLINE = "Trusted home services in Diredawa";
export const APP_DESCRIPTION =
  "FIXLINK connects Diredawa households with vetted local professionals for cleaning, plumbing, electrical, carpentry and more.";

export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const CLERK_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";

/** Where each role lands after signing in. */
export const ROLE_HOME: Record<UserRole, string> = {
  customer: "/customer/dashboard",
  professional: "/professional/dashboard",
  admin: "/admin/dashboard",
};

export const DASHBOARD_PREFIX: Record<UserRole, string> = {
  customer: "/customer",
  professional: "/professional",
  admin: "/admin",
};

/** Public cities covered by the marketplace at launch. */
export const CITIES = ["Diredawa", "Chalenso", "Bole", "Kebele 05", "Hidar Tabia"] as const;

export const SUBCITIES = [
  "Bole",
  "Kebele 05",
  "Hidar Tabia",
  "Kebele 13",
  "Chalenso",
  "Legetafo",
] as const;

export const SERVICE_CATEGORIES: SelectOption[] = [
  { value: "cleaning", label: "Cleaning" },
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "carpentry", label: "Carpentry" },
  { value: "painting", label: "Painting" },
  { value: "appliance-repair", label: "Appliance Repair" },
  { value: "moving", label: "Moving & Hauling" },
  { value: "gardening", label: "Gardening" },
  { value: "construction", label: "Construction" },
  { value: "other", label: "Other" },
];

export const CATEGORY_ICON: Record<string, string> = {
  cleaning: "Sparkles",
  plumbing: "Droplets",
  electrical: "Zap",
  carpentry: "Hammer",
  painting: "Paintbrush",
  "appliance-repair": "Wrench",
  moving: "Truck",
  gardening: "Leaf",
  construction: "HardHat",
  other: "Wrench",
};

/** Currency used across the marketplace (Ethiopian Birr). */
export const CURRENCY = "ETB";

export const DEFAULT_PAGE_SIZE = 20;

export const REQUEST_STATUS_LABEL: Record<string, string> = {
  open: "Open",
  in_review: "In review",
  quoted: "Quoted",
  accepted: "Accepted",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const BOOKING_STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const QUOTATION_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  rejected: "Rejected",
  expired: "Expired",
  withdrawn: "Withdrawn",
};
