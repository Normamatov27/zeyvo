"use client";

/**
 * Shared loading components for the zeyvo project.
 *
 *   <Loader/>            — minimal: 3 pulsing dots, inherits color
 *   <FullPageLoader/>    — centered queue-motif animation, sits inside the available space
 *   <LoadingScreen/>     — full-viewport loading with the zeyvo wordmark + tagline
 *
 * All three use the brand light-blue accent and zero external dependencies.
 */

import { useEffect, useState } from "react";

// ─── Inline 3-dot loader (button + inline use) ──────────────────────────────

export function Loader({ size = 14, color }: { size?: number; color?: string }) {
  const c = color ?? "currentColor";
  return (
    <span
      aria-label="Loading"
      role="status"
      style={{ display: "inline-flex", alignItems: "center", gap: size * 0.35 }}
    >
      <style>{KEYFRAMES}</style>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: size * 0.4,
            height: size * 0.4,
            borderRadius: "50%",
            background: c,
            display: "inline-block",
            animation: `zeyvo-dot-pulse 1.2s ${i * 0.15}s infinite ease-in-out`,
          }}
        />
      ))}
    </span>
  );
}

// ─── Mid-page loader (used inside a section) ────────────────────────────────

export function FullPageLoader({
  label,
  hint,
  variant = "default",
}: {
  label?: string;
  hint?: string;
  variant?: "default" | "dark";
}) {
  const dark = variant === "dark";
  return (
    <div
      role="status"
      aria-busy="true"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        flex: 1,
        minHeight: 280,
        gap: 22,
        padding: "40px 24px",
        color: dark ? "rgba(255,255,255,0.85)" : "var(--color-fg)",
      }}
    >
      <style>{KEYFRAMES}</style>

      {/* Queue motif: a row of 7 dots with a single bright dot sliding across */}
      <div
        style={{
          position: "relative",
          width: 144,
          height: 28,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <span
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: dark ? "rgba(255,255,255,0.12)" : "var(--color-border-2)",
            }}
          />
        ))}
        {/* Sliding active dot */}
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: 8,
            left: 0,
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: dark ? "oklch(0.78 0.14 220)" : "var(--color-primary)",
            boxShadow: dark
              ? "0 0 18px oklch(0.78 0.14 220 / 0.75)"
              : "0 0 18px var(--color-primary)",
            animation: "zeyvo-lane-slide 2.4s cubic-bezier(.6,.05,.4,1) infinite",
          }}
        />
      </div>

      {label && (
        <div style={{ fontSize: 14, fontWeight: 500, letterSpacing: -0.2 }}>{label}</div>
      )}
      {hint && (
        <div
          style={{
            fontSize: 11,
            fontFamily: "var(--font-mono)",
            color: dark ? "rgba(255,255,255,0.5)" : "var(--color-fg-3)",
            textTransform: "uppercase",
            letterSpacing: 0.5,
            textAlign: "center",
          }}
        >
          {hint}
        </div>
      )}
    </div>
  );
}

// ─── Full-viewport branded splash ───────────────────────────────────────────

export function LoadingScreen({
  label = "Loading…",
  hint,
  variant = "default",
}: {
  label?: string;
  hint?: string;
  variant?: "default" | "dark";
}) {
  const dark = variant === "dark";

  // Cycle the hint through phases so a long wait feels intentional
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setPhase((p) => (p + 1) % 4), 1500);
    return () => clearInterval(iv);
  }, []);

  const dotBg = dark
    ? "linear-gradient(180deg, #0a0e15 0%, #0d121b 100%)"
    : "var(--color-bg)";
  const fg = dark ? "#fff" : "var(--color-fg)";
  const accent = dark ? "oklch(0.78 0.14 220)" : "var(--color-primary)";

  return (
    <div
      role="status"
      aria-busy="true"
      style={{
        position: "fixed",
        inset: 0,
        background: dotBg,
        color: fg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 28,
        zIndex: 9999,
        fontFamily: "var(--font-sans)",
      }}
    >
      <style>{KEYFRAMES}</style>

      {/* Brand mark with subtle pulse halo */}
      <div style={{ position: "relative", display: "grid", placeItems: "center" }}>
        <span
          aria-hidden
          style={{
            position: "absolute",
            width: 88,
            height: 88,
            borderRadius: "50%",
            background: dark
              ? "radial-gradient(circle, oklch(0.78 0.14 220 / 0.25) 0%, transparent 70%)"
              : "radial-gradient(circle, var(--color-primary-soft) 0%, transparent 70%)",
            animation: "zeyvo-halo 2.2s ease-in-out infinite",
          }}
        />
        <div
          style={{
            position: "relative",
            width: 48,
            height: 48,
            borderRadius: 12,
            border: `1.5px solid ${dark ? "rgba(255,255,255,0.85)" : "var(--color-fg)"}`,
            display: "grid",
            placeItems: "center",
            fontFamily: "var(--font-mono)",
            fontWeight: 700,
            fontSize: 22,
            letterSpacing: -1,
          }}
        >
          Z
        </div>
      </div>

      {/* Queue-lane sliding dot */}
      <div
        style={{
          position: "relative",
          width: 168,
          height: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <span
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: dark ? "rgba(255,255,255,0.12)" : "var(--color-border-2)",
            }}
          />
        ))}
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: 6,
            left: 0,
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: accent,
            boxShadow: `0 0 18px ${accent}`,
            animation: "zeyvo-lane-slide-long 2.4s cubic-bezier(.6,.05,.4,1) infinite",
          }}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        <div style={{ fontSize: 15, fontWeight: 500, letterSpacing: -0.3 }}>{label}</div>
        <div
          style={{
            fontSize: 11,
            fontFamily: "var(--font-mono)",
            color: dark ? "rgba(255,255,255,0.5)" : "var(--color-fg-3)",
            textTransform: "uppercase",
            letterSpacing: 0.6,
            minHeight: 14,
          }}
        >
          {hint ?? PHASES[phase]}
        </div>
      </div>
    </div>
  );
}

// Hint phrases cycle while loading, in case it takes a moment
const PHASES = [
  "checking your queue · · ·",
  "syncing realtime · · ·",
  "almost there · · ·",
  "warming up · · ·",
];

// ─── Skeleton shimmer for content placeholders ──────────────────────────────

export function Skeleton({
  width,
  height,
  radius = 8,
  style,
}: {
  width?: number | string;
  height?: number | string;
  radius?: number;
  style?: React.CSSProperties;
}) {
  return (
    <>
      <style>{KEYFRAMES}</style>
      <span
        style={{
          display: "inline-block",
          width: width ?? "100%",
          height: height ?? 14,
          borderRadius: radius,
          background:
            "linear-gradient(90deg, var(--color-surface) 0%, var(--color-surface-2) 50%, var(--color-surface) 100%)",
          backgroundSize: "200% 100%",
          animation: "zeyvo-shimmer 1.6s ease-in-out infinite",
          ...style,
        }}
      />
    </>
  );
}

// ─── Shared keyframes ────────────────────────────────────────────────────────

const KEYFRAMES = `
@keyframes zeyvo-dot-pulse {
  0%, 70%, 100% { opacity: 0.25; transform: scale(0.9); }
  35%          { opacity: 1;    transform: scale(1.15); }
}
@keyframes zeyvo-lane-slide {
  0%   { left: 0;    transform: scale(0.85); }
  10%  {             transform: scale(1.1); }
  50%  { left: calc(100% - 12px); transform: scale(1); }
  60%  {             transform: scale(1.1); }
  100% { left: 0;    transform: scale(0.85); }
}
@keyframes zeyvo-lane-slide-long {
  0%   { left: 0;    transform: scale(0.85); opacity: 0.85; }
  10%  {             transform: scale(1.15); opacity: 1; }
  50%  { left: calc(100% - 12px); transform: scale(1); opacity: 1; }
  60%  {             transform: scale(1.15); opacity: 1; }
  100% { left: 0;    transform: scale(0.85); opacity: 0.85; }
}
@keyframes zeyvo-halo {
  0%, 100% { transform: scale(0.85); opacity: 0.4; }
  50%      { transform: scale(1.15); opacity: 0.8; }
}
@keyframes zeyvo-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
`;
