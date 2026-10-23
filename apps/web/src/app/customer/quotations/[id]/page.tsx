import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QuotationActionButtons } from "@/features/quotations/components/quotation-action-buttons";
import { QuotationCard } from "@/features/quotations/components/quotation-card";
import { requireCustomer } from "@/lib/auth/guards";
import { formatCurrency, formatDate } from "@/lib/format";
import { getQuotation } from "@/services/quotations";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const quotation = await getQuotation(id);
  return { title: quotation ? `Quotation from ${quotation.professionalName}` : "Quotation" };
}

export default async function CustomerQuotationDetailPage({ params }: PageProps) {
  const { id } = await params;
  const user = await requireCustomer();

  const quotation = await getQuotation(id);
  if (!quotation) notFound();
  if (quotation.customerId && quotation.customerId !== user.profileId) notFound();

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Quotation from ${quotation.professionalName}`}
        description={`For: ${quotation.requestTitle}`}
        actions={<StatusBadge status={quotation.status} kind="quotation" />}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <QuotationCard
            quotation={quotation}
            actions={
              quotation.status === "sent" ? (
                <QuotationActionButtons quotationId={quotation.id} />
              ) : null
            }
          />
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Validity</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>Valid until {formatDate(quotation.validUntil)}</p>
              <p className="mt-2">
                Total: <span className="font-semibold text-foreground">{formatCurrency(quotation.total)}</span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Next steps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Accept this quotation to create a booking, or decline to wait for others.</p>
              <Button asChild size="sm" variant="outline" className="w-full">
                <Link href={`/customer/requests/${quotation.requestId}`}>
                  View request
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
