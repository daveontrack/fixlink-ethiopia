import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ServiceCategory, ServiceSummary } from "@/types";
import type { ProfessionalProfile } from "@/types";

interface ProfessionalServiceRow {
  id: string;
  professional_id: string;
  category_id: string;
  title: string;
  description: string | null;
  base_price: number;
  pricing_unit: "fixed" | "hourly" | "per_meter" | "per_item";
  is_active: boolean;
  category?: Pick<ServiceCategory, "id" | "name" | "slug"> | null;
}

export async function listProfessionalServices(
  professionalId: string,
): Promise<ProfessionalServiceRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("professional_services")
    .select(
      `
      id, professional_id, category_id, title, description, base_price,
      pricing_unit, is_active,
      category:service_categories ( id, name, slug )
      `,
    )
    .eq("professional_id", professionalId)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("[professional-services] list failed:", error.message);
    return [];
  }

  return ((data ?? []) as unknown[]).map((row) => {
    const r = row as Record<string, unknown>;
    const category = r.category as
      | { id: string; name: string; slug: string }
      | null;
    return {
      id: r.id as string,
      professional_id: r.professional_id as string,
      category_id: r.category_id as string,
      title: r.title as string,
      description: (r.description as string | null) ?? null,
      base_price: r.base_price as number,
      pricing_unit: r.pricing_unit as
        | "fixed"
        | "hourly"
        | "per_meter"
        | "per_item",
      is_active: r.is_active as boolean,
      category: category
        ? {
            id: category.id,
            name: category.name,
            slug: category.slug as import("@/types").ServiceCategorySlug,
          }
        : undefined,
    };
  });
}

export async function createProfessionalService(input: {
  professionalId: string;
  categoryId: string;
  title: string;
  description?: string;
  basePrice: number;
  pricingUnit: "fixed" | "hourly" | "per_meter" | "per_item";
}): Promise<{ id: string } | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("professional_services")
    .insert({
      professional_id: input.professionalId,
      category_id: input.categoryId,
      title: input.title,
      description: input.description ?? null,
      base_price: input.basePrice,
      pricing_unit: input.pricingUnit,
      is_active: true,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[professional-services] create failed:", error.message);
    return null;
  }

  return { id: data.id };
}

export async function setProfessionalServiceActive(
  id: string,
  isActive: boolean,
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("professional_services")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) {
    console.error("[professional-services] update failed:", error.message);
    return false;
  }

  return true;
}
