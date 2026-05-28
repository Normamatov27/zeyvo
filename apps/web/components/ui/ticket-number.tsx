import * as React from "react";
import { cn } from "@/lib/utils";
import type { TicketStatus } from "@/lib/types";

// TicketNumber — the large focal number shown in operator console + signage
interface TicketNumberProps {
  number: string;
  status?: TicketStatus;
  /** "lg" is the operator console focal number; "sm" is list/signage use */
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  /** Show the live pulse ring (only for "calling" states) */
  live?: boolean;
}

const SIZE: Record<NonNullable<TicketNumberProps["size"]>, string> = {
  sm: "text-2xl  font-bold  tracking-tight",
  md: "text-4xl  font-bold  tracking-tight",
  lg: "text-6xl  font-extrabold tracking-tighter",
  xl: "text-8xl  font-black  tracking-tighter",
};

const STATUS_COLOR: Partial<Record<TicketStatus, string>> = {
  called:  "text-primary",
  serving: "text-success",
  no_show: "text-danger",
  waiting: "text-fg",
};

export function TicketNumber({ number, status, size = "lg", className, live }: TicketNumberProps) {
  const colorClass = status ? (STATUS_COLOR[status] ?? "text-fg") : "text-fg";

  return (
    <span
      className={cn(
        "relative inline-block tabular-nums font-mono leading-none select-none",
        SIZE[size],
        colorClass,
        live && "z-live",
        className
      )}
      aria-label={`Ticket ${number}`}
    >
      {number}
    </span>
  );
}
