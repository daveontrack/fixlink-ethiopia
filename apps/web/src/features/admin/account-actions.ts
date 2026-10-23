"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export async function setAccountStatusAction(
  profileId: string,
  status: "active" | "suspended" | "closed",
  reason?: string,
) {
  await requireAdmin();

  const supabase = await createClient();

  const { error } = await supabase.rpc(
    "set_account_status",
    {
      p_profile_id: profileId,
      p_status: status,
      p_reason: reason ?? null,
    } as any
  );

  if (error) {
    console.error("[admin] account status failed:", error.message);
    return { ok: false as const, error: "We could not update the account." };
  }

  revalidatePath("/admin/users");
  return { ok: true as const };
}
