import type { Metadata } from "next";
import Link from "next/link";
import {
  BadgeCheck,
  BriefcaseBusiness,
  CalendarCheck,
  ClipboardList,
  Users,
  Wallet,
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { AdminCharts } from "@/features/admin/components/admin-charts";
import { requireAdmin } from "@/lib/auth/guards";
import { getAdminOverview } from "@/services/analytics";

export const metadata: Metadata = {
  title: "Admin dashboard",
};

function showCount(value: number | null): string {
  return value === null ? "Unavailable" : value.toLocaleString("en-ET");
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await requireAdmin();
  const filters = await searchParams;
  const overview = await getAdminOverview(filters);
  const { totals } = overview;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Marketplace activity and operations from persisted data."
        actions={
          <Button asChild variant="outline">
            <Link href="/admin/verifications">
              <BadgeCheck className="size-4" aria-hidden />
              Review verifications
            </Link>
          </Button>
        }
      />

      <form
        action="/admin/dashboard"
        method="get"
        className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:flex-row sm:items-end"
        aria-label="Filter dashboard by record creation date"
      >
        <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
          From
          <input
            type="date"
            name="from"
            defaultValue={overview.range.from ?? ""}
            className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </label>
        <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
          Through
          <input
            type="date"
            name="to"
            defaultValue={overview.range.to ?? ""}
            className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </label>
        <div className="flex items-center gap-2">
          <Button type="submit">Apply dates</Button>
          {overview.range.from || overview.range.to ? (
            <Button asChild variant="ghost">
              <Link href="/admin/dashboard">Clear</Link>
            </Button>
          ) : null}
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground sm:ml-auto sm:max-w-xs">
          Filters record creation timestamps in UTC. Without dates, counts cover all records.
        </p>
      </form>

      {overview.filterError ? (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {overview.filterError}
        </div>
      ) : null}

      {overview.unavailableSources.length > 0 ? (
        <div role="alert" className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-900">
          Some analytics could not be loaded. Affected metrics are marked unavailable.
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <StatCard label="Customers" value={showCount(totals.customers)} icon={Users} />
        <StatCard
          label="Professionals"
          value={showCount(totals.professionals)}
          icon={BriefcaseBusiness}
          hint={`Verified: ${showCount(totals.verifiedProfessionals)} · pending: ${showCount(totals.pendingVerifications)}`}
        />
        <StatCard
          label="Open requests"
          value={showCount(totals.openRequests)}
          icon={ClipboardList}
          hint={`Out of ${showCount(totals.totalRequests)} requests created in range`}
        />
        <StatCard
          label="Active bookings"
          value={showCount(totals.activeBookings)}
          icon={CalendarCheck}
          hint={`Out of ${showCount(totals.totalBookings)} bookings created in range`}
        />
        <StatCard
          label="Quotations"
          value={showCount(totals.totalQuotations)}
          icon={BriefcaseBusiness}
          hint={`Submitted: ${showCount(totals.submittedQuotations)} · selected: ${showCount(totals.selectedQuotations)}`}
        />
        <StatCard
          label="Booking completion rate"
          value={totals.completionRate === null ? "—" : `${totals.completionRate}%`}
          icon={CalendarCheck}
          hint={
            totals.totalBookings === 0
              ? "No bookings in this date range"
              : `${showCount(totals.completedBookings)} completed of ${showCount(totals.totalBookings)}`
          }
        />
        <StatCard
          label="Revenue"
          value="Unavailable"
          icon={Wallet}
          hint={overview.revenueUnavailableReason}
        />
      </div>

      <AdminCharts overview={overview} />
    </div>
  );
}
