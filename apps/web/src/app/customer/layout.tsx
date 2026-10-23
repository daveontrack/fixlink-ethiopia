import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireRole } from "@/lib/auth/guards";
import { countUnreadNotifications } from "@/services/notifications";

export const dynamic = "force-dynamic";

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("customer");
  const unreadCount = await countUnreadNotifications(
    user.profileId ?? user.clerkUserId,
  );

  return (
    <DashboardShell
      role="customer"
      title={`Welcome back, ${user.fullName}`}
      unreadCount={unreadCount}
    >
      {children}
    </DashboardShell>
  );
}
