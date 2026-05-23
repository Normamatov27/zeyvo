import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { COLORS, EASINGS } from "../theme";

type Props = {
  color?: string;
  x?: string;
  y?: string;
  size?: number;
  delay?: number;
  intensity?: number;
};

/**
 * Volumetric radial glow layer — creates depth and atmospheric lighting.
 */
export const VolumetricGlow: React.FC<Props> = ({
  color = COLORS.accent,
  x = "50%",
  y = "50%",
  size = 600,
  delay = 0,
  intensity = 0.15,
}) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [delay, delay + 40], [0, intensity], {
    easing: EASINGS.editorial,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Subtle breathing
  const breathe = Math.sin((frame - delay) * 0.03) * 0.02;

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: size,
        height: size,
        transform: "translate(-50%, -50%)",
        borderRadius: "50%",
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        opacity: opacity + breathe,
        pointerEvents: "none",
        filter: "blur(60px)",
      }}
    />
  );
};
