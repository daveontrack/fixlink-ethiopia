"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClerkClient } from "@/lib/supabase/clerk";
import { isMissingColumnError } from "@/lib/supabase/errors";
import { getPostAuthRedirect } from "@/lib/auth/redirects";

const onboardingSchema = z.object({
  role: z.enum(["customer", "professional"]),
});

export type OnboardingValues = z.infer<typeof onboardingSchema>;

async function ensureProfessionalProfile() {
  const supabase = await createClerkClient();
  const { error } = await supabase.rpc("start_as_professional");
  if (error) throw new Error(error.message);
}

type StoredProfile = {
  id: string;
  role: "customer" | "professional" | "admin";
};

type ProfileLookup = {
  data: StoredProfile | null;
  error: { message: string } | null;
};

async function getStoredProfile(userId: string): Promise<ProfileLookup> {
  const database = createAdminClient();
  const currentProfile = await database
    .from("profiles")
    .select("id, role")
    .eq("clerk_user_id", userId)
    .maybeSingle();

  if (currentProfile.error) {
    return { data: null, error: currentProfile.error };
  }
  if (currentProfile.data) {
    return { data: currentProfile.data, error: null };
  }

  // Older Clerk installations kept the external id in auth_user_id. Adopt
  // that row in place so its stored role and marketplace history are retained.
  const legacyProfile = await database
    .from("profiles")
    .select("id, role")
    .eq("auth_user_id", userId)
    .maybeSingle();

  // A database created after the switch to Clerk has no auth_user_id column:
  // that means "no legacy profile", not a failure to load the account.
  if (legacyProfile.error && isMissingColumnError(legacyProfile.error, "auth_user_id")) {
    return { data: null, error: null };
  }
  if (legacyProfile.error) {
    return { data: null, error: legacyProfile.error };
  }
  if (!legacyProfile.data) return { data: null, error: null };

  const adopted = await database
    .from("profiles")
    .update({ clerk_user_id: userId })
    .eq("id", legacyProfile.data.id)
    .is("clerk_user_id", null)
    .select("id, role")
    .maybeSingle();

  return adopted.error
    ? { data: null, error: adopted.error }
    : { data: adopted.data, error: null };
}

async function insertProfile(
  database: ReturnType<typeof createAdminClient>,
  values: {
    clerk_user_id: string;
    email: string | null;
    full_name: string;
    phone: string | null;
    avatar_url: string | null;
    role: "customer" | "professional";
  },
) {
  const created = await database
    .from("profiles")
    .insert(values)
    .select("id, role")
    .single();

  if (!created.error || !isMissingColumnError(created.error, "email")) {
    return created;
  }

  // Older deployments do not carry the e-mail copy column (the address lives
  // in Clerk there). Store the profile without it rather than failing
  // onboarding for every new account.
  console.warn(
    "[onboarding] profiles.email is missing from the database; storing the profile without it.",
  );
  const { email, ...withoutEmail } = values;
  void email;

  return database
    .from("profiles")
    .insert(withoutEmail)
    .select("id, role")
    .single();
}

async function finishExistingProfile(role: "customer" | "professional" | "admin") {
  if (role === "professional") {
    try {
      await ensureProfessionalProfile();
    } catch (error) {
      console.error("[onboarding] Professional setup failed:", error);
      return {
        ok: false as const,
        error: "We could not finish setting up your professional account.",
      };
    }
  }

  redirect(getPostAuthRedirect(role));
}

export async function completeOnboarding(values: OnboardingValues) {
  const { userId } = await auth();
  const parsed = onboardingSchema.safeParse(values);

  if (!userId) {
    return { ok: false as const, error: "Not authenticated" };
  }

  if (!parsed.success) {
    return { ok: false as const, error: "Please choose how you want to use FIXLINK." };
  }

  const { data: existing, error: lookupError } = await getStoredProfile(userId);
  if (lookupError) {
    console.error("[onboarding] Failed to load profile:", lookupError.message);
    return { ok: false as const, error: "Could not load your account. Please try again." };
  }

  // The role submitted in the onboarding form takes precedence over any
  // stored profile role. This ensures that the user's explicit choice
  // during onboarding is always honored, regardless of what the database
  // currently has.
  const submittedRole = values.role;
  const effectiveRole = submittedRole;

  if (effectiveRole === "professional") {
    try {
      await ensureProfessionalProfile();

      // After professional setup, ensure the profile role is set to 'professional'
      // in the database. start_as_professional may not update the profile role
      // if a professionals row already exists (returns early). Use the admin client
      // which bypasses RLS.
      try {
        const adminClient = createAdminClient();
        await adminClient
          .from("profiles")
          .update({ role: "professional" })
          .eq("clerk_user_id", userId);
      } catch (err) {
        console.error(
          "[onboarding] Failed to update profile role to professional:",
          err,
        );
        // Continue anyway - the professionals row may exist and that's OK
      }
    } catch (error) {
      console.error("[onboarding] Professional setup failed:", error);
      return {
        ok: false as const,
        error: "We could not finish setting up your professional account.",
      };
    }
  }

  redirect(getPostAuthRedirect(effectiveRole));
}