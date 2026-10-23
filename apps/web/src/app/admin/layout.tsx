import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireRole } from "@/lib/auth/guards";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("admin");

  return (
    <DashboardShell role="admin" title={`Admin · ${user.fullName}`}>
      {children}
    </DashboardShell>
  );
}
