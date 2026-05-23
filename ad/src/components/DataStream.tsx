import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { COLORS, EASINGS } from "../theme";

type Props = {
  delay?: number;
  color?: string;
  style?: React.CSSProperties;
};

/**
 * Animated horizontal data stream — particles flowing along a glowing line.
 */
export const DataStream: React.FC<Props> = ({
  delay = 0,
  color = COLORS.accent,
  style,
}) => {
  const frame = useCurrentFrame();

  const lineOpacity = interpolate(frame, [delay, delay + 20], [0, 1], {
    easing: EASINGS.cinematicEnter,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const particleCount = 8;
  const particles = Array.from({ length: particleCount }, (_, i) => {
    const offset = (frame - delay + i * 15) % 120;
    const x = interpolate(offset, [0, 120], [0, 100], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const particleOpacity =
      frame > delay
        ? interpolate(x, [0, 20, 80, 100], [0, 1, 1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })
        : 0;

    return { x, opacity: particleOpacity, key: i };
  });

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: 4,
        opacity: lineOpacity,
        ...style,
      }}
    >
      {/* Base line */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(90deg, transparent, ${color}20, ${color}40, ${color}20, transparent)`,
          borderRadius: 2,
        }}
      />
      {/* Glow */}
      <div
        style={{
          position: "absolute",
          top: -8,
          bottom: -8,
          left: 0,
          right: 0,
          background: `linear-gradient(90deg, transparent, ${color}10, ${color}15, ${color}10, transparent)`,
          filter: "blur(8px)",
        }}
      />
      {/* Particles */}
      {particles.map((p) => (
        <div
          key={p.key}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: color,
            opacity: p.opacity,
            boxShadow: `0 0 12px ${color}, 0 0 24px ${color}60`,
          }}
        />
      ))}
    </div>
  );
};
