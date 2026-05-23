import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { CinematicText } from "../components/CinematicText";
import { GlassmorphicPanel } from "../components/GlassmorphicPanel";
import { HeatmapGrid } from "../components/HeatmapGrid";
import { RollingNumber } from "../components/RollingNumber";
import { VolumetricGlow } from "../components/VolumetricGlow";
import { FloatingParticles } from "../components/FloatingParticles";
import { COLORS, EASINGS } from "../theme";

/**
 * Scene 04 — Dashboard (0:28–0:35, frames 0–210 local)
 * Enterprise dashboard materializes from the data stream.
 */
export const Scene04_Dashboard: React.FC = () => {
  const frame = useCurrentFrame();

  const dashboardScale = interpolate(frame, [0, 40], [0.85, 1], {
    easing: EASINGS.cinematicEnter,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const dashboardOpacity = interpolate(frame, [0, 30], [0, 1], {
    easing: EASINGS.editorial,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.background }}>
      {/* Drifting digital dashboard dust */}
      <FloatingParticles count={15} color={COLORS.accent} />
      {/* Background glow */}
      <VolumetricGlow color={COLORS.accentDeep} x="50%" y="50%" size={1200} delay={0} intensity={0.08} />

      {/* Dashboard container */}
      <div
        style={{
          position: "absolute",
          inset: 60,
          display: "flex",
          gap: 24,
          transform: `scale(${dashboardScale})`,
          opacity: dashboardOpacity,
          perspective: 1200,
        }}
      >
        {/* Sidebar */}
        <GlassmorphicPanel
          style={{
            width: 280,
            display: "flex",
            flexDirection: "column",
            gap: 16,
            padding: 24,
          }}
        >
          <CinematicText
            text="ZEYVO"
            fontSize={18}
            fontWeight="800"
            delay={10}
            fadeOnly
            color={COLORS.accent}
            style={{ letterSpacing: "0.2em" }}
          />

          <div style={{ height: 1, background: COLORS.glassBorder, margin: "8px 0" }} />

          {["Overview", "Branches", "Analytics", "Staff", "Settings"].map((item, i) => {
            const itemOpacity = interpolate(frame, [20 + i * 5, 30 + i * 5], [0, 1], {
              easing: EASINGS.cinematicEnter,
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            return (
              <div
                key={item}
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: i === 0 ? COLORS.accentGlow : "transparent",
                  color: i === 0 ? COLORS.accent : COLORS.textMuted,
                  fontSize: 14,
                  fontWeight: i === 0 ? 600 : 400,
                  opacity: itemOpacity,
                }}
              >
                {item}
              </div>
            );
          })}
        </GlassmorphicPanel>

        {/* Main content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Header */}
          <CinematicText
            text="Operational Intelligence"
            fontSize={36}
            fontWeight="700"
            delay={15}
            letterStagger={1}
            style={{ marginBottom: 8 }}
          />

          {/* Metric cards row */}
          <div style={{ display: "flex", gap: 16 }}>
            {[
              { label: "Active Queues", from: 0, to: 47, suffix: "", color: COLORS.accent },
              { label: "Avg Wait Time", from: 0, to: 4, suffix: " min", color: COLORS.accent },
              { label: "Branch Efficiency", from: 0, to: 94, suffix: "%", color: COLORS.accent },
              { label: "Throughput/hr", from: 0, to: 128, suffix: "", color: COLORS.accentDeep },
            ].map((metric, i) => (
              <GlassmorphicPanel
                key={metric.label}
                style={{
                  flex: 1,
                  padding: 20,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
                glowColor={metric.color}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: COLORS.textMuted,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                  }}
                >
                  {metric.label}
                </div>
                <RollingNumber
                  from={metric.from}
                  to={metric.to}
                  delay={30 + i * 10}
                  duration={50}
                  fontSize={36}
                  suffix={metric.suffix}
                  color={metric.color}
                />
              </GlassmorphicPanel>
            ))}
          </div>

          {/* Heatmap + Chart area */}
          <div style={{ display: "flex", gap: 16, flex: 1 }}>
            <GlassmorphicPanel style={{ flex: 2, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Branch Efficiency Heatmap
              </div>
              <HeatmapGrid rows={5} cols={8} delay={40} style={{ flex: 1 }} />
            </GlassmorphicPanel>

            <GlassmorphicPanel style={{ flex: 1, padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Live Queue
              </div>
              {["A-047 — Counter 3", "A-048 — Waiting", "A-049 — Waiting", "A-050 — Waiting", "A-051 — Waiting"].map((item, i) => {
                const rowOpacity = interpolate(frame, [50 + i * 6, 60 + i * 6], [0, 1], {
                  easing: EASINGS.cinematicEnter,
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                });
                return (
                  <div
                    key={item}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 6,
                      background: i === 0 ? COLORS.accentGlow : COLORS.glass,
                      fontSize: 13,
                      color: i === 0 ? COLORS.accent : COLORS.textMuted,
                      fontWeight: i === 0 ? 600 : 400,
                      opacity: rowOpacity,
                      borderLeft: i === 0 ? `2px solid ${COLORS.accent}` : "2px solid transparent",
                    }}
                  >
                    {item}
                  </div>
                );
              })}
            </GlassmorphicPanel>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
