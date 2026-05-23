import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { CinematicText } from "../components/CinematicText";
import { DataStream } from "../components/DataStream";
import { VolumetricGlow } from "../components/VolumetricGlow";
import { FloatingParticles } from "../components/FloatingParticles";
import { COLORS, EASINGS } from "../theme";

/**
 * Scene 03 — Silence & Ignition (0:20–0:28, frames 0–240 local)
 * Total silence. Out of darkness, a blue data stream ignites.
 * Voiceover: "Until now."
 */
export const Scene03_Silence: React.FC = () => {
  const frame = useCurrentFrame();

  // "Until now" text
  const textOpacity = interpolate(frame, [30, 50, 160, 200], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Blue glow igniting
  const glowBuild = interpolate(frame, [0, 120], [0, 1], {
    easing: EASINGS.editorial,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Multiple data streams appearing
  const streamCount = 5;

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.background }}>
      {/* Floating cyan data dust */}
      <FloatingParticles count={20} color={COLORS.accent} />
      {/* Central glow ignition */}
      <VolumetricGlow
        color={COLORS.accent}
        x="50%"
        y="50%"
        size={400 + glowBuild * 600}
        delay={10}
        intensity={0.05 + glowBuild * 0.2}
      />

      {/* Secondary deep blue glow */}
      <VolumetricGlow
        color={COLORS.accentDeep}
        x="30%"
        y="60%"
        size={500}
        delay={30}
        intensity={0.1}
      />

      {/* Data streams */}
      <div
        style={{
          position: "absolute",
          left: "10%",
          right: "10%",
          top: "40%",
          display: "flex",
          flexDirection: "column",
          gap: 30,
        }}
      >
        {Array.from({ length: streamCount }, (_, i) => (
          <DataStream
            key={i}
            delay={40 + i * 15}
            color={i % 2 === 0 ? COLORS.accent : COLORS.accentDeep}
            style={{ opacity: 0.4 + i * 0.12 }}
          />
        ))}
      </div>

      {/* "Until now." */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: textOpacity,
        }}
      >
        <CinematicText
          text="Until now."
          fontSize={96}
          fontWeight="300"
          fadeOnly
          delay={30}
          style={{
            letterSpacing: "0.05em",
          }}
        />
      </div>

      {/* Vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.5) 100%)",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
