import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/types";

export interface ClerkUserPayload {
  clerkUserId: string;
  email: string;
  fullName: string;
  phone?: string | null;
  imageUrl?: string | null;
  role?: UserRole;
}

/**
 * Create or refresh the Supabase profile that mirrors an auth user.
 * Idempotent — safe to call from server actions.
 */
export async function syncProfile(payload: {
  authUserId: string;
  email: string;
  fullName: string;
  phone?: string | null;
  imageUrl?: string | null;
  role?: UserRole;
}) {
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("clerk_user_id", payload.authUserId)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from("profiles")
      .update({
        full_name: payload.fullName,
        email: payload.email,
        phone: payload.phone ?? null,
        avatar_url: payload.imageUrl ?? null,
        ...(payload.role ? { role: payload.role } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  const role: UserRole = payload.role ?? "customer";

  const { data, error } = await supabase
    .from("profiles")
    .insert({
      clerk_user_id: payload.authUserId,
      role,
      full_name: payload.fullName,
      email: payload.email,
      phone: payload.phone ?? null,
      avatar_url: payload.imageUrl ?? null,
      status: "active",
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  return data;
}
