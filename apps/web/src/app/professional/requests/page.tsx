import type { Metadata } from "next";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { RequestCard } from "@/features/requests/components/request-card";
import { requireProfessional } from "@/lib/auth/guards";
import { listOpenRequests } from "@/services/requests";

export const metadata: Metadata = {
  title: "Requests",
};

export default async function ProfessionalRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  await requireProfessional();
  const { search } = await searchParams;

  const requests = await listOpenRequests({ search, pageSize: 50 });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Open requests"
        description="Requests from customers that are currently open for quotations."
      />

      {requests.data.length === 0 ? (
        <EmptyState
          title="No open requests"
          description="New customer requests in your service categories will appear here."
        />
      ) : (
        <div className="space-y-3">
          {requests.data.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              href={`/professional/requests/${request.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
