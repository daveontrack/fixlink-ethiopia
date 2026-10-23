import { Badge } from "@/components/ui/badge";
import {
  BOOKING_STATUS_LABEL,
  QUOTATION_STATUS_LABEL,
  REQUEST_STATUS_LABEL,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

type Tone = "default" | "success" | "warning" | "destructive" | "info" | "muted";

const TONE_CLASS: Record<Tone, string> = {
  default:
    "border-[var(--role-accent)]/20 bg-[var(--role-soft)] text-[var(--role-ink)]",
  success:
    "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  warning:
    "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  destructive: "border-destructive/20 bg-destructive/10 text-destructive",
  info: "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  muted: "border-border bg-muted text-muted-foreground",
};

// Generic statuses (verification, payments) share the same tone vocabulary.
const GENERIC_TONE: Record<string, Tone> = {
  pending: "warning",
  approved: "success",
  verified: "success",
  active: "success",
  completed: "success",
  paid: "success",
  rejected: "destructive",
  failed: "destructive",
  suspended: "destructive",
  unverified: "muted",
  unsubmitted: "muted",
  refunded: "info",
};

const REQUEST_TONE: Record<string, Tone> = {
  open: "info",
  in_review: "warning",
  quoted: "default",
  accepted: "success",
  in_progress: "warning",
  completed: "success",
  cancelled: "muted",
};

const BOOKING_TONE: Record<string, Tone> = {
  pending: "warning",
  confirmed: "info",
  in_progress: "warning",
  completed: "success",
  cancelled: "muted",
};

const QUOTATION_TONE: Record<string, Tone> = {
  draft: "muted",
  sent: "info",
  accepted: "success",
  rejected: "destructive",
  expired: "muted",
  withdrawn: "muted",
};

interface StatusBadgeProps {
  status: string;
  kind?: "request" | "booking" | "quotation";
  label?: string;
  className?: string;
}

export function StatusBadge({
  status,
  kind = "request",
  label,
  className,
}: StatusBadgeProps) {
  const tone =
    (kind === "booking"
      ? BOOKING_TONE[status]
      : kind === "quotation"
        ? QUOTATION_TONE[status]
        : REQUEST_TONE[status]) ?? GENERIC_TONE[status];

  const fallbackLabel =
    kind === "booking"
      ? BOOKING_STATUS_LABEL[status]
      : kind === "quotation"
        ? QUOTATION_STATUS_LABEL[status]
        : REQUEST_STATUS_LABEL[status];

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 border py-0.5 text-[11px] font-semibold capitalize",
        TONE_CLASS[tone ?? "muted"],
        className,
      )}
    >
      {label ?? fallbackLabel ?? status}
    </Badge>
  );
}
