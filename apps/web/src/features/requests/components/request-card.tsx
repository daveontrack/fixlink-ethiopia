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
    <Card className="hover-lift group rounded-xl border-border/70 py-0 shadow-none">
      <CardContent className="space-y-3 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href={target}
              className="text-[15px] font-semibold tracking-tight underline-offset-4 transition-colors group-hover:text-[var(--role-ink)] hover:underline"
            >
              {request.title}
            </Link>
            <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {request.category.name}
            </p>
          </div>
          <StatusBadge status={request.status} />
        </div>

        <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {request.description}
        </p>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-3.5 text-[var(--role-accent)]" aria-hidden />
            {request.subCity ? `${request.subCity}, ` : ""}
            {request.city}
          </span>
          {request.scheduledDate ? (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays
                className="size-3.5 text-[var(--role-accent)]"
                aria-hidden
              />
              {formatDate(request.scheduledDate)}
            </span>
          ) : null}
          <span>{formatRelativeTime(request.createdAt)}</span>
          {request.budgetMax ? (
            <span className="ml-auto rounded-full bg-[var(--role-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--role-ink)]">
              Up to {formatCurrency(request.budgetMax)}
            </span>
          ) : null}
        </div>

        {footer}
      </CardContent>
    </Card>
  );
}
