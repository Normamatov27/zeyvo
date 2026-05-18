"use client";

import { useState } from "react";

interface Flag {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  phase: string;
}

const DEFAULT_FLAGS: Flag[] = [
  {
    key: "ml_eta",
    label: "ML ETA (LightGBM)",
    description: "Use Python sidecar for queue time predictions instead of heuristic formula.",
    enabled: false,
    phase: "Phase 3",
  },
  {
    key: "crowd_prediction",
    label: "Crowd prediction widget",
    description: "Show next-2h forecast charts in the Predictions page for managers.",
    enabled: false,
    phase: "Phase 2",
  },
  {
    key: "leave_home_assistant",
    label: "Leave-home assistant",
    description: "Push \"leave now\" notifications based on travel time + current ETA.",
    enabled: false,
    phase: "Phase 2",
  },
  {
    key: "abandonment_prediction",
    label: "Abandonment risk",
    description: "Predict ticket abandonment and nudge customers to confirm they are still waiting.",
    enabled: false,
    phase: "Phase 3",
  },
  {
    key: "branch_balancing",
    label: "Branch balancing",
    description: "Suggest nearby lower-load branch when joining a full queue.",
    enabled: false,
    phase: "Phase 4",
  },
  {
    key: "llm_ops_insights",
    label: "LLM ops insights",
    description: "Enable AI-generated plain-language explanations of anomalies in manager dashboard.",
    enabled: false,
    phase: "Phase 4",
  },
  {
    key: "telegram_mini_app",
    label: "Telegram Mini App",
    description: "Enable the /tg route and Telegram WebApp auth flow.",
    enabled: true,
    phase: "Phase 1",
  },
  {
    key: "kiosk_webusb_print",
    label: "WebUSB receipt printing",
    description: "Enable ESC/POS printing via WebUSB in the kiosk flow.",
    enabled: false,
    phase: "Phase 1",
  },
];

export default function FlagsPage() {
  const [flags, setFlags] = useState<Flag[]>(DEFAULT_FLAGS);

  function toggle(key: string) {
    setFlags((prev) =>
      prev.map((f) => (f.key === key ? { ...f, enabled: !f.enabled } : f))
    );
  }

  const PHASE_COLOR: Record<string, string> = {
    "Phase 1": "var(--color-success)",
    "Phase 2": "var(--color-primary)",
    "Phase 3": "var(--color-warning)",
    "Phase 4": "var(--color-fg-4)",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{
        height: 56, padding: "0 24px",
        display: "flex", alignItems: "center", gap: 12,
        borderBottom: "1px solid var(--color-hairline)",
        background: "var(--color-surface)",
      }}>
        <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: -0.3, flex: 1 }}>Feature flags</span>
        <span style={{ fontSize: 11, color: "var(--color-warning)", fontFamily: "var(--font-mono)" }}>
          ⚠ changes are in-memory only
        </span>
      </div>

      <div style={{ flex: 1, padding: 24, overflow: "auto" }}>
        <div style={{
          background: "var(--color-surface)", border: "1px solid var(--color-border)",
          borderRadius: 14, overflow: "hidden",
        }}>
          {flags.map((flag, idx) => (
            <div key={flag.key} style={{
              display: "flex", alignItems: "center", gap: 16,
              padding: "14px 18px",
              borderBottom: idx < flags.length - 1 ? "1px solid var(--color-hairline)" : "none",
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{flag.label}</span>
                  <span style={{
                    fontSize: 10, padding: "1px 6px", borderRadius: 999,
                    fontFamily: "var(--font-mono)", fontWeight: 600,
                    color: PHASE_COLOR[flag.phase],
                    background: "color-mix(in oklch, " + PHASE_COLOR[flag.phase] + " 12%, transparent)",
                  }}>{flag.phase}</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--color-fg-3)" }}>{flag.description}</div>
                <div style={{ fontSize: 10, color: "var(--color-fg-4)", fontFamily: "var(--font-mono)", marginTop: 3 }}>
                  {flag.key}
                </div>
              </div>

              {/* Toggle */}
              <button
                onClick={() => toggle(flag.key)}
                style={{
                  width: 44, height: 24, borderRadius: 999, border: "none",
                  background: flag.enabled ? "var(--color-success)" : "var(--color-border-2)",
                  cursor: "pointer", position: "relative", transition: "background 0.2s",
                  flexShrink: 0,
                }}
              >
                <div style={{
                  position: "absolute", top: 3, width: 18, height: 18, borderRadius: "50%",
                  background: "#fff", transition: "left 0.2s",
                  left: flag.enabled ? "calc(100% - 21px)" : 3,
                }} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
