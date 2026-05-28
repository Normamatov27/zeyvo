import * as React from "react";
import { cn } from "@/lib/utils";

// Stat — a labelled metric cell used in dashboards and KPI rows
interface StatProps {
  label: React.ReactNode;
  value: React.ReactNode;
  /** Sub-value or comparison string */
  sub?: React.ReactNode;
  /** Optional icon or colored indicator */
  icon?: React.ReactNode;
  /** Color the value: "success" | "warning" | "danger" | "primary" */
  tone?: "success" | "warning" | "danger" | "primary" | "muted";
  className?: string;
  /** Compact horizontal layout (icon + value side-by-side) */
  inline?: boolean;
}

const TONE_CLASS: Record<NonNullable<StatProps["tone"]>, string> = {
  success: "text-success",
  warning: "text-warning",
  danger:  "text-danger",
  primary: "text-primary",
  muted:   "text-fg-3",
};

export function Stat({ label, value, sub, icon, tone, className, inline }: StatProps) {
  return (
    <div className={cn("flex flex-col gap-1", inline && "flex-row items-center gap-3", className)}>
      {icon && <div className="text-fg-3 flex-shrink-0">{icon}</div>}
      <div className="flex flex-col gap-0.5 min-w-0">
        <p className="text-xs font-medium text-fg-4 uppercase tracking-wide leading-none truncate">
          {label}
        </p>
        <p
          className={cn(
            "text-2xl font-semibold tabular-nums leading-none",
            tone ? TONE_CLASS[tone] : "text-fg"
          )}
        >
          {value}
        </p>
        {sub && <p className="text-xs text-fg-4 leading-snug">{sub}</p>}
      </div>
    </div>
  );
}

// KpiCell — dense grid cell variant (card bg + border)
interface KpiCellProps extends StatProps {
  /** Show a colored left border strip */
  accent?: "success" | "warning" | "danger" | "primary";
}

const ACCENT_CLASS: Record<NonNullable<KpiCellProps["accent"]>, string> = {
  success: "border-l-success",
  warning: "border-l-warning",
  danger:  "border-l-danger",
  primary: "border-l-primary",
};

export function KpiCell({ accent, className, ...props }: KpiCellProps) {
  return (
    <div
      className={cn(
        "bg-surface border border-border rounded-3 shadow-1 px-4 py-3 border-l-4",
        accent ? ACCENT_CLASS[accent] : "border-l-border",
        className
      )}
    >
      <Stat {...props} />
    </div>
  );
}
