import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { ZeyvoLogo } from "../components/ZeyvoLogo";
import { VolumetricGlow } from "../components/VolumetricGlow";
import { FloatingParticles } from "../components/FloatingParticles";
import { COLORS, EASINGS } from "../theme";

/**
 * Scene 10 — Logo Reveal (1:20–1:25, frames 0–150 local)
 * Map collapses into a single point of light, morphs into the Zeyvo logo.
 */
export const Scene10_LogoReveal: React.FC = () => {
  const frame = useCurrentFrame();

  // Point of light collapsing
  const pointScale = interpolate(frame, [0, 40], [20, 1], {
    easing: EASINGS.dramatic,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const pointOpacity = interpolate(frame, [0, 20, 50, 70], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Logo appears after the collapse
  const logoDelay = 50;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.background,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Burst of digital dust settling into the logo */}
      {frame > logoDelay && <FloatingParticles count={30} color={COLORS.accent} />}

      {/* Volumetric glow */}
      <VolumetricGlow color={COLORS.accent} x="50%" y="50%" size={500} delay={30} intensity={0.2} />
      <VolumetricGlow color={COLORS.accentDeep} x="50%" y="50%" size={800} delay={40} intensity={0.08} />

      {/* Collapsing point */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: `translate(-50%, -50%) scale(${pointScale})`,
          width: 4,
          height: 4,
          borderRadius: "50%",
          background: COLORS.accent,
          opacity: pointOpacity,
          boxShadow: `0 0 60px ${COLORS.accent}, 0 0 120px ${COLORS.accent}60`,
        }}
      />

      {/* Logo */}
      <ZeyvoLogo delay={logoDelay} size={180} />
    </AbsoluteFill>
  );
};
