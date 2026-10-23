import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ServiceCategory } from "@/types";

export async function listServiceCategories(): Promise<ServiceCategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("service_categories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.warn("[categories] list failed:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug as ServiceCategory["slug"],
    name: row.name,
    description: row.description,
    icon: row.icon,
    isActive: row.is_active,
    sortOrder: row.sort_order,
  }));
}

export async function listAllServiceCategories(): Promise<ServiceCategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("service_categories")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    console.warn("[categories] admin list failed:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug as ServiceCategory["slug"],
    name: row.name,
    description: row.description,
    icon: row.icon,
    isActive: row.is_active,
    sortOrder: row.sort_order,
  }));
}

export async function setCategoryActive(id: string, isActive: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("service_categories")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) {
    console.error("[categories] update failed:", error.message);
    return false;
  }

  return true;
}
