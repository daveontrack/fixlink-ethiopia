import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { RatingStars } from "@/components/shared/rating-stars";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listProfessionals } from "@/services/professionals";

export const metadata: Metadata = {
  title: "Professionals",
  description:
    "Meet the verified home service professionals working with FIXLINK in Diredawa.",
};

export default async function ProfessionalsPage() {
  const professionals = await listProfessionals({ pageSize: 24 });

  return (
    <div className="container mx-auto space-y-10 px-4 py-12">
      <PageHeader
        title="Professionals"
        description="Every professional on FIXLINK passes an identity and licence check before accepting work."
        actions={
          <Button asChild variant="outline">
            <Link href="/sign-up">Join as a professional</Link>
          </Button>
        }
      />

      {professionals.data.length === 0 ? (
        <EmptyState
          title="No professionals listed yet"
          description="Verification is under way. Register as a professional and you will appear here once approved."
          action={
            <Button asChild size="sm">
              <Link href="/sign-up">Register as a professional</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {professionals.data.map((professional) => (
            <Link key={professional.id} href={`/professionals/${professional.id}`}>
              <Card className="h-full transition-colors hover:border-primary/40">
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      name={professional.fullName}
                      imageUrl={professional.avatarUrl}
                      className="size-12"
                    />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{professional.fullName}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {professional.headline ?? "Home service professional"}
                      </p>
                    </div>
                  </div>
                  <RatingStars
                    rating={professional.averageRating}
                    count={professional.totalReviews}
                  />
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>{professional.completedJobs} jobs</span>
                    <span>·</span>
                    <span>{professional.yearsExperience ?? 0} yrs experience</span>
                    {professional.isAvailable ? (
                      <span className="font-medium text-emerald-600">
                        · Available
                      </span>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
