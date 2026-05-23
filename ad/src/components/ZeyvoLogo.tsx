import React from "react";
import { useCurrentFrame, interpolate, Img, staticFile } from "remotion";
import { COLORS, EASINGS } from "../theme";

type Props = {
  delay?: number;
  size?: number;
  style?: React.CSSProperties;
  showText?: boolean;
};

export const ZeyvoLogo: React.FC<Props> = ({
  delay = 0,
  size = 120,
  style,
  showText = true,
}) => {
  const frame = useCurrentFrame();

  const scale = interpolate(frame, [delay, delay + 30], [0.5, 1], {
    easing: EASINGS.cinematicEnter,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const opacity = interpolate(frame, [delay, delay + 25], [0, 1], {
    easing: EASINGS.editorial,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const glowIntensity = Math.sin((frame - delay) * 0.04) * 0.3 + 0.7;

  const textOpacity = interpolate(frame, [delay + 20, delay + 40], [0, 1], {
    easing: EASINGS.editorial,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 24,
        opacity,
        transform: `scale(${scale})`,
        ...style,
      }}
    >
      {/* Logo Mark */}
      <div
        style={{
          width: size,
          height: size,
          position: "relative",
        }}
      >
        <Img
          src={staticFile("logo.png")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            filter: `drop-shadow(0 0 ${30 * glowIntensity}px ${COLORS.accent}50)`,
          }}
        />
      </div>

      {showText && (
        <div
          style={{
            fontSize: size * 0.4,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            opacity: textOpacity,
            textShadow: `0 0 40px ${COLORS.accent}30`,
          }}
        >
          ZEYVO
        </div>
      )}
    </div>
  );
};
