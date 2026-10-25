import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { isMissingColumnError } from "@/lib/supabase/errors";

/** Sync identity fields from a verified Clerk webhook without changing role. */
export async function syncProfile(payload: {
  clerkUserId: string;
  email: string;
  fullName: string;
  phone?: string | null;
  imageUrl?: string | null;
}) {
  const supabase = createAdminClient();
  const identity = {
    full_name: payload.fullName,
    email: payload.email || null,
    phone: payload.phone ?? null,
    avatar_url: payload.imageUrl ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("profiles")
    .update(identity)
    .eq("clerk_user_id", payload.clerkUserId)
    .select("id")
    .maybeSingle();

  if (!error) {
    // A newly created Clerk account has no profile until onboarding saves its
    // explicit role. In particular, do not create a default-customer row here.
    return data;
  }

  if (!isMissingColumnError(error, "email")) {
    throw new Error(error.message);
  }

  // Deployments created before the e-mail copy column keep the address in
  // Clerk only; sync the remaining identity fields instead of failing the
  // webhook on every account update.
  console.warn(
    "[auth] profiles.email is missing from the database; syncing the profile without it.",
  );
  const { email, ...withoutEmail } = identity;
  void email;

  const fallback = await supabase
    .from("profiles")
    .update(withoutEmail)
    .eq("clerk_user_id", payload.clerkUserId)
    .select("id")
    .maybeSingle();

  if (fallback.error) throw new Error(fallback.error.message);

  return fallback.data;
}
