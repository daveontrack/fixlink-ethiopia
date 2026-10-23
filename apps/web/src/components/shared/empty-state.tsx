import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl border border-dashed border-[var(--role-accent)]/25 bg-card/60 px-6 py-14 text-center",
        className,
      )}
    >
      <span
        className="pointer-events-none absolute inset-x-10 top-0 h-28 bg-[radial-gradient(ellipse_at_top,var(--role-soft),transparent_70%)] opacity-70"
        aria-hidden
      />
      <div className="role-soft-panel relative grid size-14 place-items-center rounded-2xl shadow-inner ring-1 ring-inset ring-[var(--role-accent)]/10">
        <Icon className="size-6" aria-hidden />
      </div>
      <div className="relative space-y-1.5">
        <p className="text-base font-semibold text-foreground">{title}</p>
        {description ? (
          <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="relative">{action}</div> : null}
    </div>
  );
}

export function EmptyStateAction({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Button asChild size="sm">
      <a href={href}>{children}</a>
    </Button>
  );
}
