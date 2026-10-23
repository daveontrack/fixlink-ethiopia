import { TopNavShell } from "@/components/layout/top-nav-shell";
import { requireRole } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("customer");

  return (
    <TopNavShell title={`Welcome back, ${user.fullName}`}>
      {children}
    </TopNavShell>
  );
}
