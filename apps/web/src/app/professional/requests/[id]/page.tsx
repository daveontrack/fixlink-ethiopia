import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QuotationCard } from "@/features/quotations/components/quotation-card";
import { QuotationForm } from "@/features/quotations/components/quotation-form";
import { requireProfessional } from "@/lib/auth/guards";
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

export default async function ProfessionalRequestDetailPage({
  params,
}: PageProps) {
  const { id } = await params;
  const user = await requireProfessional();

  const request = await getRequest(id);
  if (!request) notFound();

  const quotations = await listQuotations({
    requestId: id,
    professionalId: user.profileId ?? user.clerkUserId,
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title={request.title}
        description={`${request.category.name} · ${request.city}`}
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
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span className="capitalize">Priority: {request.priority}</span>
                {request.scheduledDate ? (
                  <span>Preferred: {formatDate(request.scheduledDate)}</span>
                ) : null}
                {request.budgetMax ? (
                  <span className="font-medium text-foreground">
                    Customer budget up to {formatCurrency(request.budgetMax)}
                  </span>
                ) : null}
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/professional/messages">Message customer</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your quotations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {quotations.data.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  You have not quoted on this request yet.
                </p>
              ) : (
                quotations.data.map((quotation) => (
                  <QuotationCard key={quotation.id} quotation={quotation} />
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Send a quotation</CardTitle>
          </CardHeader>
          <CardContent>
            <QuotationForm requestId={request.id} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
