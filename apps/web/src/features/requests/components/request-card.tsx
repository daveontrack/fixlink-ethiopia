import { CalendarDays, MapPin } from "lucide-react";
import Link from "next/link";

import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDate, formatRelativeTime } from "@/lib/format";
import type { ServiceRequest } from "@/types";

interface RequestCardProps {
  request: ServiceRequest;
  href?: string;
  footer?: React.ReactNode;
}

export function RequestCard({ request, href, footer }: RequestCardProps) {
  const target = href ?? `/customer/requests/${request.id}`;

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href={target}
              className="font-medium underline-offset-4 hover:underline"
            >
              {request.title}
            </Link>
            <p className="text-sm text-muted-foreground">
              {request.category.name}
            </p>
          </div>
          <StatusBadge status={request.status} />
        </div>

        <p className="line-clamp-2 text-sm text-muted-foreground">
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
          <span>{formatRelativeTime(request.createdAt)}</span>
          {request.budgetMax ? (
            <span className="font-medium text-foreground">
              Up to {formatCurrency(request.budgetMax)}
            </span>
          ) : null}
        </div>

        {footer}
      </CardContent>
    </Card>
  );
}
