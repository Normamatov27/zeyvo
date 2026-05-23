import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { COLORS, EASINGS } from "../theme";

type Props = {
  progress?: number;
  size?: number;
  delay?: number;
  label?: string;
  style?: React.CSSProperties;
};

export const ProgressRing: React.FC<Props> = ({
  progress: targetProgress = 0.65,
  size = 140,
  delay = 0,
  label = "ETA",
  style,
}) => {
  const frame = useCurrentFrame();

  const animatedProgress = interpolate(
    frame,
    [delay, delay + 60],
    [0, targetProgress],
    {
      easing: EASINGS.counter,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  const opacity = interpolate(frame, [delay, delay + 20], [0, 1], {
    easing: EASINGS.cinematicEnter,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const strokeWidth = 3;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - animatedProgress);

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        opacity,
        ...style,
      }}
    >
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={COLORS.surfaceLight}
          strokeWidth={strokeWidth}
        />
        {/* Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={COLORS.accent}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{
            filter: `drop-shadow(0 0 8px ${COLORS.accent}60)`,
          }}
        />
      </svg>
      {/* Center label */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontSize: size * 0.22,
            fontWeight: 700,
            color: COLORS.text,
          }}
        >
          {Math.round(animatedProgress * 100)}%
        </div>
        <div
          style={{
            fontSize: size * 0.1,
            color: COLORS.textMuted,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          {label}
        </div>
      </div>
    </div>
  );
};
