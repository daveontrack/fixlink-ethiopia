import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SERVICE_CATEGORIES } from "@/lib/constants";
import { listServiceCategories } from "@/services/categories";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Browse every home service category available on FIXLINK — cleaning, plumbing, electrical, carpentry and more in Diredawa.",
};

export default async function ServicesPage() {
  const categories = await listServiceCategories();
  const list = categories.length
    ? categories.map((category) => ({
        slug: category.slug,
        label: category.name,
        description: category.description,
      }))
    : SERVICE_CATEGORIES.map((category) => ({
        slug: category.value,
        label: category.label,
        description: null as string | null,
      }));

  return (
    <div className="container mx-auto space-y-10 px-4 py-12">
      <PageHeader
        title="All services"
        description="Pick a category, describe what you need and receive quotations from verified professionals."
        actions={
          <Button asChild>
            <Link href="/customer/requests/new">Post a request</Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((category) => (
          <Link key={category.slug} href={`/services/${category.slug}`}>
            <Card className="h-full transition-colors hover:border-primary/40">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  {category.label}
                  <ArrowRight className="size-4 text-muted-foreground" aria-hidden />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {category.description ??
                    `Professionals offering ${category.label.toLowerCase()} services in Diredawa.`}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
