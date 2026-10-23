import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { SearchForm } from "@/components/shared/search-form";
import { Button } from "@/components/ui/button";
import { RequestCard } from "@/features/requests/components/request-card";
import { requireAdmin } from "@/lib/auth/guards";
import { listAllRequests } from "@/services/requests";

export const metadata: Metadata = { title: "Requests" };

export default async function AdminRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  await requireAdmin();
  const { search } = await searchParams;

  // Admins see all requests — fetch open ones plus a broad list.
  const all = await listAllRequests({ pageSize: 100, search });

  const requests = all.data;

  return (
    <div className="space-y-8">
      <PageHeader title="Requests" description="All customer service requests." />

      <SearchForm
        action="/admin/requests"
        defaultValue={search}
        placeholder="Search requests by title…"
        label="Search requests"
      />

      {requests.length === 0 ? (
        <EmptyState
          title={search ? "No matching requests" : "No requests yet"}
          description={
            search
              ? `Nothing matches “${search}”. Try a different search term.`
              : "Customer requests appear here."
          }
        />
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              href={`/customer/requests/${request.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
