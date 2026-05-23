import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { CinematicText } from "../components/CinematicText";
import { NetworkNode } from "../components/NetworkNode";
import { VolumetricGlow } from "../components/VolumetricGlow";
import { DataStream } from "../components/DataStream";
import { FloatingParticles } from "../components/FloatingParticles";
import { COLORS, EASINGS } from "../theme";

/**
 * Scene 07 — Nervous System (0:45–0:55, frames 0–300 local)
 * "An intelligent nervous system for your physical space."
 * 3D-like orbiting visualization of a service center with flowing data.
 */
export const Scene07_NervousSystem: React.FC = () => {
  const frame = useCurrentFrame();

  // Camera orbit (subtle rotation)
  const rotateY = interpolate(frame, [0, 300], [-5, 5], {
    easing: EASINGS.editorial,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const textOpacity = interpolate(frame, [20, 50, 250, 280], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Building visualization — concentric rings representing the service center
  const ringCount = 4;
  const rings = Array.from({ length: ringCount }, (_, i) => {
    const ringOpacity = interpolate(frame, [30 + i * 15, 60 + i * 15], [0, 0.3 + i * 0.1], {
      easing: EASINGS.cinematicEnter,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const ringScale = interpolate(frame, [30 + i * 15, 80 + i * 15], [0.5, 1], {
      easing: EASINGS.dramatic,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const rotation = frame * (0.2 + i * 0.1) * (i % 2 === 0 ? 1 : -1);

    return { opacity: ringOpacity, scale: ringScale, rotation, key: i };
  });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.background }}>
      {/* Drifting network data particles */}
      <FloatingParticles count={25} color={COLORS.accent} />
      {/* Deep atmospheric glows */}
      <VolumetricGlow color={COLORS.accentDeep} x="50%" y="50%" size={1000} delay={0} intensity={0.1} />
      <VolumetricGlow color={COLORS.accent} x="50%" y="50%" size={400} delay={20} intensity={0.15} />

      {/* Orbiting rings */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: `translate(-50%, -50%) perspective(1000px) rotateY(${rotateY}deg)`,
        }}
      >
        {rings.map((ring) => (
          <div
            key={ring.key}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: 200 + ring.key * 150,
              height: 200 + ring.key * 150,
              transform: `translate(-50%, -50%) rotate(${ring.rotation}deg) scale(${ring.scale})`,
              border: `1px solid ${COLORS.accent}${Math.round(ring.opacity * 255).toString(16).padStart(2, "0")}`,
              borderRadius: "50%",
              opacity: ring.opacity,
            }}
          />
        ))}

        {/* Central "AI Core" */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${COLORS.accent}40 0%, ${COLORS.accent}05 70%)`,
            boxShadow: `0 0 60px ${COLORS.accent}30, 0 0 120px ${COLORS.accent}10`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: COLORS.accent,
              boxShadow: `0 0 20px ${COLORS.accent}`,
            }}
          />
        </div>

        {/* Network nodes around the core */}
        <NetworkNode
          delay={40}
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: 600,
            height: 600,
          }}
        />
      </div>

      {/* Data streams flowing */}
      <div
        style={{
          position: "absolute",
          left: "15%",
          right: "15%",
          bottom: "20%",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {Array.from({ length: 3 }, (_, i) => (
          <DataStream key={i} delay={60 + i * 20} />
        ))}
      </div>

      {/* Quote text */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: textOpacity,
        }}
      >
        <CinematicText
          text="An intelligent nervous system for your physical space."
          fontSize={30}
          fontWeight="300"
          fadeOnly
          delay={20}
          color={COLORS.textMuted}
          style={{ justifyContent: "center" }}
        />
      </div>
    </AbsoluteFill>
  );
};
