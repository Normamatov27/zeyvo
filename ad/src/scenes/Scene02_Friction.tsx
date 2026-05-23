import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Img, staticFile } from "remotion";
import { CinematicText } from "../components/CinematicText";
import { VolumetricGlow } from "../components/VolumetricGlow";
import { FloatingParticles } from "../components/FloatingParticles";
import { COLORS, EASINGS } from "../theme";

/**
 * Scene 02 — Friction (0:05–0:20, frames 0–450 local)
 * Chaotic red data knot visualization, voiceover implied.
 * "For decades, operational efficiency has stopped at the front door."
 * Red knot shatters into glass shards.
 */
export const Scene02_Friction: React.FC = () => {
  const frame = useCurrentFrame();

  // Phase 1: Chaos builds (0–300 local frames / 10 seconds)
  const chaosIntensity = interpolate(frame, [0, 300], [0.2, 1], {
    easing: EASINGS.editorial,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Phase 2: Shatter (last 150 frames)
  const shatterProgress = interpolate(frame, [300, 420], [0, 1], {
    easing: EASINGS.dramatic,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const shatterOpacity = interpolate(frame, [380, 450], [1, 0], {
    easing: EASINGS.exit,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Image scaling and rotation
  const imageScale = interpolate(frame, [0, 300], [0.9, 1.05], {
    easing: EASINGS.editorial,
  }) * (1 - shatterProgress * 0.2);

  const imageOpacity = interpolate(frame, [0, 60], [0, 0.45], {
    easing: EASINGS.editorial,
  }) * shatterOpacity;

  const imageRotation = interpolate(frame, [0, 450], [-5, 12]);

  // Generate chaotic "data knot" lines
  const lineCount = 30;
  const lines = Array.from({ length: lineCount }, (_, i) => {
    const seed = Math.sin(i * 127.1) * 43758.5453;
    const normalizedSeed = seed - Math.floor(seed);
    const angle = normalizedSeed * 360 + frame * (0.3 + normalizedSeed * 0.4) * chaosIntensity;
    const radius = 80 + normalizedSeed * 220 * chaosIntensity;
    const length = 100 + normalizedSeed * 250;

    // Shatter: lines explode outward
    const explodeX = shatterProgress * (normalizedSeed - 0.5) * 1800;
    const explodeY = shatterProgress * (Math.cos(i * 2.7) - 0.5) * 1200;

    return {
      key: i,
      angle,
      radius,
      length,
      explodeX,
      explodeY,
      opacity: (0.25 + normalizedSeed * 0.55) * chaosIntensity * shatterOpacity,
      thickness: 1 + normalizedSeed * 2.5,
    };
  });

  // Voiceover text
  const textOpacity = interpolate(frame, [60, 90, 280, 310], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.background }}>
      {/* Floating red atmospheric dust */}
      <FloatingParticles count={25} color={COLORS.danger} />

      {/* Red chaos glow */}
      <VolumetricGlow
        color={COLORS.danger}
        x="50%"
        y="50%"
        size={900}
        delay={0}
        intensity={0.28 * chaosIntensity}
      />

      {/* Stylized background problem chaos visualization */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "45%",
          transform: `translate(-50%, -50%) scale(${imageScale}) rotate(${imageRotation}deg)`,
          opacity: imageOpacity,
          width: 500,
          height: 500,
          borderRadius: "50%",
          overflow: "hidden",
          border: `1px solid ${COLORS.danger}30`,
          boxShadow: `0 0 100px ${COLORS.danger}20`,
          filter: "grayscale(30%) contrast(120%)",
        }}
      >
        <Img
          src={staticFile("problem.png")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
        {/* Dark radial vignette over the image */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(circle, transparent 20%, rgba(0,0,0,0.8) 100%)",
          }}
        />
      </div>

      {/* Data knot lines */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "45%",
          transform: "translate(-50%, -50%)",
        }}
      >
        {lines.map((line) => (
          <div
            key={line.key}
            style={{
              position: "absolute",
              width: line.length,
              height: line.thickness,
              background: `linear-gradient(90deg, transparent, ${COLORS.danger}${Math.round(line.opacity * 255).toString(16).padStart(2, "0")}, transparent)`,
              transform: `rotate(${line.angle}deg) translate(${line.radius + line.explodeX}px, ${line.explodeY}px)`,
              transformOrigin: "0% 50%",
              borderRadius: 2,
              boxShadow: line.opacity > 0.4 ? `0 0 10px ${COLORS.danger}50` : undefined,
            }}
          />
        ))}
      </div>

      {/* Voiceover text */}
      <div
        style={{
          position: "absolute",
          bottom: 120,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: textOpacity,
        }}
      >
        <CinematicText
          text="Operational efficiency has stopped at the front door."
          fontSize={32}
          fontWeight="300"
          fadeOnly
          delay={60}
          color={COLORS.textMuted}
          style={{ justifyContent: "center" }}
        />
      </div>

      {/* Vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.75) 100%)",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
