import { Badge } from "@/components/ui/badge";
import {
  BOOKING_STATUS_LABEL,
  QUOTATION_STATUS_LABEL,
  REQUEST_STATUS_LABEL,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

type Tone = "default" | "success" | "warning" | "destructive" | "info" | "muted";

const TONE_CLASS: Record<Tone, string> = {
  default: "bg-primary/10 text-primary border-primary/20",
  success: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
  warning: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
  destructive: "bg-destructive/10 text-destructive border-destructive/20",
  info: "bg-sky-500/10 text-sky-600 border-sky-500/20 dark:text-sky-400",
  muted: "bg-muted text-muted-foreground border-border",
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
    kind === "booking"
      ? BOOKING_TONE[status]
      : kind === "quotation"
        ? QUOTATION_TONE[status]
        : REQUEST_TONE[status];

  const fallbackLabel =
    kind === "booking"
      ? BOOKING_STATUS_LABEL[status]
      : kind === "quotation"
        ? QUOTATION_STATUS_LABEL[status]
        : REQUEST_STATUS_LABEL[status];

  return (
    <Badge
      variant="outline"
      className={cn("font-medium capitalize", TONE_CLASS[tone ?? "muted"], className)}
    >
      {label ?? fallbackLabel ?? status}
    </Badge>
  );
}
