import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "./database.types";

/**
 * Bridges the Clerk session into Supabase.
 *
 * The Clerk session token is used as the Supabase access token, which lets
 * Supabase row level security policies read `auth.uid()` (the Clerk user id).
 * This requires a Clerk JWT template whose claims match Supabase's JWT
 * secret — see README "Clerk + Supabase integration".
 */
export async function updateSupabaseSession(
  request: NextRequest,
  clerkToken: string | null,
) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  try {
    if (clerkToken) {
      await supabase.auth.setSession({
        access_token: clerkToken,
        refresh_token: clerkToken,
      });
    } else {
      await supabase.auth.getSession();
    }
  } catch (error) {
    console.warn("[supabase] session bridge failed:", error);
  }

  return response;
}
