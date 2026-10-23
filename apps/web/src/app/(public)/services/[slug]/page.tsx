import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { RatingStars } from "@/components/shared/rating-stars";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SERVICE_CATEGORIES } from "@/lib/constants";
import { listProfessionals } from "@/services/professionals";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = SERVICE_CATEGORIES.find((item) => item.value === slug);
  return {
    title: category?.label ?? "Service",
    description: `Find ${category?.label.toLowerCase() ?? "home service"} professionals in Diredawa on FIXLINK.`,
  };
}

export default async function ServiceCategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const category = SERVICE_CATEGORIES.find((item) => item.value === slug);

  if (!category) notFound();

  const professionals = await listProfessionals({ pageSize: 12 });

  return (
    <div className="container mx-auto space-y-10 px-4 py-12">
      <PageHeader
        title={category.label}
        description={`Compare verified ${category.label.toLowerCase()} professionals in Diredawa and choose the quotation that fits your budget.`}
        actions={
          <Button asChild>
            <Link href={`/customer/requests/new?category=${slug}`}>
              Request this service
            </Link>
          </Button>
        }
      />

      {professionals.data.length === 0 ? (
        <EmptyState
          title={`No ${category.label.toLowerCase()} professionals listed yet`}
          description="We are onboarding professionals category by category. Post a request and we will match you as soon as someone is available."
          action={
            <Button asChild size="sm">
              <Link href="/customer/requests/new">Post a request</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {professionals.data.map((professional) => (
            <Card key={professional.id}>
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center gap-3">
                  <UserAvatar
                    name={professional.fullName}
                    imageUrl={professional.avatarUrl}
                    className="size-11"
                  />
                  <div>
                    <p className="font-medium">{professional.fullName}</p>
                    <p className="text-sm text-muted-foreground">
                      {professional.headline ?? category.label}
                    </p>
                  </div>
                </div>
                <RatingStars
                  rating={professional.averageRating}
                  count={professional.totalReviews}
                />
                <p className="text-sm text-muted-foreground">
                  {professional.completedJobs} jobs completed
                </p>
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href={`/professionals/${professional.id}`}>View profile</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
