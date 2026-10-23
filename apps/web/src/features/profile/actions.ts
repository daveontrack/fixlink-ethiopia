"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

const profileSchema = z.object({
  fullName: z.string().min(2, "Please enter your name").max(120),
  phone: z.string().max(20).optional().or(z.literal("")),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;

export async function updateProfile(values: ProfileFormValues) {
  const user = await requireRole("customer", "professional");
  const parsed = profileSchema.safeParse(values);

  if (!parsed.success) {
    return {
      ok: false as const,
      error: "Please check the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      phone: parsed.data.phone || null,
      updated_at: new Date().toISOString(),
    })
    .eq("clerk_user_id", user.clerkUserId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[profile] update failed:", error.message);
    return { ok: false as const, error: "We could not save your profile." };
  }

  if (!data) {
    return {
      ok: false as const,
      error: "Your profile could not be found. Refresh and try again.",
    };
  }

  const basePath = `/${user.role}`;
  revalidatePath(`${basePath}/profile`);
  revalidatePath(`${basePath}/dashboard`);
  revalidatePath(basePath, "layout");

  return { ok: true as const };
}
