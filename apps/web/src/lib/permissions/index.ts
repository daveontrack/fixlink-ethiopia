import type { UserRole } from "@/types";

/**
 * Every guarded action in the product. `can()` checks a role against this map
 * so permissions stay in one place instead of being scattered across routes.
 */
export const PERMISSIONS = {
  "request:create": ["customer"],
  "request:read:own": ["customer", "professional", "admin"],
  "request:read:any": ["admin"],
  "request:update:own": ["customer"],
  "request:update:any": ["admin"],

  "quotation:create": ["professional"],
  "quotation:read:own": ["customer", "professional", "admin"],
  "quotation:read:any": ["admin"],
  "quotation:accept": ["customer"],

  "booking:create": ["customer", "professional", "admin"],
  "booking:read:own": ["customer", "professional", "admin"],
  "booking:read:any": ["admin"],
  "booking:update:status": ["professional", "admin"],

  "service:manage:own": ["professional"],
  "service:manage:any": ["admin"],

  "availability:manage:own": ["professional"],

  "verification:submit": ["professional"],
  "verification:review": ["admin"],

  "message:send": ["customer", "professional", "admin"],

  "review:create": ["customer"],
  "review:moderate": ["admin"],

  "user:manage": ["admin"],
  "category:manage": ["admin"],
  "audit:read": ["admin"],
} as const satisfies Record<string, readonly UserRole[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: UserRole | null | undefined, permission: Permission) {
  if (!role) return false;
  const allowed = PERMISSIONS[permission] as readonly UserRole[];
  return allowed.includes(role);
}

export function canAny(
  role: UserRole | null | undefined,
  permissions: Permission[],
) {
  return permissions.some((permission) => can(role, permission));
}

export const ROLE_LABEL: Record<UserRole, string> = {
  customer: "Customer",
  professional: "Professional",
  admin: "Administrator",
};
