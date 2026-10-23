import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { QuotationCard } from "@/features/quotations/components/quotation-card";
import { requireProfessional } from "@/lib/auth/guards";
import { listQuotations } from "@/services/quotations";
import { QUOTATION_STATUS_LABEL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Quotations",
};

export default async function ProfessionalQuotationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requireProfessional();
  const { status } = await searchParams;

  const quotations = await listQuotations({
    professionalId: user.profileId ?? user.clerkUserId,
    status,
    pageSize: 50,
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Quotations"
        description="Every quotation you have sent to customers."
        actions={
          <Button asChild>
            <Link href="/professional/requests">Quote on a request</Link>
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Button asChild variant={status ? "outline" : "secondary"} size="sm">
          <Link href="/professional/quotations">All</Link>
        </Button>
        {Object.entries(QUOTATION_STATUS_LABEL).map(([value, label]) => (
          <Button
            key={value}
            asChild
            variant={status === value ? "secondary" : "outline"}
            size="sm"
          >
            <Link href={`/professional/quotations?status=${value}`}>{label}</Link>
          </Button>
        ))}
      </div>

      {quotations.data.length === 0 ? (
        <EmptyState
          title="No quotations yet"
          description="Open requests from customers are waiting for your quotation."
          action={
            <Button asChild size="sm">
              <Link href="/professional/requests">Browse requests</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {quotations.data.map((quotation) => (
            <QuotationCard key={quotation.id} quotation={quotation} />
          ))}
        </div>
      )}
    </div>
  );
}
