"use server";

import { revalidatePath } from "next/cache";

import { requireCustomer } from "@/lib/auth/guards";
import { createBooking } from "@/services/bookings";
import { getQuotation, setQuotationStatus } from "@/services/quotations";

export async function acceptQuotation(quotationId: string) {
  const user = await requireCustomer();

  const quotation = await getQuotation(quotationId);

  if (!quotation) {
    return { ok: false as const, error: "That quotation no longer exists." };
  }

  if (quotation.customerId && quotation.customerId !== user.profileId) {
    return { ok: false as const, error: "This quotation belongs to another customer." };
  }

  if (quotation.status !== "sent") {
    return { ok: false as const, error: "This quotation can no longer be accepted." };
  }

  const booking = await createBooking({
    quotationId: quotation.id,
  });

  if (!booking) {
    return { ok: false as const, error: "We could not create the booking." };
  }

  revalidatePath("/customer/bookings");
  revalidatePath(`/customer/requests/${quotation.requestId}`);

  return { ok: true as const, bookingId: booking.id };
}

export async function rejectQuotation(quotationId: string) {
  const user = await requireCustomer();
  const quotation = await getQuotation(quotationId);

  if (!quotation) {
    return { ok: false as const, error: "That quotation no longer exists." };
  }

  if (quotation.customerId && quotation.customerId !== user.profileId) {
    return { ok: false as const, error: "This quotation belongs to another customer." };
  }

  await setQuotationStatus(quotation.id, "rejected");
  revalidatePath(`/customer/requests/${quotation.requestId}`);

  return { ok: true as const };
}
