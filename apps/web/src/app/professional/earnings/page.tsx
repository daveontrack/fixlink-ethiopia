import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireProfessional } from "@/lib/auth/guards";
import { formatCurrency, formatDate } from "@/lib/format";
import { listCompletedBookingValues } from "@/services/professional-earnings";

export const metadata: Metadata = {
  title: "Earnings Summary",
  description: "Completed booking values based on accepted quotations.",
};

export default async function ProfessionalEarningsPage() {
  const user = await requireProfessional();
  const values = await listCompletedBookingValues(
    user.profileId ?? user.clerkUserId,
  );
  const totalQuotedValue = values.data.reduce(
    (sum, booking) => sum + booking.quotedValueETB,
    0,
  );
  const monthlyValues = new Map<string, number>();

  for (const booking of values.data) {
    const date = new Date(booking.completedAt);
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    monthlyValues.set(
      key,
      (monthlyValues.get(key) ?? 0) + booking.quotedValueETB,
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Earnings Summary"
        description="Completed booking values derived from accepted quotations. All values are in Ethiopian Birr (ETB)."
      />

      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
        These figures show the quoted value attached to completed bookings. FixLink does not record payment settlement, so they do not confirm money received.
      </div>

      {values.error ? (
        <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {values.error} Refresh the page to try again.
        </p>
      ) : values.data.length === 0 ? (
        <EmptyState
          title="No completed bookings yet"
          description="Completed booking values will appear here after jobs are marked complete."
        />
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Completed quoted value</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tracking-tight">
                {formatCurrency(totalQuotedValue)}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                From {values.data.length} completed bookings; this is not a payment total.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quoted value by completion month</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[...monthlyValues.entries()]
                .sort(([a], [b]) => b.localeCompare(a))
                .map(([month, amount]) => {
                  const [year, monthNumber] = month.split("-").map(Number);
                  const label = new Intl.DateTimeFormat("en-ET", {
                    month: "long",
                    year: "numeric",
                    timeZone: "UTC",
                  }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
                  return (
                    <div
                      key={month}
                      className="flex items-center justify-between gap-4 rounded-xl border border-border/70 p-4"
                    >
                      <p className="font-medium">{label}</p>
                      <p className="text-right font-semibold tabular-nums">
                        {formatCurrency(amount)}
                      </p>
                    </div>
                  );
                })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Completed bookings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {values.data.map((booking) => (
                <Link
                  key={booking.id}
                  href={`/professional/bookings/${booking.id}`}
                  className="flex items-center justify-between gap-4 rounded-xl border border-border/70 p-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                >
                  <span className="text-sm text-muted-foreground">
                    Completed {formatDate(booking.completedAt)}
                  </span>
                  <span className="font-semibold tabular-nums">
                    {formatCurrency(booking.quotedValueETB)}
                  </span>
                </Link>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
