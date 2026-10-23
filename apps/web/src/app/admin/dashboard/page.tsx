import type { Metadata } from "next";
import { Users, BriefcaseBusiness, ClipboardList, CalendarCheck, Wallet } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { AdminCharts } from "@/features/admin/components/admin-charts";
import { requireAdmin } from "@/lib/auth/guards";
import { formatCurrency } from "@/lib/format";
import { getAdminOverview } from "@/services/analytics";

export const metadata: Metadata = {
  title: "Admin dashboard",
};

export default async function AdminDashboardPage() {
  await requireAdmin();
  const overview = await getAdminOverview();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Marketplace health at a glance."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Customers" value={overview.totals.customers} icon={Users} />
        <StatCard
          label="Professionals"
          value={overview.totals.professionals}
          icon={BriefcaseBusiness}
        />
        <StatCard
          label="Open requests"
          value={overview.totals.openRequests}
          icon={ClipboardList}
        />
        <StatCard
          label="Active bookings"
          value={overview.totals.activeBookings}
          icon={CalendarCheck}
        />
        <StatCard
          label="Revenue"
          value={formatCurrency(overview.totals.revenue)}
          icon={Wallet}
        />
      </div>

      <AdminCharts overview={overview} />
    </div>
  );
}
