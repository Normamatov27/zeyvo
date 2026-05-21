"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useUiStore } from "@/stores/ui";

const LOCALES: { code: "uz" | "ru" | "en"; label: string; flag: string }[] = [
  { code: "uz", label: "O'zbek",  flag: "🇺🇿" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "en", label: "English", flag: "🇬🇧" },
];

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export function LocaleSwitcher({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const active = useLocale();
  const setStoreLocale = useUiStore((s) => s.setLocale);
  const [pending, startTransition] = useTransition();

  function change(next: "uz" | "ru" | "en") {
    if (next === active) return;
    document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
    setStoreLocale(next);
    startTransition(() => {
      router.refresh();
    });
  }

  if (compact) {
    return (
      <select
        value={active}
        onChange={(e) => change(e.target.value as "uz" | "ru" | "en")}
        disabled={pending}
        aria-label="Language"
        style={{
          padding: "6px 8px", borderRadius: 7,
          border: "1px solid var(--color-border)",
          background: "var(--color-surface)",
          color: "var(--color-fg-2)",
          fontSize: 12, fontFamily: "var(--font-mono)",
          cursor: pending ? "wait" : "pointer",
        }}
      >
        {LOCALES.map((l) => (
          <option key={l.code} value={l.code}>{l.code.toUpperCase()}</option>
        ))}
      </select>
    );
  }

  return (
    <div role="group" aria-label="Language" style={{ display: "flex", gap: 4, padding: 3, borderRadius: 8, background: "var(--color-surface-2)" }}>
      {LOCALES.map((l) => {
        const isActive = l.code === active;
        return (
          <button
            key={l.code}
            onClick={() => change(l.code)}
            disabled={pending}
            style={{
              padding: "5px 10px", borderRadius: 6, border: "none",
              background: isActive ? "var(--color-surface)" : "transparent",
              color: isActive ? "var(--color-fg)" : "var(--color-fg-3)",
              fontSize: 12, fontWeight: isActive ? 600 : 500,
              cursor: pending ? "wait" : "pointer",
              fontFamily: "var(--font-mono)",
              boxShadow: isActive ? "var(--shadow-1)" : "none",
              transition: "background 0.15s, color 0.15s",
            }}
          >
            {l.code.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
