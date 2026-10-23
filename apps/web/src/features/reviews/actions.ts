"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireCustomer } from "@/lib/auth/guards";
import { createReview } from "@/services/reviews";

const reviewSchema = z.object({
  bookingId: z.string().uuid(),
  professionalId: z.string().uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(1000).optional().or(z.literal("")),
});

export type ReviewFormValues = z.infer<typeof reviewSchema>;

export async function submitReview(values: ReviewFormValues) {
  const user = await requireCustomer();
  const parsed = reviewSchema.safeParse(values);

  if (!parsed.success) {
    return { ok: false as const, error: "Please choose a rating between 1 and 5." };
  }

  const review = await createReview({
    bookingId: parsed.data.bookingId,
    professionalId: parsed.data.professionalId,
    customerId: user.profileId ?? user.clerkUserId,
    rating: parsed.data.rating,
    comment: parsed.data.comment || null,
  });

  if (!review) {
    return { ok: false as const, error: "We could not save your review." };
  }

  revalidatePath("/customer/reviews");
  revalidatePath(`/professionals/${parsed.data.professionalId}`);

  return { ok: true as const };
}
