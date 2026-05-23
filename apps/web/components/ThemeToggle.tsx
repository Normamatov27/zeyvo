"use client";

import { useUiStore } from "@/stores/ui";

const SunIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
  </svg>
);

const MoonIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);


const THEMES = [
  { value: "light" as const, Icon: SunIcon },
  { value: "dark"  as const, Icon: MoonIcon },
];

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);

  if (compact) {
    const current = theme === "dark" ? THEMES[1]! : THEMES[0]!;
    const next = theme === "dark" ? THEMES[0]! : THEMES[1]!;
    return (
      <button
        onClick={() => setTheme(next.value)}
        aria-label={`Switch to ${next.value} theme`}
        style={{
          width: 32, height: 32, borderRadius: 8,
          border: "1px solid var(--color-border)",
          background: "var(--color-surface)",
          color: "var(--color-fg-2)",
          cursor: "pointer",
          display: "grid", placeItems: "center",
        }}
      >
        <current.Icon/>
      </button>
    );
  }

  return (
    <div role="group" aria-label="Theme" style={{ display: "flex", gap: 4, padding: 3, borderRadius: 8, background: "var(--color-surface-2)" }}>
      {THEMES.map((t) => {
        const isActive = t.value === theme || (theme === "system" && t.value === "light");
        return (
          <button
            key={t.value}
            onClick={() => setTheme(t.value)}
            style={{
              padding: "6px 14px", borderRadius: 6, border: "none",
              background: isActive ? "var(--color-primary-soft)" : "transparent",
              color: isActive ? "var(--color-primary)" : "var(--color-fg-3)",
              cursor: "pointer", display: "grid", placeItems: "center",
              transition: "background 0.15s, color 0.15s",
            }}
          >
            <t.Icon/>
          </button>
        );
      })}
    </div>
  );
}
