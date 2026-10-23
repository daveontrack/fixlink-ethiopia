import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Audit logs" };

export default async function AdminAuditLogsPage() {
  await requireAdmin();
  const supabase = createAdminClient() as any;
  const { data } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  const logs = data ?? [];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Audit logs"
        description="Track administrative actions across the platform."
      />

      {logs.length === 0 ? (
        <EmptyState
          title="No audit logs yet"
          description="Administrative actions will be recorded here."
        />
      ) : (
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {logs.map((log: any) => (
              <div key={log.id} className="p-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{log.action}</p>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(log.created_at)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {log.entity_type}
                  {log.entity_id ? ` · ${log.entity_id}` : ""}
                  {log.actor_id ? ` · by ${log.actor_id}` : ""}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
