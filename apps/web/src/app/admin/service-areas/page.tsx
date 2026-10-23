import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Service areas" };

export default async function AdminServiceAreasPage() {
  await requireAdmin();
  const supabase = createAdminClient() as any;
  const { data, error } = await supabase
    .from("sub_cities")
    .select("code, name, sort_order, is_active, source, source_code")
    .order("sort_order", { ascending: true });

  if (error) {
    console.warn("[admin] service areas failed:", error.message);
  }

  const areas = ((data ?? []) as any[]).sort(
    (a, b) => Number(b.is_active) - Number(a.is_active),
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Service areas"
        description="Sub-cities of Dire Dawa used for matching and location. Inactive areas are kept for existing requests but are not offered in the forms."
      />

      <Card>
        <CardContent className="divide-y divide-border p-0">
          {error ? (
            <p role="alert" className="p-4 text-sm text-destructive">
              We could not load the service areas.
            </p>
          ) : areas.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              No service areas are configured yet.
            </p>
          ) : (
            areas.map((area: any) => (
              <div key={area.code} className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{area.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Code: {area.code}
                    {area.source_code ? ` · Official code: ${area.source_code}` : ""}
                  </p>
                  {area.source ? (
                    <p className="text-xs text-muted-foreground">{area.source}</p>
                  ) : null}
                </div>
                <Badge variant={area.is_active ? "secondary" : "outline"}>
                  {area.is_active ? "Active" : "Inactive"}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Order {area.sort_order}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
