import { clerkClient } from "@clerk/nextjs/server";

export { clerkClient };

export const CLERK_ROLE_METADATA_KEY = "role";

export type ClerkRole = "customer" | "professional" | "admin";

export async function getClerkUser(userId: string) {
  const client = await clerkClient();
  return client.users.getUser(userId);
}

export function getClerkRole(
  metadata: Record<string, unknown> | null | undefined,
): ClerkRole | null {
  const role = metadata?.[CLERK_ROLE_METADATA_KEY];
  if (role === "admin" || role === "professional" || role === "customer") {
    return role;
  }
  return null;
}

export async function setClerkRole(userId: string, role: ClerkRole) {
  const client = await clerkClient();
  return client.users.updateUserMetadata(userId, {
    publicMetadata: { [CLERK_ROLE_METADATA_KEY]: role },
  });
}
