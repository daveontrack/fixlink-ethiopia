import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ProfessionalProfile } from "@/types";

export interface AvailabilitySlot {
  id: string;
  professionalId: string;
  weekday: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export async function listAvailability(
  professionalId: string,
): Promise<AvailabilitySlot[]> {
  const supabase = (await createClient()) as any;

  const { data, error } = await supabase
    .from("availability_slots")
    .select("*")
    .eq("professional_id", professionalId);

  if (error) {
    console.warn("[availability] list failed:", error.message);
    return [];
  }

  return ((data ?? []) as unknown[]).map((row) => {
    const r = row as Record<string, unknown>;
    return {
      id: r.id as string,
      professionalId: r.professional_id as string,
      weekday: r.weekday as number,
      startTime: r.start_time as string,
      endTime: r.end_time as string,
      isActive: r.is_active as boolean,
    };
  });
}

export async function saveAvailability(
  professionalId: string,
  slots: Array<{
    weekday: number;
    startTime: string;
    endTime: string;
    isActive: boolean;
  }>,
): Promise<boolean> {
  const supabase = (await createClient()) as any;

  // Reset the schedule then (re)insert the active slots. Simple and correct.
  const { error: deleteError } = await supabase
    .from("availability_slots")
    .delete()
    .eq("professional_id", professionalId);

  if (deleteError) {
    console.error("[availability] reset failed:", deleteError.message);
    return false;
  }

  const activeSlots = slots
    .filter((slot) => slot.isActive)
    .map((slot) => ({
      professional_id: professionalId,
      weekday: slot.weekday,
      start_time: slot.startTime,
      end_time: slot.endTime,
      is_active: true,
    }));

  if (activeSlots.length === 0) return true;

  const { error: insertError } = await supabase
    .from("availability_slots")
    .insert(activeSlots);

  if (insertError) {
    console.error("[availability] insert failed:", insertError.message);
    return false;
  }

  return true;
}


