import "server-only";

import { redirect } from "next/navigation";

import { ROLE_HOME } from "@/lib/constants";
import { getCurrentUser } from "./session";
import type { CurrentUser, UserRole } from "@/types";

/**
 * Require a signed-in user. Redirects to sign-in when the visitor is guest.
 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  return user;
}

/**
 * Require a specific role. Signed-in users with the wrong role are sent to
 * their own dashboard instead of seeing a dead end.
 */
export async function requireRole(...roles: UserRole[]): Promise<CurrentUser> {
  const user = await requireUser();

  if (!roles.includes(user.role)) {
    redirect(ROLE_HOME[user.role] ?? "/");
  }

  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  return requireRole("admin");
}

export async function requireCustomer(): Promise<CurrentUser> {
  return requireRole("customer");
}

export async function requireProfessional(): Promise<CurrentUser> {
  return requireRole("professional");
}
