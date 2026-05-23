import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { loadFont } from "@remotion/google-fonts/JetBrainsMono";
import { COLORS, EASINGS } from "../theme";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "700"],
  subsets: ["latin"],
});

type Props = {
  from: number;
  to: number;
  delay?: number;
  duration?: number;
  fontSize?: number;
  suffix?: string;
  prefix?: string;
  color?: string;
  style?: React.CSSProperties;
};

export const RollingNumber: React.FC<Props> = ({
  from,
  to,
  delay = 0,
  duration = 60,
  fontSize = 64,
  suffix = "",
  prefix = "",
  color = COLORS.accent,
  style,
}) => {
  const frame = useCurrentFrame();

  const progress = interpolate(frame, [delay, delay + duration], [0, 1], {
    easing: EASINGS.counter,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const value = Math.round(from + (to - from) * progress);
  const opacity = interpolate(frame, [delay, delay + 15], [0, 1], {
    easing: EASINGS.cinematicEnter,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        fontFamily,
        fontSize,
        fontWeight: 700,
        color,
        opacity,
        fontVariantNumeric: "tabular-nums",
        textShadow: `0 0 40px ${color}40`,
        ...style,
      }}
    >
      {prefix}
      {value}
      {suffix}
    </div>
  );
};
