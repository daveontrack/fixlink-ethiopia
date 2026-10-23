"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireProfessional } from "@/lib/auth/guards";
import { saveAvailability } from "@/services/availability";

const slotSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  isActive: z.boolean(),
});

const availabilitySchema = z
  .array(slotSchema)
  .min(1)
  .superRefine((slots, context) => {
    const weekdays = new Set<number>();
    slots.forEach((slot, index) => {
      if (weekdays.has(slot.weekday)) {
        context.addIssue({
          code: "custom",
          path: [index, "weekday"],
          message: "Each day can only appear once.",
        });
      }
      weekdays.add(slot.weekday);

      if (slot.isActive && slot.endTime <= slot.startTime) {
        context.addIssue({
          code: "custom",
          path: [index, "endTime"],
          message: "End time must be later than start time.",
        });
      }
    });
  });

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
