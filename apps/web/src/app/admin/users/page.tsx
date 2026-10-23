import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { UserAvatar } from "@/components/shared/user-avatar";
import { StatusBadge } from "@/components/shared/status-badge";
import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatRelativeTime } from "@/lib/format";

export const metadata: Metadata = { title: "Users" };

export default async function AdminUsersPage() {
  await requireAdmin();
  const supabase = createAdminClient() as any;
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, status, city, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const users = data ?? [];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Users"
        description="All registered accounts on the marketplace."
      />

      {users.length === 0 ? (
        <EmptyState title="No users yet" description="Registered users appear here." />
      ) : (
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {users.map((user: any) => (
              <div key={user.id} className="flex items-center gap-3 p-4">
                <UserAvatar name={user.full_name} className="size-9" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{user.full_name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {user.email} · {user.city ?? "—"}
                  </p>
                </div>
                <StatusBadge
                  status={user.status === "active" ? "accepted" : "cancelled"}
                  label={user.status}
                />
                <span className="text-xs capitalize text-muted-foreground">
                  {user.role}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(user.created_at)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
