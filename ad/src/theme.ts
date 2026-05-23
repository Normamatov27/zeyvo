import { Easing } from "remotion";

// ── Color Tokens ──────────────────────────────────────────────
export const COLORS = {
  background: "#000000",
  surface: "#0A0A0F",
  surfaceLight: "#111118",
  accent: "#00E5FF",
  accentDeep: "#0044FF",
  accentGlow: "rgba(0, 229, 255, 0.15)",
  accentGlowStrong: "rgba(0, 229, 255, 0.35)",
  danger: "#FF2D55",
  dangerGlow: "rgba(255, 45, 85, 0.2)",
  text: "#FFFFFF",
  textMuted: "#666680",
  textDim: "#333344",
  glass: "rgba(255, 255, 255, 0.04)",
  glassBorder: "rgba(255, 255, 255, 0.08)",
} as const;

// ── Typography ────────────────────────────────────────────────
export const FONTS = {
  display: "Inter",
  body: "Inter",
  mono: "JetBrains Mono",
} as const;

// ── Easing Curves ─────────────────────────────────────────────
export const EASINGS = {
  /** Strong deceleration — UI elements materializing */
  cinematicEnter: Easing.bezier(0.16, 1, 0.3, 1),
  /** Balanced ease-in-out — editorial fades */
  editorial: Easing.bezier(0.45, 0, 0.55, 1),
  /** Quick start, gentle settle — dramatic reveals */
  dramatic: Easing.bezier(0.22, 1, 0.36, 1),
  /** Slow start, fast exit — elements leaving */
  exit: Easing.bezier(0.55, 0, 1, 0.45),
  /** Smooth deceleration for counters */
  counter: Easing.bezier(0.0, 0.0, 0.2, 1),
} as const;

// ── Layout Constants ──────────────────────────────────────────
export const DESKTOP = { width: 1920, height: 1080 } as const;
export const MOBILE = { width: 1080, height: 1920 } as const;
export const FPS = 30;
export const DURATION_SECONDS = 90;
export const TOTAL_FRAMES = FPS * DURATION_SECONDS; // 2700
