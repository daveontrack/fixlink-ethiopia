import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Review } from "@/types";

/**
 * Real review row (20261020001000_reviews_reports_admin.sql):
 *   id, booking_id, reviewer_id, professional_id, rating, comment, created_at
 * There is no `is_published` or `customer_id` column.
 */
interface ReviewRow {
  id: string;
  booking_id: string;
  reviewer_id: string;
  professional_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

function toReview(row: ReviewRow): Review {
  return {
    id: row.id,
    bookingId: row.booking_id,
    professionalId: row.professional_id,
    customerId: row.reviewer_id,
    customerName: "Customer",
    rating: row.rating,
    comment: row.comment,
    isPublished: true,
    createdAt: row.created_at,
  };
}

export async function listReviews(
  professionalId?: string,
  limit = 20,
  customerId?: string,
): Promise<Review[]> {
  const supabase = (await createClient()) as any;

  let query = supabase
    .from("reviews")
    .select(
      "id, booking_id, reviewer_id, professional_id, rating, comment, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (professionalId) query = query.eq("professional_id", professionalId);
  if (customerId) query = query.eq("reviewer_id", customerId);

  const { data, error } = await query;

  if (error) {
    console.warn("[reviews] list failed:", error.message);
    return [];
  }

  return ((data ?? []) as ReviewRow[]).map(toReview);
}

export async function createReview(input: {
  bookingId: string;
  professionalId: string;
  customerId: string;
  rating: number;
  comment?: string | null;
}): Promise<Review | null> {
  const supabase = (await createClient()) as any;

  const { data, error } = await supabase
    .from("reviews")
    .insert({
      booking_id: input.bookingId,
      reviewer_id: input.customerId,
      professional_id: input.professionalId,
      rating: input.rating,
      comment: input.comment ?? null,
    })
    .select(
      "id, booking_id, reviewer_id, professional_id, rating, comment, created_at",
    )
    .single();

  if (error) {
    console.error("[reviews] create failed:", error.message);
    return null;
  }

  return toReview(data as ReviewRow);
}
