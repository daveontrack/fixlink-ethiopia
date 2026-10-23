import { ROLE_HOME } from "@/lib/constants";
import type { UserRole } from "@/types";

export const POST_AUTH_REDIRECT = "/onboarding";

/** Profile-backed landing destination; users without a profile must onboard. */
export function getPostAuthRedirect(role: UserRole | null | undefined): string {
  return role ? ROLE_HOME[role] : POST_AUTH_REDIRECT;
}
