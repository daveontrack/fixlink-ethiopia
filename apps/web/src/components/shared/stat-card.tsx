import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  trend?: { value: string; positive?: boolean };
  className?: string;
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  trend,
  className,
}: StatCardProps) {
  const positive = trend?.positive !== false;

  return (
    <Card
      className={cn(
        "hover-lift relative overflow-hidden rounded-2xl border-border/60 py-0",
        className,
      )}
    >
      {/* Decorative accent glow */}
      <span
        className="pointer-events-none absolute -right-8 -top-10 size-28 rounded-full bg-[var(--role-soft)]/50 blur-2xl"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute -left-4 bottom-0 size-16 rounded-full bg-[var(--role-accent)]/5 blur-xl"
        aria-hidden
      />
      <CardContent className="relative flex items-start justify-between gap-4 p-5">
        <div className="min-w-0 space-y-1.5">
          <p className="text-[13px] font-medium text-muted-foreground">
            {label}
          </p>
          <p className="truncate text-[1.65rem] font-semibold leading-tight tracking-tight text-foreground">
            {value}
          </p>
          {hint ? (
            <p className="text-xs text-muted-foreground/80">{hint}</p>
          ) : null}
          {trend ? (
            <p
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                positive
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "bg-destructive/10 text-destructive",
              )}
            >
              {positive ? (
                <TrendingUp className="size-3" aria-hidden />
              ) : (
                <TrendingDown className="size-3" aria-hidden />
              )}
              {trend.value}
            </p>
          ) : null}
        </div>
        {Icon ? (
          <span className="role-soft-panel grid size-11 shrink-0 place-items-center rounded-2xl shadow-inner ring-1 ring-inset ring-[var(--role-accent)]/10">
            <Icon className="size-5" aria-hidden />
          </span>
        ) : null}
      </CardContent>
    </Card>
  );
}
