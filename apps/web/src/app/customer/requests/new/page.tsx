import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { RequestForm } from "@/features/requests/components/request-form";
import { requireCustomer } from "@/lib/auth/guards";
import { listServiceCategories } from "@/services/categories";
import { listSubCities } from "@/services/sub-cities";

export const metadata: Metadata = {
  title: "New request",
};

export default async function NewRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  await requireCustomer();
  const { category } = await searchParams;

  const categories = await listServiceCategories();
  const options = categories.map((item) => ({
    value: item.id,
    label: item.name,
    description: item.description ?? undefined,
  }));

  const { data: subCities, error: subCitiesError } = await listSubCities();

  const subCityOptions = subCities.map((subCity) => ({
    value: subCity.code,
    label: subCity.name,
  }));

  const defaultCategoryId =
    options.find((option) => option.label.toLowerCase() === category)?.value ??
    undefined;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Post a request"
        description="Tell professionals what you need. You will receive quotations you can compare and accept."
      />

      <Card className="mx-auto max-w-3xl rounded-2xl shadow-sm">
        <CardContent className="p-5 sm:p-8">
          <RequestForm
            categories={options}
            subCities={subCityOptions}
            subCitiesError={subCitiesError}
            defaultCategoryId={defaultCategoryId}
          />
        </CardContent>
      </Card>
    </div>
  );
}
