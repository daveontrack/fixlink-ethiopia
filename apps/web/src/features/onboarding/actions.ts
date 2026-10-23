"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUser } from "@/lib/auth/guards";
import { ROLE_HOME } from "@/lib/constants";
import { createClerkClient } from "@/lib/supabase/clerk";

const onboardingSchema = z.object({
  role: z.enum(["customer", "professional"]),
});

export type OnboardingValues = z.infer<typeof onboardingSchema>;

export async function completeOnboarding(values: OnboardingValues) {
  const user = await requireUser();
  const parsed = onboardingSchema.safeParse(values);

  if (!parsed.success) {
    return { ok: false as const, error: "Please choose how you want to use FIXLINK." };
  }

  const supabase = (await createClerkClient()) as any;

  if (parsed.data.role === "professional") {
    const { error } = await supabase.rpc("start_as_professional");
    if (error) {
      console.error("[onboarding] start_as_professional failed:", error.message);
      return {
        ok: false as const,
        error: "We could not set up your professional account.",
      };
    }
  }

  redirect(ROLE_HOME[parsed.data.role]);
}
