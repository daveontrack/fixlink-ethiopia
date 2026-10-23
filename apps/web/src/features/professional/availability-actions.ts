"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireProfessional } from "@/lib/auth/guards";
import { saveAvailability } from "@/services/availability";

const slotSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  isActive: z.boolean(),
});

const availabilitySchema = z.array(slotSchema).min(1);

export async function saveAvailabilityAction(
  slots: Array<{
    weekday: number;
    startTime: string;
    endTime: string;
    isActive: boolean;
  }>,
) {
  const user = await requireProfessional();
  const parsed = availabilitySchema.safeParse(slots);

  if (!parsed.success) {
    return { ok: false as const, error: "Please check your availability slots." };
  }

  const saved = await saveAvailability(user.profileId ?? user.clerkUserId, parsed.data);

  if (!saved) {
    return { ok: false as const, error: "We could not save your availability." };
  }

  revalidatePath("/professional/availability");
  return { ok: true as const };
}
