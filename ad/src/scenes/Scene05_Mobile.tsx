import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { CinematicText } from "../components/CinematicText";
import { QueueTicket } from "../components/QueueTicket";
import { ProgressRing } from "../components/ProgressRing";
import { VolumetricGlow } from "../components/VolumetricGlow";
import { FloatingParticles } from "../components/FloatingParticles";
import { GlassmorphicPanel } from "../components/GlassmorphicPanel";
import { COLORS, EASINGS } from "../theme";

/**
 * Scene 05 — Mobile Experience (0:28–0:35, frames 0–210 local)
 * Mobile-first view: Telegram Mini App — join queue flow.
 */
export const Scene05_Mobile: React.FC = () => {
  const frame = useCurrentFrame();

  // Phone frame sliding up
  const phoneY = interpolate(frame, [0, 30], [200, 0], {
    easing: EASINGS.cinematicEnter,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const phoneOpacity = interpolate(frame, [0, 25], [0, 1], {
    easing: EASINGS.editorial,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.background }}>
      {/* Floating particles in mobile flow */}
      <FloatingParticles count={20} color={COLORS.accent} />
      {/* Background glow */}
      <VolumetricGlow color={COLORS.accent} x="50%" y="60%" size={600} delay={0} intensity={0.1} />
      <VolumetricGlow color={COLORS.accentDeep} x="50%" y="40%" size={400} delay={10} intensity={0.08} />

      {/* Title */}
      <div style={{ position: "absolute", top: 80, left: 0, right: 0, textAlign: "center" }}>
        <CinematicText
          text="Zero Friction. Pure Flow."
          fontSize={48}
          fontWeight="300"
          fadeOnly
          delay={5}
          color={COLORS.text}
          style={{ justifyContent: "center" }}
        />
        <div style={{ marginTop: 16 }}>
          <CinematicText
            text="Join any queue. From anywhere."
            fontSize={20}
            fontWeight="400"
            fadeOnly
            delay={20}
            color={COLORS.textMuted}
            style={{ justifyContent: "center" }}
          />
        </div>
      </div>

      {/* Phone mockup area */}
      <div
        style={{
          position: "absolute",
          bottom: 60,
          left: "50%",
          transform: `translateX(-50%) translateY(${phoneY}px)`,
          opacity: phoneOpacity,
          display: "flex",
          gap: 40,
          alignItems: "flex-end",
        }}
      >
        {/* Phone 1 — Branch Selection */}
        <GlassmorphicPanel
          style={{
            width: 260,
            height: 500,
            padding: 20,
            borderRadius: 24,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            transform: "scale(0.9)",
            opacity: 0.7,
          }}
        >
          <div style={{ fontSize: 11, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 8 }}>
            Select Branch
          </div>
          {["Central Clinic", "Main Bank", "Service Center A", "University Office"].map((branch, i) => {
            const itemOpacity = interpolate(frame, [30 + i * 8, 42 + i * 8], [0, 1], {
              easing: EASINGS.cinematicEnter,
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            return (
              <div
                key={branch}
                style={{
                  padding: "14px 16px",
                  borderRadius: 10,
                  background: i === 0 ? COLORS.accentGlow : COLORS.glass,
                  border: `1px solid ${i === 0 ? COLORS.accent + "30" : COLORS.glassBorder}`,
                  fontSize: 14,
                  color: i === 0 ? COLORS.accent : COLORS.text,
                  opacity: itemOpacity,
                }}
              >
                {branch}
              </div>
            );
          })}
        </GlassmorphicPanel>

        {/* Phone 2 — Active Ticket (center, larger) */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
          <QueueTicket delay={15} />
          <ProgressRing delay={25} progress={0.65} size={100} label="Queue" />
        </div>

        {/* Phone 3 — Notification */}
        <GlassmorphicPanel
          style={{
            width: 260,
            height: 500,
            padding: 20,
            borderRadius: 24,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: 20,
            transform: "scale(0.9)",
            opacity: 0.7,
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 8 }}>🔔</div>
          <CinematicText
            text="Your turn is next"
            fontSize={22}
            fontWeight="600"
            fadeOnly
            delay={60}
            color={COLORS.text}
            style={{ textAlign: "center", justifyContent: "center" }}
          />
          <CinematicText
            text="Proceed to Counter 3"
            fontSize={16}
            fontWeight="400"
            fadeOnly
            delay={75}
            color={COLORS.accent}
            style={{ textAlign: "center", justifyContent: "center" }}
          />
        </GlassmorphicPanel>
      </div>
    </AbsoluteFill>
  );
};
