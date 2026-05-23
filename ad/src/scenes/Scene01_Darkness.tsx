import React from "react";
import { AbsoluteFill } from "remotion";
import { CinematicText } from "../components/CinematicText";
import { COLORS } from "../theme";

/**
 * Scene 01 — Darkness (0:00–0:05, frames 0–150)
 * Pitch black. A harsh ticking sound implied. "Time." fades in center screen.
 */
export const Scene01_Darkness: React.FC = () => {

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.background,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Scanline overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(255,255,255,0.008) 2px,
            rgba(255,255,255,0.008) 4px
          )`,
          pointerEvents: "none",
        }}
      />

      {/* "Time." text — appears after 1s */}
      <CinematicText
        text="Time."
        fontSize={120}
        fontWeight="200"
        delay={30}
        letterStagger={4}
        color={COLORS.text}
        style={{
          letterSpacing: "0.1em",
        }}
      />

      {/* Very subtle vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
