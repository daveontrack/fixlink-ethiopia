import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";

import { getClerkRole } from "@/lib/clerk";
import { createClerkClient } from "@/lib/supabase/clerk";
import type { CurrentUser, Profile, UserRole } from "@/types";

/**
 * The profile columns that actually exist in the FixLink schema.
 * (See supabase/migrations/20261020000100_profiles_and_identity.sql.)
 */
interface ProfileRow {
  id: string;
  auth_user_id: string | null;
  email: string | null;
  full_name: string;
  role: UserRole;
  phone: string | null;
  avatar_url: string | null;
  account_status: string;
  created_at: string;
  updated_at: string;
}

function toProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    clerkUserId: row.auth_user_id ?? "",
    role: row.role,
    fullName: row.full_name,
    phone: row.phone,
    email: row.email ?? "",
    avatarUrl: row.avatar_url,
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

/**
 * Read the signed-in user's profile through the Clerk-authenticated
 * Supabase client. If the profile does not exist yet (first sign-in), it is
 * created with `ensure_profile()`.
 */
async function loadProfile(userId: string): Promise<ProfileRow | null> {
  const supabase = (await createClerkClient()) as any;

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, auth_user_id, email, full_name, role, phone, avatar_url, account_status, created_at, updated_at",
    )
    .eq("auth_user_id", userId)
    .maybeSingle();

  if (error) {
    // Most common cause: the Supabase project does not trust Clerk tokens
    // yet (Dashboard -> Authentication -> Third-party auth -> Clerk).
    console.warn("[auth] profile load failed:", error.message);
  }

  if (data) return data as ProfileRow;

  // First sign-in: create the profile from the Clerk identity.
  const clerkUser = await currentUser();
  const { data: created, error: createError } = await supabase.rpc(
    "ensure_profile",
    {
      p_full_name:
        clerkUser?.fullName ??
        clerkUser?.primaryEmailAddress?.emailAddress ??
        "FixLink user",
      p_phone: clerkUser?.primaryPhoneNumber?.phoneNumber ?? null,
      p_avatar_url: clerkUser?.imageUrl ?? null,
    },
  );

  if (createError) {
    console.warn("[auth] ensure_profile failed:", createError.message);
    return null;
  }

  return (Array.isArray(created) ? created[0] : created) as ProfileRow | null;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const profile = await loadProfile(userId);

  if (profile) {
    return {
      clerkUserId: userId,
      role: profile.role,
      profileId: profile.id,
      fullName: profile.full_name,
      email: profile.email ?? "",
      imageUrl: profile.avatar_url ?? null,
    };
  }

  // Fall back to Clerk metadata so the UI can still render.
  const clerkUser = await currentUser();
  const role = getClerkRole(clerkUser?.publicMetadata) ?? "customer";

  return {
    clerkUserId: userId,
    role,
    profileId: null,
    fullName:
      clerkUser?.fullName ??
      clerkUser?.primaryEmailAddress?.emailAddress ??
      "User",
    email: clerkUser?.primaryEmailAddress?.emailAddress ?? "",
    imageUrl: clerkUser?.imageUrl ?? null,
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
