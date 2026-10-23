import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QuotationActionButtons } from "@/features/quotations/components/quotation-action-buttons";
import { QuotationCard } from "@/features/quotations/components/quotation-card";
import { requireCustomer } from "@/lib/auth/guards";
import { formatCurrency, formatDate } from "@/lib/format";
import { listQuotations } from "@/services/quotations";
import { getRequest } from "@/services/requests";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const request = await getRequest(id);
  return { title: request?.title ?? "Request" };
}

export default async function CustomerRequestDetailPage({ params }: PageProps) {
  const { id } = await params;
  const user = await requireCustomer();

  const request = await getRequest(id);

  if (!request) notFound();
  if (request.customerId && request.customerId !== user.profileId) notFound();

  const quotations = await listQuotations({ requestId: id, pageSize: 20 });

  return (
    <div className="space-y-8">
      <PageHeader
        title={request.title}
        description={`${request.category.name} · posted ${formatDate(request.createdAt)}`}
        actions={<StatusBadge status={request.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Request details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p className="whitespace-pre-line text-muted-foreground">
                {request.description}
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5" aria-hidden />
                  {request.subCity ? `${request.subCity}, ` : ""}
                  {request.city}
                </span>
                {request.scheduledDate ? (
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="size-3.5" aria-hidden />
                    {formatDate(request.scheduledDate)}
                  </span>
                ) : null}
                <span className="capitalize">Priority: {request.priority}</span>
                {request.budgetMax ? (
                  <span className="font-medium text-foreground">
                    Budget up to {formatCurrency(request.budgetMax)}
                  </span>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold tracking-tight">
              Quotations ({quotations.total})
            </h2>
            {quotations.data.length === 0 ? (
              <EmptyState
                title="No quotations yet"
                description="Verified professionals matching your request will send quotations here. Check back shortly."
                action={
                  <Button asChild variant="outline" size="sm">
                    <Link href="/customer/messages">Message professionals</Link>
                  </Button>
                }
              />
            ) : (
              quotations.data.map((quotation) => (
                <QuotationCard
                  key={quotation.id}
                  quotation={quotation}
                  actions={
                    quotation.status === "sent" ? (
                      <QuotationActionButtons quotationId={quotation.id} />
                    ) : null
                  }
                />
              ))
            )}
          </div>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Next steps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <ol className="list-decimal space-y-2 pl-4">
                <li>Compare the quotations you received.</li>
                <li>Accept the one you prefer to create a booking.</li>
                <li>Agree the date in chat with the professional.</li>
                <li>Rate the job once it is complete.</li>
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Need help?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                You can chat with the professional before accepting, or contact
                support if something goes wrong.
              </p>
              <div className="flex gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href="/customer/messages">Open messages</Link>
                </Button>
                <Button asChild size="sm" variant="ghost">
                  <Link href="/contact">Support</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
