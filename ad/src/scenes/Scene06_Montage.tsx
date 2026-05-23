import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { CinematicText } from "../components/CinematicText";
import { RollingNumber } from "../components/RollingNumber";
import { NotificationCard } from "../components/NotificationCard";
import { ProgressRing } from "../components/ProgressRing";
import { DataStream } from "../components/DataStream";
import { GlassmorphicPanel } from "../components/GlassmorphicPanel";
import { VolumetricGlow } from "../components/VolumetricGlow";
import { COLORS } from "../theme";

/**
 * Scene 06 — Montage (0:35–0:45, frames 0–300 local)
 * Rapid UI montage: AI ETA, smart notifications, analytics.
 */
export const Scene06_Montage: React.FC = () => {
  const frame = useCurrentFrame();

  // Phase transitions within montage

  const phase1Opacity = interpolate(frame, [0, 15, 80, 100], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const phase2Opacity = interpolate(frame, [80, 100, 170, 200], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const phase3Opacity = interpolate(frame, [170, 190, 280, 300], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.background }}>
      {/* Background glows */}
      <VolumetricGlow color={COLORS.accent} x="40%" y="50%" size={800} delay={0} intensity={0.06} />
      <VolumetricGlow color={COLORS.accentDeep} x="70%" y="40%" size={600} delay={0} intensity={0.05} />

      {/* Phase 1: AI ETA prediction */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 60,
          opacity: phase1Opacity,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <CinematicText
            text="AI ETA Prediction"
            fontSize={14}
            fontWeight="600"
            fadeOnly
            delay={5}
            color={COLORS.textMuted}
            style={{ textTransform: "uppercase", letterSpacing: "0.15em" } as React.CSSProperties}
          />
          <CinematicText
            text="Smart Balancing Active"
            fontSize={42}
            fontWeight="700"
            delay={8}
            letterStagger={1}
            color={COLORS.text}
          />
          <DataStream delay={15} style={{ width: 500, marginTop: 16 }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <ProgressRing progress={0.82} delay={10} size={160} label="Accuracy" />
          <RollingNumber from={0} to={97} suffix="%" delay={20} fontSize={28} color={COLORS.accent} />
        </div>
      </div>

      {/* Phase 2: Smart notification */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 30,
          opacity: phase2Opacity,
        }}
      >
        <CinematicText
          text="Intelligent Notifications"
          fontSize={48}
          fontWeight="600"
          fadeOnly
          delay={85}
          color={COLORS.text}
          style={{ justifyContent: "center" }}
        />
        <NotificationCard delay={95} />
        <NotificationCard
          delay={110}
          title="Smart Alert"
          message="Branch overload detected. Redirecting to Branch B."
          style={{ marginTop: -8 }}
        />
      </div>

      {/* Phase 3: Analytics flash */}
      <div
        style={{
          position: "absolute",
          inset: 80,
          display: "flex",
          gap: 24,
          opacity: phase3Opacity,
        }}
      >
        {[
          { label: "Daily Throughput", value: 1247, suffix: "" },
          { label: "Peak Hour Load", value: 89, suffix: "%" },
          { label: "Customer Score", value: 96, suffix: "/100" },
        ].map((stat, i) => (
          <GlassmorphicPanel
            key={stat.label}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: COLORS.textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
              }}
            >
              {stat.label}
            </div>
            <RollingNumber
              from={0}
              to={stat.value}
              delay={180 + i * 12}
              duration={40}
              fontSize={56}
              suffix={stat.suffix}
            />
          </GlassmorphicPanel>
        ))}
      </div>
    </AbsoluteFill>
  );
};
