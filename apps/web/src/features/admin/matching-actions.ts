"use server";

import { revalidatePath } from "next/cache";

import {
  matchingConfigSchema,
  type MatchingConfigValues,
} from "@/features/admin/matching-schema";
import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

export async function updateMatchingConfig(values: MatchingConfigValues) {
  await requireAdmin();

  const parsed = matchingConfigSchema.safeParse(values);

  if (!parsed.success) {
    return {
      ok: false as const,
      error: "Please check the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const admin = createAdminClient() as any;
  const { error } = await admin
    .from("matching_config")
    .update({
      batch_size: parsed.data.batchSize,
      timeout_minutes: parsed.data.timeoutMinutes,
      radius_expansion_km: parsed.data.radiusExpansionKm,
      max_search_radius_km: parsed.data.maxSearchRadiusKm,
      max_expansion_rounds: parsed.data.maxExpansionRounds,
      expiration_hours: parsed.data.expirationHours,
      max_concurrent_jobs: parsed.data.maxConcurrentJobs,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  if (error) {
    console.error("[admin] matching config update failed:", error.message);
    return { ok: false as const, error: "We could not save the configuration." };
  }

  revalidatePath("/admin/matching-config");
  return { ok: true as const };
}
