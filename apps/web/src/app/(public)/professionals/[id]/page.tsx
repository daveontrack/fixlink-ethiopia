import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { BadgeCheck, CalendarCheck, MapPin, Phone } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { RatingStars } from "@/components/shared/rating-stars";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listReviews } from "@/services/reviews";
import { getProfessional } from "@/services/professionals";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const professional = await getProfessional(id);
  return {
    title: professional?.fullName ?? "Professional",
    description:
      professional?.headline ??
      "Verified home service professional on FIXLINK Diredawa.",
  };
}

export default async function ProfessionalProfilePage({ params }: PageProps) {
  const { id } = await params;
  const professional = await getProfessional(id);

  if (!professional) notFound();

  const reviews = await listReviews(professional.id, 10);

  return (
    <div className="container mx-auto space-y-8 px-4 py-12">
      <PageHeader
        title={professional.fullName}
        description={professional.headline ?? "Home service professional"}
        actions={
          <Button asChild>
            <Link href={`/customer/requests/new?professional=${professional.id}`}>
              Request a quote
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center gap-3">
              <UserAvatar
                name={professional.fullName}
                imageUrl={professional.avatarUrl}
                className="size-14"
              />
              <div>
                <p className="font-medium">{professional.fullName}</p>
                <RatingStars
                  rating={professional.averageRating}
                  count={professional.totalReviews}
                />
              </div>
            </div>

            <dl className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <BadgeCheck className="size-4" aria-hidden />
                <dd>
                  Verification:{" "}
                  <StatusBadge
                    status={professional.verificationStatus}
                    label={professional.verificationStatus.replace("_", " ")}
                  />
                </dd>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="size-4" aria-hidden />
                <dd>{professional.city ?? "Diredawa"}</dd>
              </div>
              {professional.phone ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="size-4" aria-hidden />
                  <dd>{professional.phone}</dd>
                </div>
              ) : null}
              <div className="flex items-center gap-2 text-muted-foreground">
                <CalendarCheck className="size-4" aria-hidden />
                <dd>{professional.completedJobs} jobs completed</dd>
              </div>
            </dl>

            {professional.bio ? (
              <p className="border-t border-border pt-4 text-sm text-muted-foreground">
                {professional.bio}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Customer reviews</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {reviews.length === 0 ? (
                <EmptyState
                  title="No reviews yet"
                  description="Reviews appear here once a customer rates a completed job."
                />
              ) : (
                reviews.map((review) => (
                  <div key={review.id} className="border-b border-border pb-4 last:border-0">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">{review.customerName}</p>
                      <RatingStars rating={review.rating} />
                    </div>
                    {review.comment ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {review.comment}
                      </p>
                    ) : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
