import type { Metadata } from "next";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { QuotationCard } from "@/features/quotations/components/quotation-card";
import { requireCustomer } from "@/lib/auth/guards";
import { listQuotations } from "@/services/quotations";

export const metadata: Metadata = {
  title: "Quotations",
};

export default async function CustomerQuotationsPage() {
  const user = await requireCustomer();
  const quotations = await listQuotations({
    customerId: user.profileId ?? user.clerkUserId,
    pageSize: 50,
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Quotations"
        description="Offers received for your requests."
      />

      {quotations.data.length === 0 ? (
        <EmptyState
          title="No quotations yet"
          description="Professionals will send quotations after you post a request."
          action={
            <a
              href="/customer/requests/new"
              className="text-sm text-primary underline-offset-4 hover:underline"
            >
              Post a request
            </a>
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
