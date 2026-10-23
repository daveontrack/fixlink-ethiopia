"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/guards";
import { setCategoryActive } from "@/services/categories";

export async function setCategoryActiveAction(id: string, isActive: boolean) {
  await requireAdmin();
  const updated = await setCategoryActive(id, isActive);

  if (!updated) {
    return { ok: false as const, error: "We could not update the category." };
  }

  revalidatePath("/admin/categories");
  return { ok: true as const };
}
