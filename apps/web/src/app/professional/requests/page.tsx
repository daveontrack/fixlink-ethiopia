import type { Metadata } from "next";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { SearchForm } from "@/components/shared/search-form";
import { RequestCard } from "@/features/requests/components/request-card";
import { requireProfessional } from "@/lib/auth/guards";
import { listMatchedRequests } from "@/services/requests";

export const metadata: Metadata = {
  title: "Requests",
};

export default async function ProfessionalRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const user = await requireProfessional();
  const professionalId = user.profileId ?? user.clerkUserId;
  const { search } = await searchParams;

  const requests = await listMatchedRequests(professionalId, { search, pageSize: 50 });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Incoming Requests"
        description="Requests matched to you that are awaiting your quotation."
      />

      <SearchForm
        action="/professional/requests"
        defaultValue={search}
        placeholder="Search open requests by title…"
        label="Search open requests"
      />

      {requests.data.length === 0 ? (
        <EmptyState
          title={search ? "No matching requests" : "No open requests"}
          description={
            search
              ? `Nothing matches “${search}”. Try a different search term.`
              : "New customer requests in your service categories will appear here."
          }
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
