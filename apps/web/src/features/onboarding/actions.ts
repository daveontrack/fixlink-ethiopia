"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClerkClient } from "@/lib/supabase/clerk";
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

async function getStoredProfile(userId: string) {
  const database = createAdminClient();
  const currentProfile = await database
    .from("profiles")
    .select("id, role")
    .eq("clerk_user_id", userId)
    .maybeSingle();

  if (currentProfile.error) return currentProfile;
  if (currentProfile.data) return currentProfile;

  // Older Clerk installations kept the external id in auth_user_id. Adopt
  // that row in place so its stored role and marketplace history are retained.
  const legacyProfile = await database
    .from("profiles")
    .select("id, role")
    .eq("auth_user_id", userId)
    .maybeSingle();

  if (legacyProfile.error || !legacyProfile.data) return legacyProfile;

  return database
    .from("profiles")
    .update({ clerk_user_id: userId })
    .eq("id", legacyProfile.data.id)
    .is("clerk_user_id", null)
    .select("id, role")
    .maybeSingle();
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

  // The persisted role is authoritative; never overwrite an existing account.
  if (existing) return finishExistingProfile(existing.role);

  const clerkUser = await currentUser();
  const fullName =
    clerkUser?.fullName?.trim().slice(0, 100) ||
    clerkUser?.primaryEmailAddress?.emailAddress ||
    "FixLink user";

  const database = createAdminClient();
  const { data: created, error: createError } = await database
    .from("profiles")
    .insert({
      clerk_user_id: userId,
      email: clerkUser?.primaryEmailAddress?.emailAddress ?? null,
      full_name: fullName,
      phone: clerkUser?.primaryPhoneNumber?.phoneNumber ?? null,
      avatar_url: clerkUser?.imageUrl ?? null,
      role: parsed.data.role,
    })
    .select("id, role")
    .single();

  if (createError) {
    // Concurrent Clerk callbacks may create the same profile. Re-read and
    // preserve whichever persisted role won the unique-key race.
    if (createError.code === "23505") {
      const { data: racedProfile, error: racedLookupError } =
        await getStoredProfile(userId);
      if (racedLookupError) {
        console.error("[onboarding] Failed to reload profile:", racedLookupError.message);
      } else if (racedProfile) {
        return finishExistingProfile(racedProfile.role);
      }
    }

    console.error("[onboarding] Profile creation failed:", createError.message);
    return { ok: false as const, error: "Could not create your profile. Please try again." };
  }

  if (created.role === "professional") {
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

  redirect(getPostAuthRedirect(created.role));
}
