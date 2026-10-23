import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireRole } from "@/lib/auth/guards";
import { countUnreadNotifications } from "@/services/notifications";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("admin");
  const unreadCount = await countUnreadNotifications(
    user.profileId ?? user.clerkUserId,
  );

  return (
    <DashboardShell
      role="admin"
      title={`Admin · ${user.fullName}`}
      unreadCount={unreadCount}
    >
      {children}
    </DashboardShell>
  );
}
