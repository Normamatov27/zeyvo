import React from "react";

interface LiveDotProps {
  color?: string;
  size?: number;
}

/** Pulsing live indicator — port of z-live CSS class + dot from primitives.jsx */
export function LiveDot({ color = "var(--color-success)", size = 8 }: LiveDotProps) {
  return (
    <span
      className="z-live"
      style={{
        display: "inline-block",
        position: "relative",
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        color,
        flexShrink: 0,
      }}
    />
  );
}
