import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { CinematicText } from "../components/CinematicText";
import { RollingNumber } from "../components/RollingNumber";

import { VolumetricGlow } from "../components/VolumetricGlow";
import { FloatingParticles } from "../components/FloatingParticles";
import { HeatmapGrid } from "../components/HeatmapGrid";
import { COLORS, EASINGS } from "../theme";

/**
 * Scene 08 — Perfection (0:55–1:10, frames 0–450 local)
 * Split-screen: calm empty room vs. dashboard showing 50 people in queue.
 * Operational perfection.
 */
export const Scene08_Perfection: React.FC = () => {
  const frame = useCurrentFrame();

  // Split reveal animation
  const splitPosition = interpolate(frame, [0, 40], [100, 50], {
    easing: EASINGS.dramatic,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const leftOpacity = interpolate(frame, [0, 30], [0, 1], {
    easing: EASINGS.editorial,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const rightOpacity = interpolate(frame, [15, 45], [0, 1], {
    easing: EASINGS.editorial,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.background }}>
      {/* Left side — "Physical Space: Calm" */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: `${splitPosition}%`,
          height: "100%",
          overflow: "hidden",
          opacity: leftOpacity,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(135deg, ${COLORS.surface} 0%, #050510 100%)`,
          }}
        />
        <FloatingParticles count={10} color={COLORS.accent} />
        <VolumetricGlow color={COLORS.accent} x="50%" y="50%" size={400} delay={10} intensity={0.04} />

        {/* Calm waiting room visualization */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 32,
          }}
        >
          <CinematicText
            text="Physical Space"
            fontSize={16}
            fontWeight="600"
            fadeOnly
            delay={20}
            color={COLORS.textMuted}
            style={{ textTransform: "uppercase", letterSpacing: "0.2em" } as React.CSSProperties}
          />
          <CinematicText
            text="Calm. Efficient."
            fontSize={48}
            fontWeight="200"
            fadeOnly
            delay={30}
            color={COLORS.text}
          />

          {/* Abstract chairs — empty, orderly */}
          <div style={{ display: "flex", gap: 20, marginTop: 40 }}>
            {Array.from({ length: 6 }, (_, i) => {
              const chairOpacity = interpolate(frame, [50 + i * 5, 65 + i * 5], [0, 0.3], {
                easing: EASINGS.cinematicEnter,
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              return (
                <div
                  key={i}
                  style={{
                    width: 40,
                    height: 50,
                    borderRadius: 8,
                    border: `1px solid ${COLORS.glassBorder}`,
                    background: COLORS.glass,
                    opacity: chairOpacity,
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div
        style={{
          position: "absolute",
          left: `${splitPosition}%`,
          top: 0,
          width: 2,
          height: "100%",
          background: `linear-gradient(180deg, transparent, ${COLORS.accent}60, transparent)`,
          transform: "translateX(-50%)",
          zIndex: 10,
        }}
      />

      {/* Right side — "Digital Layer: 50 in queue" */}
      <div
        style={{
          position: "absolute",
          left: `${splitPosition}%`,
          top: 0,
          right: 0,
          height: "100%",
          overflow: "hidden",
          opacity: rightOpacity,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(135deg, #050510 0%, ${COLORS.surface} 100%)`,
          }}
        />
        <FloatingParticles count={10} color={COLORS.accentDeep} />
        <VolumetricGlow color={COLORS.accentDeep} x="50%" y="50%" size={400} delay={20} intensity={0.06} />

        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 24,
          }}
        >
          <CinematicText
            text="Digital Layer"
            fontSize={16}
            fontWeight="600"
            fadeOnly
            delay={35}
            color={COLORS.textMuted}
            style={{ textTransform: "uppercase", letterSpacing: "0.2em" } as React.CSSProperties}
          />

          <RollingNumber
            from={0}
            to={50}
            delay={40}
            duration={45}
            fontSize={72}
            suffix=" in queue"
            style={{ display: "flex", alignItems: "baseline", gap: 8 }}
          />

          <CinematicText
            text="All arriving precisely when needed."
            fontSize={20}
            fontWeight="300"
            fadeOnly
            delay={70}
            color={COLORS.textMuted}
            style={{ justifyContent: "center" }}
          />

          <HeatmapGrid rows={3} cols={5} delay={55} style={{ width: 300, marginTop: 20 }} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
