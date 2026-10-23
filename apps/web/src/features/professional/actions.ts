"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireProfessional } from "@/lib/auth/guards";
import { createClerkClient } from "@/lib/supabase/clerk";
import { createProfessionalService, setProfessionalServiceActive } from "@/services/professional-services";

export const professionalServiceSchema = z.object({
  categoryId: z.string().uuid("Choose a category"),
  title: z.string().min(3, "Enter a service title").max(120),
  description: z.string().max(500).optional().or(z.literal("")),
  basePrice: z.coerce.number().min(0, "Price cannot be negative"),
  pricingUnit: z.enum(["fixed", "hourly", "per_meter", "per_item"]),
});

export type ProfessionalServiceFormValues = z.infer<typeof professionalServiceSchema>;

export async function createProfessionalServiceAction(
  values: ProfessionalServiceFormValues,
) {
  const user = await requireProfessional();
  const parsed = professionalServiceSchema.safeParse(values);

  if (!parsed.success) {
    return {
      ok: false as const,
      error: "Please check the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const result = await createProfessionalService({
    professionalId: user.profileId ?? user.clerkUserId,
    categoryId: parsed.data.categoryId,
    title: parsed.data.title,
    description: parsed.data.description || undefined,
    basePrice: parsed.data.basePrice,
    pricingUnit: parsed.data.pricingUnit,
  });

  if (!result) {
    return { ok: false as const, error: "We could not add the service." };
  }

  revalidatePath("/professional/services");
  return { ok: true as const };
}

const serviceAreaSchema = z.object({
  subCityCode: z.string().min(1, "Choose your sub-city"),
});

/**
 * Set the base sub-city of the signed-in professional.
 *
 * The database function reads the name and the point from `sub_cities`, so
 * the client only ever sends a code that exists in the reference table.
 */
export async function updateServiceAreaAction(subCityCode: string) {
  await requireProfessional();

  const parsed = serviceAreaSchema.safeParse({ subCityCode });
  if (!parsed.success) {
    return { ok: false as const, error: "Choose your sub-city." };
  }

  const supabase = (await createClerkClient()) as any;
  const { error } = await supabase.rpc("update_professional_profile", {
    p_base_sub_city_code: parsed.data.subCityCode,
  });

  if (error) {
    console.error("[professional] service area failed:", error.message);
    return {
      ok: false as const,
      error:
        error.message === "not_a_professional"
          ? "Set up your professional profile first."
          : "We could not save your service area.",
    };
  }

  revalidatePath("/professional/profile");
  return { ok: true as const };
}

export async function toggleProfessionalServiceAction(
  serviceId: string,
  isActive: boolean,
) {
  const user = await requireProfessional();

  const updated = await setProfessionalServiceActive(serviceId, isActive);

  if (!updated) {
    return { ok: false as const, error: "We could not update the service." };
  }

  revalidatePath("/professional/services");
  return { ok: true as const };
}
