import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { CategoryToggle } from "@/features/admin/components/category-toggle";
import { requireAdmin } from "@/lib/auth/guards";
import { listAllServiceCategories } from "@/services/categories";

export const metadata: Metadata = { title: "Categories" };

export default async function AdminCategoriesPage() {
  await requireAdmin();
  const categories = await listAllServiceCategories();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Categories"
        description="Enable or disable service categories across the marketplace."
      />

      <Card>
        <CardContent className="divide-y divide-border p-0">
          {categories.map((category) => (
            <div key={category.id} className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{category.name}</p>
                <p className="text-xs text-muted-foreground">
                  {category.description ?? "No description"}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">
                Order {category.sortOrder}
              </span>
              <CategoryToggle
                categoryId={category.id}
                initialActive={category.isActive}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
