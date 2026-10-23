import "server-only";

import { auth } from "@clerk/nextjs/server";

import { createClerkClient } from "@/lib/supabase/clerk";
import type { Database } from "@/lib/supabase/database.types";
import type { CurrentUser, Profile, UserRole } from "@/types";

type ProfileRow = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  | "id"
  | "clerk_user_id"
  | "email"
  | "full_name"
  | "role"
  | "phone"
  | "avatar_url"
  | "preferred_language"
  | "account_status"
  | "created_at"
  | "updated_at"
>;

function toProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    clerkUserId: row.clerk_user_id ?? "",
    role: row.role,
    fullName: row.full_name,
    phone: row.phone,
    email: row.email ?? "",
    avatarUrl: row.avatar_url,
    preferredLanguage: row.preferred_language,
    city: null,
    subCity: null,
    address: null,
    status:
      row.account_status === "closed"
        ? "suspended"
        : (row.account_status as Profile["status"]),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Read the signed-in user's persisted profile through Clerk JWT + Supabase RLS. */
async function loadProfile(userId: string): Promise<ProfileRow | null> {
  const supabase = await createClerkClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, clerk_user_id, email, full_name, role, phone, avatar_url, preferred_language, account_status, created_at, updated_at",
    )
    .eq("clerk_user_id", userId)
    .maybeSingle();

  if (error) {
    // Common cause: Supabase has not been configured to trust Clerk JWTs.
    console.warn("[auth] profile load failed:", error.message);
    return null;
  }

  return data;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const profile = await loadProfile(userId);
  if (!profile) return null;

  return {
    clerkUserId: userId,
    role: profile.role,
    profileId: profile.id,
    fullName: profile.full_name,
    email: profile.email ?? "",
    imageUrl: profile.avatar_url ?? null,
  };
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const profile = await loadProfile(userId);
  return profile ? toProfile(profile) : null;
}

export async function getCurrentRole(): Promise<UserRole | null> {
  const user = await getCurrentUser();
  return user?.role ?? null;
}
