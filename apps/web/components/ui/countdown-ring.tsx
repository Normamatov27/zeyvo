"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// CountdownRing — animated SVG ring showing remaining time in a grace period
interface CountdownRingProps {
  /** Total duration in seconds */
  total: number;
  /** Remaining seconds */
  remaining: number;
  /** Size in px (default 80) */
  size?: number;
  /** Ring stroke width (default 6) */
  strokeWidth?: number;
  className?: string;
  /** Center content — defaults to the remaining seconds */
  children?: React.ReactNode;
}

export function CountdownRing({
  total,
  remaining,
  size = 80,
  strokeWidth = 6,
  className,
  children,
}: CountdownRingProps) {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = Math.max(0, Math.min(1, remaining / total));
  const dashOffset = circumference * (1 - progress);

  // Color shifts red as time runs low
  const urgent = progress < 0.25;
  const warn   = progress < 0.5;
  const color  = urgent ? "oklch(0.58 0.2 25)" : warn ? "oklch(0.74 0.15 70)" : "oklch(0.62 0.14 150)";

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="timer"
      aria-label={`${remaining} seconds remaining`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{
            transformOrigin: "center",
            transform: "rotate(-90deg)",
            transition: "stroke-dashoffset 1s linear, stroke 0.5s ease",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children ?? (
          <span
            className={cn(
              "text-lg font-semibold tabular-nums",
              urgent ? "text-danger" : warn ? "text-warning" : "text-success"
            )}
          >
            {remaining}
          </span>
        )}
      </div>
    </div>
  );
}
