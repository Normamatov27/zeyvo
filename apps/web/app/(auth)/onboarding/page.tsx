"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetchAnon } from "@/lib/api";

interface OnboardingResponse {
  orgId: string;
  orgSlug: string;
  userId: string;
  channel: string;
  expiresInSeconds: number;
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}

export default function OnboardingPage() {
  const router = useRouter();

  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [firstBranchName, setFirstBranchName] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveSlug = slugTouched ? orgSlug : slugify(orgName);

  function normalisePhone(raw: string): string {
    const stripped = raw.replace(/[^\d+]/g, "");
    return stripped.startsWith("+") ? stripped : "+" + stripped;
  }

  const phoneNorm = normalisePhone(phone);
  const ready = orgName.trim().length >= 2 && fullName.trim().length >= 2 && phoneNorm.length >= 5 && !submitting;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiFetchAnon<OnboardingResponse>("/api/v1/onboarding/orgs", {
        method: "POST",
        body: JSON.stringify({
          orgName: orgName.trim(),
          orgSlug: effectiveSlug,
          country: "UZ",
          locale: "uz",
          phone: phoneNorm,
          fullName: fullName.trim(),
          firstBranchName: firstBranchName.trim() || null,
        }),
      });
      // Hand off to existing OTP page; on verify it'll land on /admin/overview
      const url = `/otp?phone=${encodeURIComponent(phoneNorm)}&channel=${encodeURIComponent(res.channel)}&redirect=${encodeURIComponent("/admin/overview")}`;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.replace(url as any);
    } catch (err: any) {
      setError(err?.message ?? "Onboarding failed");
      setSubmitting(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 480, margin: "0 auto" }}>
      <div>
        <div style={{
          fontSize: 11, fontWeight: 600, letterSpacing: 1,
          textTransform: "uppercase", color: "var(--color-primary)",
          fontFamily: "var(--font-mono)", marginBottom: 10,
        }}>
          01 · Get started
        </div>
        <h1 style={{ fontSize: 30, fontWeight: 600, letterSpacing: -1, lineHeight: 1.1, margin: 0 }}>
          Set up your organization
        </h1>
        <p style={{ fontSize: 14, color: "var(--color-fg-2)", marginTop: 8, lineHeight: 1.5 }}>
          One branch trial. No card required. We'll text you a verification code.
        </p>
      </div>

      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Organization name" required>
          <input
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            placeholder="Asaka Bank"
            autoFocus
            style={inputStyle}
          />
        </Field>

        <Field
          label="Slug"
          hint={effectiveSlug ? `zeyvo.tech/${effectiveSlug}` : "auto-generated from org name"}
        >
          <input
            value={effectiveSlug}
            onChange={(e) => { setOrgSlug(slugify(e.target.value)); setSlugTouched(true); }}
            placeholder="asaka-bank"
            style={{ ...inputStyle, fontFamily: "var(--font-mono)" }}
          />
        </Field>

        <Field label="Your name" required>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Ozodbek Normamatov"
            style={inputStyle}
          />
        </Field>

        <Field label="Phone (your phone)" required hint="We'll send a 6-digit code by SMS">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v && !v.startsWith("+")) setPhone("+" + v.replace(/^\+*/, ""));
            }}
            placeholder="+998 90 123 4567"
            autoComplete="tel"
            style={{ ...inputStyle, fontFamily: "var(--font-mono)", letterSpacing: 0.5 }}
          />
        </Field>

        <Field label="First branch name (optional)" hint="You can add this later from the admin panel">
          <input
            value={firstBranchName}
            onChange={(e) => setFirstBranchName(e.target.value)}
            placeholder="Mirzo Ulugbek filiali"
            style={inputStyle}
          />
        </Field>

        {error && (
          <div style={{
            fontSize: 12, color: "var(--color-danger)",
            padding: "10px 12px", borderRadius: 8,
            background: "var(--color-danger-soft)",
          }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!ready}
          style={{
            padding: "14px 0", borderRadius: 12, border: "none",
            background: !ready ? "var(--color-fg-4)" : "var(--color-primary)",
            color: "#fff", fontSize: 15, fontWeight: 600,
            cursor: !ready ? "not-allowed" : "pointer",
            marginTop: 6,
          }}
        >
          {submitting ? "Creating organization…" : "Create organization →"}
        </button>

        <div style={{ fontSize: 12, color: "var(--color-fg-3)", textAlign: "center", marginTop: 4 }}>
          Already have an account?{" "}
          <Link href="/sign-in" style={{ color: "var(--color-primary)", textDecoration: "none", fontWeight: 500 }}>
            Sign in
          </Link>
        </div>
      </form>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "11px 14px", borderRadius: 10,
  border: "1.5px solid var(--color-border)",
  background: "var(--color-surface-2)",
  color: "var(--color-fg)", fontSize: 15,
  outline: "none", transition: "border-color 0.15s",
  width: "100%",
};

function Field({ label, hint, required, children }: {
  label: string; hint?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: "var(--color-fg-2)" }}>
        {label}{required && <span style={{ color: "var(--color-danger)", marginLeft: 3 }}>*</span>}
      </label>
      {children}
      {hint && <div style={{ fontSize: 11, color: "var(--color-fg-3)" }}>{hint}</div>}
    </div>
  );
}
