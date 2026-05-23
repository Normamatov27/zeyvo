import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { COLORS, EASINGS } from "../theme";

type Props = {
  rows?: number;
  cols?: number;
  delay?: number;
  style?: React.CSSProperties;
};

/**
 * Animated pulsing heatmap grid — simulates live branch efficiency data.
 */
export const HeatmapGrid: React.FC<Props> = ({
  rows = 4,
  cols = 6,
  delay = 0,
  style,
}) => {
  const frame = useCurrentFrame();

  const gridOpacity = interpolate(frame, [delay, delay + 30], [0, 1], {
    easing: EASINGS.cinematicEnter,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const cells = Array.from({ length: rows * cols }, (_, i) => {
    // Deterministic "random" efficiency value per cell
    const seed = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    const baseValue = (seed - Math.floor(seed)) * 100;

    // Animate values with slight pulsing
    const pulse = Math.sin((frame - delay + i * 7) * 0.05) * 8;
    const value = Math.max(0, Math.min(100, baseValue + pulse));

    const cellColor =
      value > 80
        ? COLORS.accent
        : value > 50
          ? COLORS.accentDeep
          : value > 30
            ? "#1a3a5c"
            : "#0d1520";

    const cellOpacity = interpolate(
      frame,
      [delay + i * 2, delay + i * 2 + 20],
      [0, 0.7 + value * 0.003],
      {
        easing: EASINGS.cinematicEnter,
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      },
    );

    return { value, color: cellColor, opacity: cellOpacity, key: i };
  });

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
        gap: 3,
        opacity: gridOpacity,
        ...style,
      }}
    >
      {cells.map((cell) => (
        <div
          key={cell.key}
          style={{
            width: "100%",
            aspectRatio: "1.6",
            background: cell.color,
            opacity: cell.opacity,
            borderRadius: 4,
            boxShadow:
              cell.value > 70
                ? `0 0 12px ${cell.color}40`
                : undefined,
          }}
        />
      ))}
    </div>
  );
};
