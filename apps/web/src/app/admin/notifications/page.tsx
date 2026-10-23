import type { Metadata } from "next";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { NotificationList } from "@/features/notifications/components/notification-list";
import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Notifications" };

export default async function AdminNotificationsPage() {
  await requireAdmin();
  const supabase = createAdminClient() as any;
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  const notifications = (data ?? []).map((row: any) => ({
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    body: row.body,
    href: row.href,
    isRead: row.is_read,
    createdAt: row.created_at,
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Notifications"
        description="Administrative events and platform activity."
      />

      {notifications.length === 0 ? (
        <EmptyState
          title="No notifications"
          description="Administrative events will appear here."
        />
      ) : (
        <NotificationList notifications={notifications as any} />
      )}
    </div>
  );
}
