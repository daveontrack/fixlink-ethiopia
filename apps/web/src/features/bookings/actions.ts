"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/guards";
import { updateBookingStatus } from "@/services/bookings";
import type { BookingStatus } from "@/types";

const ALLOWED: BookingStatus[] = [
  "pending",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
];

export async function changeBookingStatus(id: string, status: BookingStatus) {
  const user = await requireRole("customer", "professional", "admin");

  if (!ALLOWED.includes(status)) {
    return { ok: false as const, error: "Unknown booking status." };
  }

  const updated = await updateBookingStatus(id, status);

  if (!updated) {
    return { ok: false as const, error: "We could not update the booking." };
  }

  revalidatePath("/customer/bookings");
  revalidatePath("/professional/bookings");
  revalidatePath("/admin/bookings");

  return { ok: true as const };
}
