"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

export async function updateReportStatus(id: string, status: string) {
  await requireAdmin();

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("reports")
    .update({ status })
    .eq("id", id);

  if (error) {
    return { ok: false as const, error: "Could not update the report." };
  }

  revalidatePath("/admin/reports");
  revalidatePath("/admin/disputes");
  return { ok: true as const };
}
