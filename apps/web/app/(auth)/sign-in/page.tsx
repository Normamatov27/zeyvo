"use client";

import { useState, Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { apiFetchAnon } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";

interface AuthApiResponse {
  accessToken: string;
  refreshToken: string | null;
  userId: string;
  orgId: string | null;
  roles: string[];
  locale: string;
}

type TgStep = "idle" | "pending" | "done";

const IS_DEV = process.env.NODE_ENV === "development";

function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get("redirect") ?? "/branches";
  const { setTokens } = useAuthStore();
  const t = useTranslations("auth");

  const [phone, setPhone] = useState("");
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const [tgStep, setTgStep] = useState<TgStep>("idle");
  const [tgCode, setTgCode] = useState("");
  const [tgBotUrl, setTgBotUrl] = useState("");
  const [tgLoading, setTgLoading] = useState(false);
  const [tgError, setTgError] = useState<string | null>(null);
  const [devConfirming, setDevConfirming] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  function normalisePhone(raw: string) {
    const stripped = raw.replace(/[^\d+]/g, "");
    return stripped.startsWith("+") ? stripped : "+" + stripped;
  }

  async function signInPhone(e: React.FormEvent) {
    e.preventDefault();
    const norm = normalisePhone(phone);
    if (norm.length < 5) {
      setPhoneError(t("phone_error"));
      return;
    }
    setPhoneLoading(true);
    setPhoneError(null);
    try {
      if (IS_DEV) {
        const res = await apiFetchAnon<AuthApiResponse>(
          `/api/v1/auth/dev-login?phone=${encodeURIComponent(norm)}`,
          { method: "POST" }
        );
        setTokens(res.accessToken, res.refreshToken, res.userId, res.orgId, res.roles, res.locale);
        router.replace(redirect as any);
      } else {
        await apiFetchAnon("/api/v1/auth/otp/request", {
          method: "POST",
          body: JSON.stringify({ phone: norm, channel: "sms" }),
        });
        router.push(`/otp?phone=${encodeURIComponent(norm)}&channel=sms&redirect=${encodeURIComponent(redirect)}` as any);
      }
    } catch (err: any) {
      const code: string = err?.code ?? "";
      if (code === "request.timeout" || err?.status >= 500) {
        setPhoneError(t("err_unavailable"));
      } else if (code === "auth.rate_limited") {
        setPhoneError(t("err_rate_limited"));
      } else {
        setPhoneError(err?.message ?? t("sign_in"));
      }
      setPhoneLoading(false);
    }
  }

  async function startTgAuth() {
    setTgLoading(true);
    setTgError(null);
    try {
      const data = await apiFetchAnon<{ code: string; botUrl: string; expiresInSeconds: number }>(
        "/api/v1/auth/tg-login-code",
        { method: "POST" }
      );
      setTgCode(data.code);
      setTgBotUrl(data.botUrl);
      setTgStep("pending");

      pollRef.current = setInterval(async () => {
        try {
          const poll = await apiFetchAnon<AuthApiResponse | undefined>(
            `/api/v1/auth/tg-login-code/${data.code}`
          );
          if (poll && "accessToken" in poll) {
            if (pollRef.current) clearInterval(pollRef.current);
            setTgStep("done");
            setTokens(poll.accessToken, poll.refreshToken ?? null, poll.userId, poll.orgId, poll.roles ?? [], poll.locale ?? "uz");
            router.replace(redirect as any);
          }
        } catch (e: any) {
          if (e?.status === 404) {
            if (pollRef.current) clearInterval(pollRef.current);
            setTgError(t("tg_expired"));
            setTgStep("idle");
          }
        }
      }, 2000);
    } catch (e: any) {
      setTgError(e?.message ?? t("err_unavailable"));
    } finally {
      setTgLoading(false);
    }
  }

  function cancelTgAuth() {
    if (pollRef.current) clearInterval(pollRef.current);
    setTgStep("idle");
    setTgCode("");
    setTgBotUrl("");
    setTgError(null);
  }

  async function devSimulateTgConfirm() {
    setDevConfirming(true);
    try {
      await apiFetchAnon(
        `/api/v1/auth/dev-login/confirm-tg-web?code=${tgCode}`,
        { method: "POST" }
      );
    } catch (e: any) {
      setTgError(e?.message ?? "Dev simulation failed");
    } finally {
      setDevConfirming(false);
    }
  }

  const phoneReady = phone.trim().length >= 4 && !phoneLoading;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <form onSubmit={signInPhone} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: 16, padding: 20,
          display: "flex", flexDirection: "column", gap: 14,
        }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: -0.3 }}>{t("sign_in")}</div>
            <div style={{ fontSize: 13, color: "var(--color-fg-3)", marginTop: 4 }}>
              {t("phone_continue")}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: "var(--color-fg-2)" }}>
              {t("phone")}
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setPhoneError(null); }}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && !v.startsWith("+")) setPhone("+" + v.replace(/^\+*/, ""));
              }}
              placeholder={t("phone_placeholder")}
              autoFocus
              autoComplete="tel"
              style={{
                padding: "11px 14px", borderRadius: 10,
                border: `1.5px solid ${phoneError ? "var(--color-danger)" : "var(--color-border)"}`,
                background: "var(--color-surface-2)",
                color: "var(--color-fg)", fontSize: 15,
                outline: "none", fontFamily: "var(--font-mono)",
                letterSpacing: 0.5, transition: "border-color 0.15s",
              }}
            />
          </div>

          {phoneError && (
            <div style={{
              fontSize: 12, color: "var(--color-danger)",
              padding: "8px 12px", borderRadius: 8,
              background: "var(--color-danger-soft)",
            }}>
              {phoneError}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={!phoneReady}
          style={{
            padding: "14px 0", borderRadius: 14, border: "none",
            background: !phoneReady ? "var(--color-fg-4)" : "var(--color-primary)",
            color: "#fff", fontSize: 15, fontWeight: 600,
            cursor: !phoneReady ? "not-allowed" : "pointer",
            transition: "background 0.15s",
          }}
        >
          {phoneLoading ? t("signing_in") : t("sign_in_cta")}
        </button>
      </form>

      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "2px 0" }}>
        <div style={{ flex: 1, height: 1, background: "var(--color-hairline)" }}/>
        <span style={{ fontSize: 12, color: "var(--color-fg-4)", whiteSpace: "nowrap" }}>{t("or")}</span>
        <div style={{ flex: 1, height: 1, background: "var(--color-hairline)" }}/>
      </div>

      {tgStep === "idle" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            type="button"
            onClick={startTgAuth}
            disabled={tgLoading}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              padding: "13px 0", borderRadius: 14,
              border: "1.5px solid #2AABEE",
              background: "#2AABEE", color: "#fff",
              fontSize: 15, fontWeight: 600,
              cursor: tgLoading ? "not-allowed" : "pointer",
              opacity: tgLoading ? 0.75 : 1,
              transition: "opacity 0.15s",
            }}
          >
            {tgLoading ? <Spinner color="#fff" size={16}/> : <TgIcon/>}
            {tgLoading ? t("tg_connecting") : t("tg_sign_in")}
          </button>
          {tgError && <ErrorNote>{tgError}</ErrorNote>}
          <span style={{ fontSize: 11, color: "var(--color-fg-4)", textAlign: "center" }}>
            {t("tg_hint")}
          </span>
        </div>
      )}

      {tgStep === "pending" && (
        <div style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: 16, padding: 20,
          display: "flex", flexDirection: "column", gap: 16,
        }}>
          <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: -0.2 }}>
            {t("tg_open_bot")}
          </div>

          <div style={{
            background: "var(--color-surface-2)",
            border: "1.5px solid var(--color-border)",
            borderRadius: 12, padding: "16px 20px",
            textAlign: "center",
          }}>
            <div style={{
              fontSize: 10, fontWeight: 600, color: "var(--color-fg-3)",
              textTransform: "uppercase", letterSpacing: 0.8,
              fontFamily: "var(--font-mono)", marginBottom: 10,
            }}>
              {t("tg_your_code")}
            </div>
            <div style={{
              fontFamily: "var(--font-mono)",
              fontSize: 36, fontWeight: 700, letterSpacing: 6,
              color: "var(--color-fg)", fontVariantNumeric: "tabular-nums",
            }}>
              {tgCode}
            </div>
          </div>

          <a
            href={tgBotUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "12px 0", borderRadius: 12,
              background: "#2AABEE", color: "#fff",
              fontSize: 14, fontWeight: 600, textDecoration: "none",
            }}
          >
            <TgIcon size={18}/>
            {t("tg_open_cta")}
          </a>

          <div style={{ fontSize: 12, color: "var(--color-fg-3)", textAlign: "center", lineHeight: 1.5 }}>
            {t("tg_send_hint")}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "4px 0" }}>
            <Spinner color="#2AABEE" size={14}/>
            <span style={{ fontSize: 13, color: "var(--color-fg-3)" }}>
              {t("tg_waiting")}
            </span>
          </div>

          {IS_DEV && (
            <div style={{
              padding: "12px 14px", borderRadius: 10,
              background: "oklch(0.97 0.015 80)",
              border: "1px dashed oklch(0.75 0.06 80)",
            }}>
              <div style={{
                fontSize: 10, fontWeight: 700, color: "oklch(0.5 0.1 80)",
                textTransform: "uppercase", letterSpacing: 0.5,
                fontFamily: "var(--font-mono)", marginBottom: 8,
              }}>
                Dev mode · bot not running
              </div>
              <button
                type="button"
                onClick={devSimulateTgConfirm}
                disabled={devConfirming}
                style={{
                  width: "100%", padding: "9px 0", borderRadius: 8,
                  border: "1px solid oklch(0.7 0.06 80)",
                  background: devConfirming ? "oklch(0.92 0.01 80)" : "oklch(0.94 0.025 80)",
                  color: "oklch(0.38 0.1 80)",
                  fontSize: 13, fontWeight: 600, cursor: devConfirming ? "wait" : "pointer",
                }}
              >
                {devConfirming ? "Simulating…" : "Simulate Telegram confirmation →"}
              </button>
              <div style={{ fontSize: 10, color: "oklch(0.6 0.05 80)", marginTop: 6, lineHeight: 1.4 }}>
                Signs in as fake telegram_id=111111111. Auto-redirects in ~2s.
              </div>
            </div>
          )}

          {tgError && <ErrorNote>{tgError}</ErrorNote>}

          <button
            type="button"
            onClick={cancelTgAuth}
            style={{
              padding: "10px 0", borderRadius: 12,
              border: "1.5px solid var(--color-border)",
              background: "transparent",
              color: "var(--color-fg-3)", fontSize: 13, fontWeight: 500,
              cursor: "pointer",
            }}
          >
            {t("cancel")}
          </button>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function Spinner({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: "50%",
      border: `2px solid ${color}30`,
      borderTopColor: color,
      animation: "spin 0.8s linear infinite",
      display: "inline-block", flexShrink: 0,
    }}/>
  );
}

function TgIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.088 13.81l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.834.836z"/>
    </svg>
  );
}

function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 12, color: "var(--color-danger)",
      padding: "8px 12px", borderRadius: 8,
      background: "var(--color-danger-soft)",
    }}>
      {children}
    </div>
  );
}

export default function SignInPage() {
  const t = useTranslations("auth");
  return (
    <Suspense>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div>
          <div style={{
            fontSize: 11, fontWeight: 600, letterSpacing: 1,
            textTransform: "uppercase", color: "var(--color-primary)",
            fontFamily: "var(--font-mono)", marginBottom: 10,
          }}>
            {t("sign_in")}
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 600, letterSpacing: -1, lineHeight: 1.1, margin: 0 }}>
            {t("welcome_back")}
          </h1>
          <p style={{ fontSize: 14, color: "var(--color-fg-2)", marginTop: 8, lineHeight: 1.5 }}>
            {t("sign_in_subtitle")}
          </p>
        </div>
        <SignInForm />
      </div>
    </Suspense>
  );
}
