"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { useAuthStore } from "@/stores/auth";

interface TgWebApp {
  ready: () => void;
  expand: () => void;
  initData: string;
  initDataUnsafe?: { user?: { id: number; first_name: string } };
  colorScheme?: "light" | "dark";
}

export default function TelegramLayout({ children }: { children: React.ReactNode }) {
  const { setTokens, accessToken } = useAuthStore();
  const [authDone, setAuthDone] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);

  // Once the Telegram SDK script is loaded, run auth
  useEffect(() => {
    if (!sdkReady) return;

    const tg: TgWebApp | undefined = (window as any).Telegram?.WebApp;
    if (!tg) {
      // Not inside Telegram (dev mode in a normal browser) — skip auth
      setAuthDone(true);
      return;
    }

    try { tg.ready(); tg.expand(); } catch {}

    const initData = tg.initData;
    if (!initData || accessToken) {
      // Already authenticated or running outside a real TG context (no initData)
      setAuthDone(true);
      return;
    }

    const BASE = process.env.NEXT_PUBLIC_API_URL ?? "";
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
        setAuthDone(true);
      });
  }, [sdkReady, accessToken, setTokens]);

  return (
    <>
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="afterInteractive"
        onLoad={() => setSdkReady(true)}
        onReady={() => setSdkReady(true)}
      />
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
    </>
  );
}
