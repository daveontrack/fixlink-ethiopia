"use client";

import { can, canAny, type Permission } from "@/lib/permissions";
import type { UserRole } from "@/types";

/**
 * Permission helpers for client components.
 * The server remains the source of truth — this only drives UI visibility.
 */
export function usePermissions(role: UserRole | null | undefined) {
  return {
    can: (permission: Permission) => can(role, permission),
    canAny: (permissions: Permission[]) => canAny(role, permissions),
    role,
  };
}
