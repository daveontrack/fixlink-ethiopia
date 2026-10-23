import type { Metadata } from "next";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { RatingStars } from "@/components/shared/rating-stars";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReviewForm } from "@/features/reviews/components/review-form";
import { requireCustomer } from "@/lib/auth/guards";
import { formatDate } from "@/lib/format";
import { listBookings } from "@/services/bookings";
import { listReviews } from "@/services/reviews";

export const metadata: Metadata = {
  title: "Reviews",
};

export default async function CustomerReviewsPage() {
  const user = await requireCustomer();
  const customerId = user.profileId ?? user.clerkUserId;

  const [bookings, reviews] = await Promise.all([
    listBookings({ customerId, pageSize: 50 }),
    listReviews(undefined, 50, customerId),
  ]);

  const completed = bookings.data.filter(
    (booking) => booking.status === "completed",
  );

  const myReviews = reviews.filter(
    (review) => review.customerId === customerId,
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Reviews"
        description="Rate completed jobs and see the feedback you have left."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rate a completed job</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {completed.length === 0 ? (
            <EmptyState
              title="No completed jobs yet"
              description="Once a booking is marked as completed you can rate the professional here."
            />
          ) : (
            completed.map((booking) => (
              <div key={booking.id} className="space-y-2">
                <p className="text-sm font-medium">{booking.title}</p>
                <p className="text-xs text-muted-foreground">
                  {booking.professionalName} ·{" "}
                  {formatDate(booking.scheduledDate)}
                </p>
                <ReviewForm
                  bookingId={booking.id}
                  professionalId={booking.professionalId}
                />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your reviews</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {myReviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You have not left any reviews yet.
            </p>
          ) : (
            myReviews.map((review) => (
              <div
                key={review.id}
                className="border-b border-border pb-4 last:border-0 last:pb-0"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">
                    {review.professionalId.slice(0, 8)}…
                  </p>
                  <RatingStars rating={review.rating} />
                </div>
                {review.comment ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {review.comment}
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDate(review.createdAt)}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
