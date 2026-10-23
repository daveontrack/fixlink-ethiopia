import type { Metadata } from "next";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { RatingStars } from "@/components/shared/rating-stars";
import { BookingCard } from "@/features/bookings/components/booking-card";
import { Card, CardContent } from "@/components/ui/card";
import { requireProfessional } from "@/lib/auth/guards";
import { listBookings } from "@/services/bookings";
import { listReviews } from "@/services/reviews";

export const metadata: Metadata = {
  title: "Completed Jobs & Reviews",
  description: "Your finished work and customer feedback.",
};

export default async function ProfessionalReviewsPage() {
  const user = await requireProfessional();
  const professionalId = user.profileId ?? user.clerkUserId;

  const [bookings, reviews] = await Promise.all([
    listBookings({ professionalId, status: "completed", pageSize: 50 }),
    listReviews(professionalId, 50),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Completed Jobs & Reviews"
        description="Your finished work and the feedback customers left."
      />

      {/* Completed Bookings */}
      {bookings.data.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">
            Completed Jobs
          </h2>
          <p className="text-sm text-muted-foreground">
            Your finished bookings
          </p>
          <div className="grid gap-3">
            {bookings.data.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                counterpartyLabel="Customer"
                href={`/professional/bookings/${booking.id}`}
              />
            ))}
          </div>
        </div>
      ) : (
        <EmptyState
          title="No completed jobs yet"
          description="Completed bookings will appear here."
        />
      )}

      {/* Reviews */}
      {reviews.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">
            Customer Reviews
          </h2>
          <p className="text-sm text-muted-foreground">
            Feedback left by customers for your completed work
          </p>
          <div className="grid gap-3">
            {reviews.map((review) => (
              <Card key={review.id}>
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">{review.customerName}</p>
                    <RatingStars rating={review.rating} />
                  </div>
                  {review.comment ? (
                    <p className="text-sm text-muted-foreground">{review.comment}</p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : null}

      {bookings.data.length === 0 && reviews.length === 0 ? (
        <EmptyState
          title="No completed jobs or reviews yet"
          description="Your finished work and customer feedback will appear here."
        />
      ) : null}
    </div>
  );
}
