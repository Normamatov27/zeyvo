import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { COLORS, EASINGS } from "../theme";

const { fontFamily } = loadFont("normal", {
  weights: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  subsets: ["latin"],
});

type Props = {
  text: string;
  fontSize?: number;
  fontWeight?: string;
  color?: string;
  delay?: number;
  letterStagger?: number;
  style?: React.CSSProperties;
  fadeOnly?: boolean;
};

export const CinematicText: React.FC<Props> = ({
  text,
  fontSize = 72,
  fontWeight = "700",
  color = COLORS.text,
  delay = 0,
  letterStagger = 2,
  style,
  fadeOnly = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (fadeOnly) {
    const opacity = interpolate(frame, [delay, delay + fps], [0, 1], {
      easing: EASINGS.editorial,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

    const blur = interpolate(frame, [delay, delay + fps], [12, 0], {
      easing: EASINGS.editorial,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

    const tracking = interpolate(frame, [delay, delay + fps * 1.5], [0.15, fontSize > 60 ? -0.03 : -0.01], {
      easing: EASINGS.editorial,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

    return (
      <div
        style={{
          fontFamily,
          fontSize,
          fontWeight,
          color,
          opacity,
          filter: `blur(${blur}px)`,
          letterSpacing: `${tracking}em`,
          lineHeight: 1.1,
          ...style,
        }}
      >
        {text}
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        fontFamily,
        fontSize,
        fontWeight,
        color,
        letterSpacing: fontSize > 60 ? "-0.03em" : "-0.01em",
        lineHeight: 1.1,
        ...style,
      }}
    >
      {text.split("").map((char, i) => {
        const charDelay = delay + i * letterStagger;
        const opacity = interpolate(
          frame,
          [charDelay, charDelay + 15],
          [0, 1],
          {
            easing: EASINGS.cinematicEnter,
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }
        );
        const y = interpolate(frame, [charDelay, charDelay + 15], [15, 0], {
          easing: EASINGS.cinematicEnter,
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const blur = interpolate(frame, [charDelay, charDelay + 12], [8, 0], {
          easing: EASINGS.cinematicEnter,
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        return (
          <span
            key={i}
            style={{
              opacity,
              transform: `translateY(${y}px)`,
              filter: `blur(${blur}px)`,
              display: "inline-block",
              whiteSpace: char === " " ? "pre" : undefined,
            }}
          >
            {char}
          </span>
        );
      })}
    </div>
  );
};
