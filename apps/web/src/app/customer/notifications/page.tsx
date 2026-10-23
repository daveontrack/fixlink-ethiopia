import type { Metadata } from "next";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { NotificationList } from "@/features/notifications/components/notification-list";
import { requireCustomer } from "@/lib/auth/guards";
import { listNotifications } from "@/services/notifications";

export const metadata: Metadata = {
  title: "Notifications",
};

export default async function CustomerNotificationsPage() {
  const user = await requireCustomer();

  const notifications = await listNotifications(
    user.profileId ?? user.clerkUserId,
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Notifications"
        description="Updates about your requests, quotations and bookings."
      />

      {notifications.length === 0 ? (
        <EmptyState
          title="Nothing new"
          description="You will be notified when a professional sends a quotation or your booking is confirmed."
        />
      ) : (
        <NotificationList notifications={notifications} />
      )}
    </div>
  );
}
