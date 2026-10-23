import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { RequestCard } from "@/features/requests/components/request-card";
import { requireCustomer } from "@/lib/auth/guards";
import { listRequests } from "@/services/requests";
import { REQUEST_STATUS_LABEL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "My requests",
};

export default async function CustomerRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requireCustomer();
  const { status } = await searchParams;

  const requests = await listRequests(user.profileId ?? user.clerkUserId, {
    status,
    pageSize: 50,
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="My requests"
        description="Every service request you have posted."
        actions={
          <Button asChild>
            <Link href="/customer/requests/new">
              <Plus className="size-4" aria-hidden />
              New request
            </Link>
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Button asChild variant={status ? "outline" : "default"} size="sm">
          <Link href="/customer/requests">All</Link>
        </Button>
        {Object.entries(REQUEST_STATUS_LABEL).map(([value, label]) => (
          <Button
            key={value}
            asChild
            variant={status === value ? "default" : "outline"}
            size="sm"
          >
            <Link href={`/customer/requests?status=${value}`}>{label}</Link>
          </Button>
        ))}
      </div>

      {requests.data.length === 0 ? (
        <EmptyState
          title="No requests found"
          description="Post a request and verified professionals in Diredawa will send you quotations."
          action={
            <Button asChild size="sm">
              <Link href="/customer/requests/new">Post a request</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {requests.data.map((request) => (
            <RequestCard key={request.id} request={request} />
          ))}
        </div>
      )}
    </div>
  );
}
