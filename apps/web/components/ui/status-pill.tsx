import * as React from "react";
import { cn } from "@/lib/utils";
import type { TicketStatus } from "@/lib/types";

// Canonical mapping — one source of truth for ticket status display
const STATUS_CONFIG: Record<
  TicketStatus,
  { label: string; dot: string; pill: string }
> = {
  waiting:     { label: "Waiting",     dot: "bg-warning",  pill: "bg-warning-soft  text-warning  border-warning/20" },
  called:      { label: "Called",      dot: "bg-primary",  pill: "bg-primary-soft  text-primary  border-primary/20" },
  serving:     { label: "Serving",     dot: "bg-success",  pill: "bg-success-soft  text-success  border-success/20" },
  served:      { label: "Served",      dot: "bg-fg-4",     pill: "bg-surface-2     text-fg-3     border-border"     },
  no_show:     { label: "No-show",     dot: "bg-danger",   pill: "bg-danger-soft   text-danger   border-danger/20"  },
  cancelled:   { label: "Cancelled",   dot: "bg-fg-4",     pill: "bg-surface-2     text-fg-3     border-border"     },
  expired:     { label: "Expired",     dot: "bg-fg-4",     pill: "bg-surface-2     text-fg-4     border-border"     },
  transferred: { label: "Transferred", dot: "bg-violet",   pill: "bg-violet-soft   text-violet   border-violet/20"  },
};

interface StatusPillProps {
  status: TicketStatus;
  className?: string;
  /** "dot" shows only the colored dot without text (use inside compact cells) */
  dot?: boolean;
}

export function StatusPill({ status, className, dot }: StatusPillProps) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.waiting;

  if (dot) {
    return (
      <span
        className={cn("inline-block w-2.5 h-2.5 rounded-full flex-shrink-0", cfg.dot, className)}
        aria-label={cfg.label}
        title={cfg.label}
      />
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 h-6 px-2.5 text-xs font-medium rounded-pill border",
        cfg.pill,
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dot)} aria-hidden />
      {cfg.label}
    </span>
  );
}

// Also export the raw config for components that need colors directly
export { STATUS_CONFIG };
