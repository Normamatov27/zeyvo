"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type ConnectionState = "connected" | "reconnecting" | "offline";

interface ConnectionBadgeProps {
  state: ConnectionState;
  /** Last-updated timestamp (ms epoch) — shows "Updated Xs ago" */
  updatedAt?: number;
  className?: string;
  /** Show just the dot without text */
  dotOnly?: boolean;
}

const CONFIG: Record<ConnectionState, { dot: string; label: string; text: string }> = {
  connected:    { dot: "bg-success", label: "Live",         text: "text-success" },
  reconnecting: { dot: "bg-warning animate-pulse", label: "Reconnecting…", text: "text-warning" },
  offline:      { dot: "bg-danger",  label: "Offline",      text: "text-danger" },
};

export function ConnectionBadge({ state, updatedAt, className, dotOnly }: ConnectionBadgeProps) {
  const cfg = CONFIG[state];
  const [ago, setAgo] = React.useState<string>("");

  React.useEffect(() => {
    if (!updatedAt) return;
    const update = () => {
      const s = Math.round((Date.now() - updatedAt) / 1000);
      setAgo(s < 5 ? "just now" : `${s}s ago`);
    };
    update();
    const id = setInterval(update, 5000);
    return () => clearInterval(id);
  }, [updatedAt]);

  if (dotOnly) {
    return (
      <span
        className={cn("inline-block w-2 h-2 rounded-full flex-shrink-0", cfg.dot, className)}
        aria-label={cfg.label}
        title={cfg.label}
      />
    );
  }

  return (
    <span
      aria-live="polite"
      aria-label={`Connection status: ${cfg.label}`}
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium",
        cfg.text,
        className
      )}
    >
      <span className={cn("w-2 h-2 rounded-full flex-shrink-0", cfg.dot)} aria-hidden />
      {cfg.label}
      {state === "connected" && updatedAt && ago && (
        <span className="text-fg-4 font-normal">· {ago}</span>
      )}
    </span>
  );
}
