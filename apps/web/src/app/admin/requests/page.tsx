import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { RequestCard } from "@/features/requests/components/request-card";
import { requireAdmin } from "@/lib/auth/guards";
import { listAllRequests } from "@/services/requests";

export const metadata: Metadata = { title: "Requests" };

export default async function AdminRequestsPage() {
  await requireAdmin();

  // Admins see all requests — fetch open ones plus a broad list.
  const all = await listAllRequests({ pageSize: 100 });

  const requests = all.data;

  return (
    <div className="space-y-8">
      <PageHeader title="Requests" description="All customer service requests." />

      {requests.length === 0 ? (
        <EmptyState title="No requests yet" description="Customer requests appear here." />
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
