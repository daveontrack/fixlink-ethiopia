import {
  BadgeCheck,
  CalendarCheck,
  ClipboardList,
  FileText,
  Bell,
} from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookingCard } from "@/features/bookings/components/booking-card";
import { QuotationCard } from "@/features/quotations/components/quotation-card";
import { RequestCard } from "@/features/requests/components/request-card";
import { requireProfessional } from "@/lib/auth/guards";
import { formatRelativeTime } from "@/lib/format";
import { getOwnVerificationSummary } from "@/features/verification/queries";
import { listBookings } from "@/services/bookings";
import { listNotifications } from "@/services/notifications";
import { listQuotations } from "@/services/quotations";
import { listMatchedRequests } from "@/services/requests";

export default async function ProfessionalDashboardPage() {
  const user = await requireProfessional();
  const professionalId = user.profileId ?? user.clerkUserId;
  const now = new Date().toISOString();

  const [
    matchedRequests,
    pendingQuotations,
    upcomingBookings,
    activeBookings,
    completedBookings,
    verification,
    notifications,
  ] = await Promise.all([
    listMatchedRequests(professionalId, { pageSize: 5 }),
    listQuotations({ professionalId, status: "sent", pageSize: 5 }),
    listBookings({
      professionalId,
      status: "confirmed",
      scheduledAfter: now,
      pageSize: 5,
    }),
    listBookings({ professionalId, status: "in_progress", pageSize: 5 }),
    listBookings({ professionalId, status: "completed", pageSize: 1 }),
    user.profileId ? getOwnVerificationSummary(user.profileId) : null,
    listNotifications(user.profileId ?? user.clerkUserId, 5),
  ]);

  const work = [...upcomingBookings.data, ...activeBookings.data]
    .sort(
      (a, b) =>
        new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime(),
    )
    .slice(0, 5);
  const verificationStatus = verification?.status ?? "not_started";

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="A live overview of your matched work, quotations and bookings."
        actions={
          <Button asChild variant="outline">
            <Link href="/professional/verification">
              <BadgeCheck className="size-4" aria-hidden />
              Verification
            </Link>
          </Button>
        }
      />

      <Card className="flex flex-wrap items-center justify-between gap-4 border-[var(--role-accent)]/15 bg-white">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-[var(--role-soft)] text-[var(--role-ink)]">
            <BadgeCheck className="size-5" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold">Professional verification</p>
            <p className="text-sm text-muted-foreground">
              {verificationStatus === "approved"
                ? "Your profile can receive eligible requests."
                : verificationStatus === "rejected"
                  ? "Review the decision and resubmit corrected documents."
                  : verificationStatus === "pending"
                    ? "Your documents are waiting for administrator review."
                    : "Submit your documents to start verification."}
            </p>
          </div>
        </div>
        <StatusBadge
          status={verificationStatus}
          label={verificationStatus.replaceAll("_", " ")}
          kind="request"
        />
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Matched requests"
          value={matchedRequests.total}
          icon={ClipboardList}
          hint="Requests matched to your services"
        />
        <StatCard
          label="Pending quotations"
          value={pendingQuotations.total}
          icon={FileText}
          hint="Waiting for a customer decision"
        />
        <StatCard
          label="Upcoming & active jobs"
          value={upcomingBookings.total + activeBookings.total}
          icon={CalendarCheck}
          hint="Scheduled or in progress"
        />
        <StatCard
          label="Completed jobs"
          value={completedBookings.total}
          icon={CalendarCheck}
          hint="Completed bookings"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base tracking-tight">
              Requests to quote
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/professional/requests">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {matchedRequests.data.length === 0 ? (
              <EmptyState
                title="No matched requests"
                description="Requests matched to your services will appear here."
              />
            ) : (
              matchedRequests.data.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  href={`/professional/requests/${request.id}`}
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base tracking-tight">
              Pending quotations
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/professional/quotations?status=sent">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingQuotations.data.length === 0 ? (
              <EmptyState
                title="No pending quotations"
                description="Quotations awaiting a customer response will appear here."
                icon={FileText}
              />
            ) : (
              pendingQuotations.data.map((quotation) => (
                <QuotationCard key={quotation.id} quotation={quotation} />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base tracking-tight">Your work</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/professional/bookings">View bookings</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {work.length === 0 ? (
              <EmptyState
                title="No upcoming or active jobs"
                description="Accepted quotations and scheduled work appear here."
                icon={CalendarCheck}
              />
            ) : (
              work.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  counterpartyLabel="Customer"
                  href={`/professional/bookings/${booking.id}`}
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base tracking-tight">
              Recent notifications
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/professional/notifications">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {notifications.length === 0 ? (
              <EmptyState
                title="No notifications yet"
                description="Booking, quotation and message updates will appear here."
                icon={Bell}
              />
            ) : (
              notifications.map((notification) => {
                const content = (
                  <div className="flex items-start gap-3 rounded-xl border border-border/70 p-3">
                    <Bell
                      className={
                        notification.isRead
                          ? "mt-0.5 size-4 text-muted-foreground"
                          : "mt-0.5 size-4 text-[var(--role-ink)]"
                      }
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{notification.title}</p>
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {notification.body}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatRelativeTime(notification.createdAt)}
                      </p>
                    </div>
                    {!notification.isRead ? (
                      <span className="mt-1 size-2 shrink-0 rounded-full bg-[var(--role-accent)]" aria-label="Unread" />
                    ) : null}
                  </div>
                );

                return notification.href ? (
                  <Link
                    key={notification.id}
                    href={notification.href}
                    className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                  >
                    {content}
                  </Link>
                ) : (
                  <div key={notification.id}>{content}</div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
