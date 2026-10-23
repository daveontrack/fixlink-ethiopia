import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/** Sync identity fields from a verified Clerk webhook without changing role. */
export async function syncProfile(payload: {
  clerkUserId: string;
  email: string;
  fullName: string;
  phone?: string | null;
  imageUrl?: string | null;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({
      full_name: payload.fullName,
      email: payload.email || null,
      phone: payload.phone ?? null,
      avatar_url: payload.imageUrl ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("clerk_user_id", payload.clerkUserId)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  // A newly created Clerk account has no profile until onboarding saves its
  // explicit role. In particular, do not create a default-customer row here.
  return data;
}
