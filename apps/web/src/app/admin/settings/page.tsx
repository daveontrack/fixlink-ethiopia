import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  await requireAdmin();

  return (
    <div className="space-y-8">
      <PageHeader
        title="System settings"
        description="Platform configuration. Secrets and credentials are never exposed here."
      />

      <Card>
        <CardContent className="space-y-4 p-6 text-sm text-muted-foreground">
          <p>
            Service categories, service areas, and matching configuration are
            managed through their dedicated screens. Sensitive credentials
            (Supabase service-role key, auth secrets) are stored in the server
            environment only.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Categories → /admin/categories</li>
            <li>Service areas → /admin/service-areas</li>
            <li>Users → /admin/users</li>
            <li>Audit logs → /admin/audit-logs</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
