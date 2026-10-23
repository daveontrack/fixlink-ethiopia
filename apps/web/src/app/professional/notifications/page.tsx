import type { Metadata } from "next";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { NotificationList } from "@/features/notifications/components/notification-list";
import { requireProfessional } from "@/lib/auth/guards";
import { listNotifications } from "@/services/notifications";

export const metadata: Metadata = { title: "Notifications" };

export default async function ProfessionalNotificationsPage() {
  const user = await requireProfessional();
  const notifications = await listNotifications(
    user.profileId ?? user.clerkUserId,
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Notifications"
        description="Updates about requests, quotations, bookings and messages."
      />

      {notifications.length === 0 ? (
        <EmptyState
          title="Nothing new"
          description="You will be notified when a customer accepts a quotation or sends a message."
        />
      ) : (
        <NotificationList notifications={notifications} />
      )}
    </div>
  );
}
