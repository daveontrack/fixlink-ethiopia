import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireRole } from "@/lib/auth/guards";
import { countUnreadNotifications } from "@/services/notifications";

export default async function ProfessionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("professional");
  const unreadCount = await countUnreadNotifications(
    user.profileId ?? user.clerkUserId,
  );

  return (
    <DashboardShell
      role="professional"
      title={`Welcome back, ${user.fullName}`}
      unreadCount={unreadCount}
    >
      {children}
    </DashboardShell>
  );
}
