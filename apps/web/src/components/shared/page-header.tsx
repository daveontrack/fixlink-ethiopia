import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumb?: ReactNode;
}

export function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-5 border-b border-border/50 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 space-y-2">
        {breadcrumb}
        <div className="flex items-center gap-3">
          <span
            className="role-gradient hidden h-9 w-1 shrink-0 rounded-full shadow-sm shadow-[color-mix(in_srgb,var(--role-accent)_25%,transparent)] sm:block"
            aria-hidden
          />
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {title}
            </h1>
            {description ? (
              <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
        </div>
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
