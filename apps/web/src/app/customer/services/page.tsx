import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SERVICE_CATEGORIES } from "@/lib/constants";
import { listServiceCategories } from "@/services/categories";

export const metadata: Metadata = {
  title: "Find a service",
};

export default async function CustomerServicesPage() {
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
    <div className="space-y-8">
      <PageHeader
        title="Find a service"
        description="Choose the type of professional you need, then request the service."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((category) => (
          <Card key={category.slug} className="h-full">
            <CardHeader>
              <CardTitle className="text-base">{category.label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {category.description ??
                  `Professionals offering ${category.label.toLowerCase()} services in Diredawa.`}
              </p>
              <Button asChild size="sm" className="w-full">
                <Link href={`/customer/requests/new?category=${category.slug}`}>
                  Request this service
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
