import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { CinematicText } from "../components/CinematicText";
import { VolumetricGlow } from "../components/VolumetricGlow";
import { FloatingParticles } from "../components/FloatingParticles";
import { COLORS, EASINGS } from "../theme";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", {
  weights: ["300", "400"],
  subsets: ["latin"],
});

/**
 * Scene 11 — Endcard (1:25–1:30, frames 0–150 local)
 * "Building the future of waiting." + zeyvo.tech + fade to black.
 */
export const Scene11_Endcard: React.FC = () => {
  const frame = useCurrentFrame();

  // Final fade to black
  const fadeToBlack = interpolate(frame, [120, 150], [0, 1], {
    easing: EASINGS.editorial,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const urlOpacity = interpolate(frame, [50, 70], [0, 0.5], {
    easing: EASINGS.editorial,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.background,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 40,
      }}
    >
      {/* Drifting digital dust */}
      <FloatingParticles count={15} color={COLORS.accent} />
      {/* Subtle glow */}
      <VolumetricGlow color={COLORS.accent} x="50%" y="50%" size={400} delay={0} intensity={0.06} />

      {/* Slogan */}
      <CinematicText
        text="Building the future of waiting."
        fontSize={52}
        fontWeight="300"
        delay={10}
        letterStagger={2}
        color={COLORS.text}
        style={{
          justifyContent: "center",
          textAlign: "center",
        }}
      />

      {/* URL */}
      <div
        style={{
          fontFamily,
          fontSize: 18,
          fontWeight: 300,
          color: COLORS.textMuted,
          opacity: urlOpacity,
          letterSpacing: "0.15em",
          textTransform: "lowercase",
        }}
      >
        zeyvo.tech
      </div>

      {/* Fade to black overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: COLORS.background,
          opacity: fadeToBlack,
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
