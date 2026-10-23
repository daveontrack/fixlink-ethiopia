import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ServiceToggle } from "@/features/professional/components/service-toggle";
import { ProfessionalServiceForm } from "@/features/professional/components/service-form";
import { requireProfessional } from "@/lib/auth/guards";
import { formatCurrency } from "@/lib/format";
import { listProfessionalServices } from "@/services/professional-services";
import { listServiceCategories } from "@/services/categories";

export const metadata: Metadata = {
  title: "My services",
};

export default async function ProfessionalServicesPage() {
  const user = await requireProfessional();
  const professionalId = user.profileId ?? user.clerkUserId;

  const [services, categories] = await Promise.all([
    listProfessionalServices(professionalId),
    listServiceCategories(),
  ]);

  const categoryOptions = categories.map((category) => ({
    value: category.id,
    label: category.name,
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Skills & Services"
        description="Define the services you offer and your base prices."
        actions={
          <Button asChild variant="outline">
            <Link href="/professional/profile">Profile & service area</Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add a service</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Service categories are still being configured.
              </p>
            ) : (
              <ProfessionalServiceForm categories={categoryOptions} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">My services</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {services.length === 0 ? (
              <EmptyState
                title="No services yet"
                description="Add the services you offer so customers know what to request."
              />
            ) : (
              services.map((service) => (
                <div
                  key={service.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium">
                      {service.title}{" "}
                      {service.category ? (
                        <span className="text-xs text-muted-foreground">
                          ({service.category.name})
                        </span>
                      ) : null}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(service.base_price)} · {service.pricing_unit}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge
                      status={service.is_active ? "accepted" : "cancelled"}
                      label={service.is_active ? "Active" : "Inactive"}
                    />
                    <ServiceToggle
                      serviceId={service.id}
                      initialActive={service.is_active}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
