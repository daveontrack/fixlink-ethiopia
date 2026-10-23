import "server-only";

import { auth } from "@clerk/nextjs/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";

/**
 * Supabase client that authenticates as the signed-in Clerk user.
 *
 * The Clerk session token is sent as the `Authorization: Bearer <token>`
 * header so Supabase's RLS policies and SECURITY DEFINER functions can read
 * the Clerk user id via `clerk_user_id()` / `current_profile_id()`.
 */
export async function createClerkClient() {
  const { getToken } = await auth();
  const token = await getToken();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

  return createSupabaseClient<Database>(url, anonKey, {
    global: token
      ? { headers: { Authorization: `Bearer ${token}` } }
      : undefined,
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}