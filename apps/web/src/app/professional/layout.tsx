import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireRole } from "@/lib/auth/guards";

export default async function ProfessionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("professional");

  return (
    <DashboardShell
      role="professional"
      title={`Welcome back, ${user.fullName}`}
    >
      {children}
    </DashboardShell>
  );
}
