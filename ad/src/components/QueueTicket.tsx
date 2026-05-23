import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { COLORS, EASINGS } from "../theme";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "600", "700"],
  subsets: ["latin"],
});

type Props = {
  ticketNumber?: string;
  position?: number;
  eta?: string;
  delay?: number;
  style?: React.CSSProperties;
};

export const QueueTicket: React.FC<Props> = ({
  ticketNumber = "#047",
  position = 3,
  eta = "8 min",
  delay = 0,
  style,
}) => {
  const frame = useCurrentFrame();

  const scale = interpolate(frame, [delay, delay + 25], [0.7, 1], {
    easing: EASINGS.cinematicEnter,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const opacity = interpolate(frame, [delay, delay + 20], [0, 1], {
    easing: EASINGS.cinematicEnter,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Glowing border animation
  const glowIntensity = Math.sin((frame - delay) * 0.08) * 0.3 + 0.7;

  return (
    <div
      style={{
        width: 320,
        padding: "36px 32px",
        background: "rgba(5, 5, 15, 0.9)",
        border: `1px solid ${COLORS.accent}30`,
        borderRadius: 20,
        transform: `scale(${scale})`,
        opacity,
        boxShadow: `0 0 ${40 * glowIntensity}px ${COLORS.accent}20, 0 0 ${80 * glowIntensity}px ${COLORS.accent}08`,
        textAlign: "center",
        ...style,
      }}
    >
      {/* Header */}
      <div
        style={{
          fontFamily,
          fontSize: 12,
          fontWeight: 600,
          color: COLORS.textMuted,
          textTransform: "uppercase",
          letterSpacing: "0.15em",
          marginBottom: 16,
        }}
      >
        Digital Ticket
      </div>

      {/* Number */}
      <div
        style={{
          fontFamily,
          fontSize: 56,
          fontWeight: 700,
          color: COLORS.text,
          letterSpacing: "-0.02em",
          marginBottom: 24,
        }}
      >
        {ticketNumber}
      </div>

      {/* Info row */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 40,
        }}
      >
        <div>
          <div
            style={{
              fontFamily,
              fontSize: 11,
              color: COLORS.textMuted,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: 6,
            }}
          >
            Position
          </div>
          <div
            style={{
              fontFamily,
              fontSize: 28,
              fontWeight: 700,
              color: COLORS.accent,
            }}
          >
            {position}
          </div>
        </div>
        <div>
          <div
            style={{
              fontFamily,
              fontSize: 11,
              color: COLORS.textMuted,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: 6,
            }}
          >
            ETA
          </div>
          <div
            style={{
              fontFamily,
              fontSize: 28,
              fontWeight: 700,
              color: COLORS.accent,
            }}
          >
            {eta}
          </div>
        </div>
      </div>
    </div>
  );
};
