"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { useAuthStore } from "@/stores/auth";
import { FullPageLoader } from "@/components/Loader";

interface TgWebApp {
  ready: () => void;
  expand: () => void;
  initData: string;
  initDataUnsafe?: { user?: { id: number; first_name: string } };
  colorScheme?: "light" | "dark";
}

export default function TelegramLayout({ children }: { children: React.ReactNode }) {
  const { setTokens, accessToken, refreshToken, refresh } = useAuthStore();
  const [authDone, setAuthDone] = useState(false);
  const [authFailed, setAuthFailed] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);

  // Once the Telegram SDK script is loaded, run auth
  useEffect(() => {
    if (!sdkReady) return;

    const tg: TgWebApp | undefined = (window as any).Telegram?.WebApp;
    if (!tg) {
      // Not inside Telegram (dev mode in a normal browser) — skip TG auth, but if
      // there's a stored refreshToken from a prior OTP session, exchange it now so
      // every API call below starts authed.
      if (refreshToken && !accessToken) refresh().finally(() => setAuthDone(true));
      else setAuthDone(true);
      return;
    }

    try { tg.ready(); tg.expand(); } catch {}

    const initData = tg.initData;

    // Already in-memory authed (e.g., same SPA session): nothing to do.
    if (accessToken) { setAuthDone(true); return; }

    // No initData (running outside a real TG context): fall back to refresh if we have one.
    if (!initData) {
      if (refreshToken) refresh().finally(() => setAuthDone(true));
      else setAuthDone(true);
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
      .catch(async () => {
        // TG WebApp auth failed (e.g., HMAC mismatch). Try a stored refresh token next.
        if (refreshToken) {
          const ok = await refresh();
          if (ok) { setAuthDone(true); return; }
        }
        // Nothing worked — let the user know rather than dumping them into a broken anon state.
        setAuthFailed(true);
        setAuthDone(true);
      });
  }, [sdkReady, accessToken, refreshToken, setTokens, refresh]);

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
        <FullPageLoader variant="dark" label="Signing in" hint="connecting · · ·"/>
      ) : authFailed ? (
        <div style={{
          padding: "60px 24px", display: "flex", flexDirection: "column",
          alignItems: "center", textAlign: "center", gap: 14, minHeight: "100svh",
          justifyContent: "center",
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: "rgba(255,80,80,0.12)", color: "oklch(0.72 0.18 25)",
            display: "grid", placeItems: "center", fontSize: 28, fontWeight: 700,
          }}>!</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#fff" }}>Couldn't sign you in</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", maxWidth: 320, lineHeight: 1.5 }}>
            Telegram returned data we couldn't verify. Close and reopen the mini app, or sign in with your phone number.
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button onClick={() => location.reload()} style={{
              padding: "12px 18px", borderRadius: 10,
              background: "rgba(255,255,255,0.08)", color: "#fff",
              border: "1px solid rgba(255,255,255,0.15)",
              fontSize: 13, fontWeight: 500, cursor: "pointer",
            }}>Try again</button>
            <a href="/sign-in?redirect=/tg" style={{
              padding: "12px 18px", borderRadius: 10, background: "oklch(0.78 0.14 220)",
              color: "#0a0e15", textDecoration: "none",
              fontSize: 13, fontWeight: 600,
            }}>Sign in with phone</a>
          </div>
        </div>
      ) : (
        children
      )}
    </div>
    </>
  );
}
