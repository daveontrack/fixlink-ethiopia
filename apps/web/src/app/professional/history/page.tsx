import type { Metadata } from "next";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { BookingCard } from "@/features/bookings/components/booking-card";
import { requireProfessional } from "@/lib/auth/guards";
import { listBookings } from "@/services/bookings";
import { listReviews } from "@/services/reviews";

export const metadata: Metadata = { title: "Completed jobs" };

export default async function ProfessionalHistoryPage() {
  const user = await requireProfessional();
  const professionalId = user.profileId ?? user.clerkUserId;

  const [bookings, reviews] = await Promise.all([
    listBookings({ professionalId, status: "completed", pageSize: 50 }),
    listReviews(professionalId, 50),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Completed jobs"
        description="Your finished work and the reviews customers left."
      />

      {bookings.data.length === 0 ? (
        <EmptyState
          title="No completed jobs yet"
          description="Completed bookings will appear here."
        />
      ) : (
        <div className="space-y-3">
          {bookings.data.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              counterpartyLabel="Customer"
              href={`/professional/bookings/${booking.id}`}
            />
          ))}
        </div>
      )}

      {reviews.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">
            Customer reviews
          </h2>
          {reviews.map((review) => (
            <div
              key={review.id}
              className="rounded-lg border border-border p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">{review.customerName}</p>
                <span className="text-sm font-semibold">
                  {review.rating}/5
                </span>
              </div>
              {review.comment ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  {review.comment}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
