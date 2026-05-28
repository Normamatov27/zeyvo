import * as React from "react";
import { AlertTriangle, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Severity = "info" | "warn" | "critical";

interface AlertCardProps {
  severity?: Severity;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Recommended action button or link */
  action?: React.ReactNode;
  /** Dismiss callback — renders an X button */
  onDismiss?: () => void;
  className?: string;
}

const ICON: Record<Severity, React.ElementType> = {
  info:     Info,
  warn:     AlertTriangle,
  critical: AlertCircle,
};

const STYLE: Record<Severity, { wrap: string; icon: string }> = {
  info: {
    wrap: "bg-primary-soft border-primary/20",
    icon: "text-primary",
  },
  warn: {
    wrap: "bg-warning-soft border-warning/30",
    icon: "text-warning",
  },
  critical: {
    wrap: "bg-danger-soft border-danger/30",
    icon: "text-danger",
  },
};

export function AlertCard({
  severity = "info",
  title,
  description,
  action,
  onDismiss,
  className,
}: AlertCardProps) {
  const Icon = ICON[severity];
  const style = STYLE[severity];

  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 rounded-3 border px-4 py-3",
        style.wrap,
        className
      )}
    >
      <Icon size={18} className={cn("mt-0.5 flex-shrink-0", style.icon)} aria-hidden />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-fg leading-snug">{title}</p>
        {description && (
          <p className="mt-0.5 text-sm text-fg-3 leading-relaxed">{description}</p>
        )}
        {action && <div className="mt-2">{action}</div>}
      </div>

      {onDismiss && (
        <button
          onClick={onDismiss}
          className="flex-shrink-0 h-6 w-6 rounded-1 flex items-center justify-center text-fg-4 hover:text-fg hover:bg-black/5 transition-colors focus-visible:outline-none"
          aria-label="Dismiss alert"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}
