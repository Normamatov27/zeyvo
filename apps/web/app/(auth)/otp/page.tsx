"use client";

import { useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

const CHANNEL_HINT: Record<string, string> = {
  sms: "Sent via SMS",
  telegram: "Sent to your Telegram DMs",
  whatsapp: "Sent via WhatsApp",
  call: "Listen for a voice call",
};

function OtpForm() {
  const router = useRouter();
  const params = useSearchParams();
  const phone = params.get("phone") ?? "";
  const channel = params.get("channel") ?? "sms";
  const redirect = params.get("redirect") ?? "/branches";

  const { setTokens } = useAuthStore();

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (code.length < 6 || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetchAnon<AuthApiResponse>("/api/v1/auth/otp/verify", {
        method: "POST",
        body: JSON.stringify({ phone, code }),
      });
      setTokens(res.accessToken, res.refreshToken, res.userId, res.orgId, res.roles, res.locale);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.replace(redirect as any);
    } catch (err: any) {
      setError(err.message ?? "Invalid code");
      setLoading(false);
    }
  }

  async function resend() {
    if (resending) return;
    setResending(true);
    setError(null);
    try {
      await apiFetchAnon("/api/v1/auth/otp/request", {
        method: "POST",
        body: JSON.stringify({ phone, channel }),
      });
    } catch (err: any) {
      setError(err.message ?? "Failed to resend");
    } finally {
      setResending(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: 16, padding: 20,
        display: "flex", flexDirection: "column", gap: 14,
      }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: -0.3 }}>Enter code</div>
          <div style={{ fontSize: 13, color: "var(--color-fg-3)", marginTop: 4 }}>
            {CHANNEL_HINT[channel] ?? "Sent"} to{" "}
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--color-fg-2)" }}>{phone}</span>
          </div>
        </div>

        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="000000"
          autoFocus
          style={{
            padding: "14px", borderRadius: 10,
            border: "1.5px solid var(--color-border)",
            background: "var(--color-surface-2)",
            color: "var(--color-fg)", fontSize: 28, fontWeight: 600,
            outline: "none", fontFamily: "var(--font-mono)",
            textAlign: "center", letterSpacing: 8,
          }}
        />

        {error && (
          <div style={{
            fontSize: 12, color: "var(--color-danger)",
            padding: "8px 12px", borderRadius: 8,
            background: "var(--color-danger-soft)",
          }}>
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={resend}
          disabled={resending}
          style={{
            background: "none", border: "none",
            color: resending ? "var(--color-fg-3)" : "var(--color-primary)",
            fontSize: 13, cursor: resending ? "default" : "pointer",
            padding: 0, textAlign: "left",
          }}
        >
          {resending ? "Resending…" : "Resend code"}
        </button>
      </div>

      <button
        type="submit"
        disabled={code.length < 6 || loading}
        style={{
          padding: "14px 0", borderRadius: 14, border: "none",
          background: code.length < 6 || loading ? "var(--color-fg-4)" : "var(--color-primary)",
          color: "#fff", fontSize: 15, fontWeight: 600,
          cursor: code.length < 6 || loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Verifying…" : "Verify"}
      </button>
    </form>
  );
}

export default function OtpPage() {
  return (
    <Suspense>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div>
          <div style={{
            fontSize: 11, fontWeight: 600, letterSpacing: 1,
            textTransform: "uppercase", color: "var(--color-primary)",
            fontFamily: "var(--font-mono)", marginBottom: 10,
          }}>
            02 · Verify
          </div>
          <h1 style={{
            fontSize: 30, fontWeight: 600, letterSpacing: -1,
            lineHeight: 1.1, margin: 0,
          }}>
            Enter the 6-digit code
          </h1>
        </div>
        <OtpForm />
      </div>
    </Suspense>
  );
}
