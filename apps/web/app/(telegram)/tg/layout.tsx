"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth";

interface TgWebApp {
  ready: () => void;
  expand: () => void;
  initData: string;
  initDataUnsafe?: { user?: { id: number; first_name: string } };
  colorScheme?: "light" | "dark";
}

function parseTgUser(initData: string): string | null {
  try {
    const params = new URLSearchParams(initData);
    const user = params.get("user");
    if (!user) return null;
    const parsed = JSON.parse(decodeURIComponent(user));
    return parsed?.first_name ?? null;
  } catch {
    return null;
  }
}

export default function TelegramLayout({ children }: { children: React.ReactNode }) {
  const { setTokens, accessToken } = useAuthStore();
  const [authDone, setAuthDone] = useState(false);
  const [authFailed, setAuthFailed] = useState(false);

  useEffect(() => {
    const tg: TgWebApp | undefined = (window as any).Telegram?.WebApp;
    if (!tg) {
      // Not inside Telegram (dev mode) — skip auth
      setAuthDone(true);
      return;
    }

    tg.ready();
    tg.expand();

    const initData = tg.initData;
    if (!initData || accessToken) {
      // Already authenticated or no initData
      setAuthDone(true);
      return;
    }

    const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
    fetch(`${BASE}/api/v1/auth/telegram`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData }),
    })
      .then((r) => {
        if (!r.ok) throw new Error("TG auth failed");
        return r.json();
      })
      .then((data) => {
        setTokens(
          data.accessToken,
          data.refreshToken ?? null,
          data.userId,
          data.orgId ?? null,
          data.roles ?? [],
          data.locale ?? "uz"
        );
        setAuthDone(true);
      })
      .catch(() => {
        setAuthFailed(true);
        setAuthDone(true);
      });
  }, []);

  return (
    <div
      className="dark"
      style={{
        minHeight: "100svh",
        background: "var(--color-bg)",
        color: "var(--color-fg)",
        fontFamily: "var(--font-sans)",
        maxWidth: 430,
        margin: "0 auto",
      }}
    >
      {!authDone ? (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          minHeight: "100svh", flexDirection: "column", gap: 12,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            border: "3px solid var(--color-primary-soft)",
            borderTopColor: "var(--color-primary)",
            animation: "spin 0.8s linear infinite",
          }}/>
          <div style={{ fontSize: 13, color: "var(--color-fg-3)" }}>Signing in…</div>
        </div>
      ) : (
        children
      )}
    </div>
  );
}
