import type { Metadata } from "next";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { RatingStars } from "@/components/shared/rating-stars";
import { Card, CardContent } from "@/components/ui/card";
import { requireProfessional } from "@/lib/auth/guards";
import { listReviews } from "@/services/reviews";

export const metadata: Metadata = { title: "Reviews" };

export default async function ProfessionalReviewsPage() {
  const user = await requireProfessional();
  const reviews = await listReviews(user.profileId ?? user.clerkUserId, 50);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Reviews"
        description="Feedback left by customers for your completed jobs."
      />

      {reviews.length === 0 ? (
        <EmptyState
          title="No reviews yet"
          description="Reviews appear here once customers rate your completed work."
        />
      ) : (
        <div className="space-y-3">
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
