import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { MatchingConfigForm } from "@/features/admin/components/matching-config-form";
import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Matching configuration",
};

export default async function AdminMatchingConfigPage() {
  await requireAdmin();

  const admin = createAdminClient() as any;
  const { data: config, error } = await admin
    .from("matching_config")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error || !config) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Matching configuration"
          description="Runtime-tunable matching parameters."
        />
        <Card>
          <CardContent className="p-6">
            <p role="alert" className="text-sm text-destructive">
              {error
                ? `We could not load the matching configuration: ${error.message}`
                : "The matching configuration row is missing (id = 1). Apply the matching migration."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Matching configuration"
        description="Runtime-tunable matching parameters. Changes apply to the next matching round; see docs/matching-pilot.md for the pilot values and how to measure them."
      />

      <Card>
        <CardContent className="p-6">
          <MatchingConfigForm
            defaultValues={{
              batchSize: config.batch_size,
              timeoutMinutes: config.timeout_minutes,
              radiusExpansionKm: Number(config.radius_expansion_km),
              maxSearchRadiusKm: Number(config.max_search_radius_km),
              maxExpansionRounds: config.max_expansion_rounds,
              expirationHours: config.expiration_hours,
              maxConcurrentJobs: config.max_concurrent_jobs,
            }}
          />
          <p className="mt-6 text-xs text-muted-foreground">
            Last updated: {new Date(config.updated_at).toLocaleString("en-GB")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
