"use client";

import { useUiStore } from "@/stores/ui";

const THEMES = [
  { value: "light"  as const, label: "Light",  icon: "☀️" },
  { value: "dark"   as const, label: "Dark",   icon: "🌙" },
  { value: "system" as const, label: "System", icon: "💻" },
];

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);

  if (compact) {
    // Cycles light → dark → system → light
    const idx = THEMES.findIndex((t) => t.value === theme);
    const next = THEMES[(idx + 1) % THEMES.length];
    return (
      <button
        onClick={() => setTheme(next.value)}
        aria-label={`Switch theme (current: ${THEMES[idx].label})`}
        title={`Theme: ${THEMES[idx].label} → ${next.label}`}
        style={{
          width: 32, height: 32, borderRadius: 8,
          border: "1px solid var(--color-border)",
          background: "var(--color-surface)",
          color: "var(--color-fg-2)",
          fontSize: 14, cursor: "pointer",
          display: "grid", placeItems: "center",
        }}
      >
        {THEMES[idx].icon}
      </button>
    );
  }

  return (
    <div role="group" aria-label="Theme" style={{ display: "flex", gap: 4, padding: 3, borderRadius: 8, background: "var(--color-surface-2)" }}>
      {THEMES.map((t) => {
        const isActive = t.value === theme;
        return (
          <button
            key={t.value}
            onClick={() => setTheme(t.value)}
            style={{
              padding: "5px 10px", borderRadius: 6, border: "none",
              background: isActive ? "var(--color-surface)" : "transparent",
              color: isActive ? "var(--color-fg)" : "var(--color-fg-3)",
              fontSize: 12, fontWeight: isActive ? 600 : 500,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
              boxShadow: isActive ? "var(--shadow-1)" : "none",
              transition: "background 0.15s, color 0.15s",
            }}
          >
            <span>{t.icon}</span>{t.label}
          </button>
        );
      })}
    </div>
  );
}
