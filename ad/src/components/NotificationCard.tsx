import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { COLORS, EASINGS } from "../theme";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "600"],
  subsets: ["latin"],
});

type Props = {
  title?: string;
  message?: string;
  delay?: number;
  style?: React.CSSProperties;
};

export const NotificationCard: React.FC<Props> = ({
  title = "Zeyvo",
  message = "Leave now. Your turn is in 10 minutes.",
  delay = 0,
  style,
}) => {
  const frame = useCurrentFrame();

  const slideX = interpolate(frame, [delay, delay + 25], [400, 0], {
    easing: EASINGS.cinematicEnter,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const opacity = interpolate(frame, [delay, delay + 15], [0, 1], {
    easing: EASINGS.cinematicEnter,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "18px 24px",
        background: "rgba(10, 10, 20, 0.85)",
        backdropFilter: "blur(30px)",
        border: `1px solid ${COLORS.glassBorder}`,
        borderRadius: 16,
        transform: `translateX(${slideX}px)`,
        opacity,
        boxShadow: `0 0 40px ${COLORS.accentGlow}, 0 20px 60px rgba(0,0,0,0.5)`,
        maxWidth: 420,
        ...style,
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentDeep})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          fontSize: 20,
          color: "#000",
          fontWeight: 800,
          fontFamily,
        }}
      >
        Z
      </div>
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontFamily,
            fontSize: 14,
            fontWeight: 600,
            color: COLORS.textMuted,
            marginBottom: 4,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontFamily,
            fontSize: 16,
            fontWeight: 400,
            color: COLORS.text,
            lineHeight: 1.4,
          }}
        >
          {message}
        </div>
      </div>
    </div>
  );
};
