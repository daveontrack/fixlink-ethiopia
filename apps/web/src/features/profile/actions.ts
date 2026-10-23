"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireCustomer } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

const profileSchema = z.object({
  fullName: z.string().min(2, "Please enter your name").max(120),
  phone: z
    .string()
    .max(20)
    .optional()
    .or(z.literal("")),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;

export async function updateProfile(values: ProfileFormValues) {
  const user = await requireCustomer();
  const parsed = profileSchema.safeParse(values);

  if (!parsed.success) {
    return {
      ok: false as const,
      error: "Please check the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();

  // Use the admin client (service role) for the profile update so it works
  // regardless of the Clerk JWT bridge state. Only safe columns are updated.
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient() as any;

  const { data, error } = await admin
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      phone: parsed.data.phone || null,
      updated_at: new Date().toISOString(),
    })
    .eq("clerk_user_id", user.clerkUserId)
    .select();

  if (error) {
    console.error("[profile] update failed:", error.message, error.details, error.hint);
    return { ok: false as const, error: `We could not save your profile: ${error.message}` };
  }

  if (!data || data.length === 0) {
    // Profile doesn't exist yet — create it.
    const { error: insertError } = await admin.from("profiles").insert({
      clerk_user_id: user.clerkUserId,
      full_name: parsed.data.fullName,
      phone: parsed.data.phone || null,
      role: "customer",
      account_status: "active",
    });

    if (insertError) {
      console.error("[profile] insert failed:", insertError.message);
      return {
        ok: false as const,
        error: `We could not save your profile: ${insertError.message}`,
      };
    }
  }

  revalidatePath("/customer/profile");
  revalidatePath("/customer/dashboard");
  revalidatePath("/customer", "layout");

  return { ok: true as const };
}
