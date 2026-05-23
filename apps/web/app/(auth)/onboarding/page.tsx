"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("auth");

  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [firstBranchName, setFirstBranchName] = useState("");

  const [plan, setPlan] = useState<"trial" | "growth" | "business">("trial");
  const [agreedToTos, setAgreedToTos] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveSlug = slugTouched ? orgSlug : slugify(orgName);

  function normalisePhone(raw: string): string {
    const stripped = raw.replace(/[^\d+]/g, "");
    return stripped.startsWith("+") ? stripped : "+" + stripped;
  }

  const phoneNorm = normalisePhone(phone);
  const phoneValid = phoneNorm.length >= 9;
  const ready = orgName.trim().length >= 2 && fullName.trim().length >= 2 && phoneValid && agreedToTos && !submitting;

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
      const redirect = plan !== "trial" ? "/admin/payment" : "/admin/overview";
      const url = `/otp?phone=${encodeURIComponent(phoneNorm)}&channel=${encodeURIComponent(res.channel)}&redirect=${encodeURIComponent(redirect)}`;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.replace(url as any);
    } catch (err: any) {
      const code: string = err?.code ?? "";
      if (code === "org.slug_taken") {
        setError(t("err_slug_taken"));
      } else if (code === "auth.phone_already_registered") {
        setError(t("err_phone_registered"));
      } else if (err?.status >= 500 || code === "request.timeout") {
        setError(t("err_unavailable"));
      } else {
        setError(err?.message ?? t("err_onboarding"));
      }
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
          {t("onboarding_step")}
        </div>
        <h1 style={{ fontSize: 30, fontWeight: 600, letterSpacing: -1, lineHeight: 1.1, margin: 0 }}>
          {t("onboarding_heading")}
        </h1>
        <p style={{ fontSize: 14, color: "var(--color-fg-2)", marginTop: 8, lineHeight: 1.5 }}>
          {t("onboarding_subtitle")}
        </p>
      </div>

      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label={t("org_name")} required>
          <input
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            placeholder={t("org_name_placeholder")}
            autoFocus
            style={inputStyle}
          />
        </Field>

        <Field
          label={t("slug_label")}
          hint={effectiveSlug ? `zeyvo.tech/${effectiveSlug}` : t("slug_auto")}
        >
          <input
            value={effectiveSlug}
            onChange={(e) => { setOrgSlug(slugify(e.target.value)); setSlugTouched(true); }}
            placeholder="asaka-bank"
            style={{ ...inputStyle, fontFamily: "var(--font-mono)" }}
          />
        </Field>

        <Field label={t("your_name")} required>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder={t("your_name_placeholder")}
            style={inputStyle}
          />
        </Field>

        <Field
          label={t("phone_label")}
          required
          hint={phone && phoneNorm.length > 0 && phoneNorm.length < 9 ? t("phone_incomplete") : t("phone_sms_hint")}
        >
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v && !v.startsWith("+")) setPhone("+" + v.replace(/^\+*/, ""));
            }}
            placeholder={t("phone_placeholder")}
            autoComplete="tel"
            style={{ ...inputStyle, fontFamily: "var(--font-mono)", letterSpacing: 0.5 }}
          />
        </Field>

        <Field label={t("branch_name_label")} hint={t("branch_name_hint")}>
          <input
            value={firstBranchName}
            onChange={(e) => setFirstBranchName(e.target.value)}
            placeholder={t("branch_name_placeholder")}
            style={inputStyle}
          />
        </Field>

        {/* Plan selection */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-fg-2)" }}>Choose a plan</div>
          {(["trial", "growth", "business"] as const).map((p) => {
            const meta = {
              trial:    { label: "Trial", price: "Free · 30 days", desc: "1 branch · up to 500 tickets" },
              growth:   { label: "Growth", price: "$29 / month", desc: "3 branches · unlimited tickets · analytics" },
              business: { label: "Business", price: "$79 / month", desc: "Unlimited branches · priority support · API access" },
            }[p];
            const active = plan === p;
            return (
              <label key={p} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                borderRadius: 10, cursor: "pointer",
                border: `1.5px solid ${active ? "var(--color-primary)" : "var(--color-border)"}`,
                background: active ? "var(--color-primary-soft)" : "var(--color-surface-2)",
              }}>
                <input type="radio" name="plan" value={p} checked={active} onChange={() => setPlan(p)} style={{ accentColor: "var(--color-primary)" }}/>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: active ? "var(--color-primary)" : "var(--color-fg)" }}>{meta.label}</div>
                  <div style={{ fontSize: 11, color: "var(--color-fg-3)", marginTop: 1 }}>{meta.desc}</div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, fontFamily: "var(--font-mono)",
                  color: active ? "var(--color-primary)" : "var(--color-fg-3)" }}>{meta.price}</div>
              </label>
            );
          })}
          {plan !== "trial" && (
            <div style={{ fontSize: 11, color: "var(--color-fg-3)", padding: "8px 12px", borderRadius: 8,
              background: "var(--color-warning-soft)", lineHeight: 1.5 }}>
              After sign-up you will see payment instructions (P2P bank transfer). Your plan activates once the super admin confirms the payment.
            </div>
          )}
        </div>

        <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", userSelect: "none" }}>
          <input
            type="checkbox"
            checked={agreedToTos}
            onChange={(e) => setAgreedToTos(e.target.checked)}
            style={{ marginTop: 2, width: 16, height: 16, accentColor: "var(--color-primary)", flexShrink: 0 }}
          />
          <span style={{ fontSize: 12.5, color: "var(--color-fg-2)", lineHeight: 1.5 }}>
            {t("tos_agree")}{" "}
            <Link href={"/terms" as any} target="_blank" style={{ color: "var(--color-primary)", textDecoration: "none", fontWeight: 500 }}>
              {t("tos_terms")}
            </Link>
            {" "}{t("tos_and")}{" "}
            <Link href={"/privacy" as any} target="_blank" style={{ color: "var(--color-primary)", textDecoration: "none", fontWeight: 500 }}>
              {t("tos_privacy")}
            </Link>
          </span>
        </label>

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
          {submitting ? t("creating") : t("create_cta")}
        </button>

        <div style={{ fontSize: 12, color: "var(--color-fg-3)", textAlign: "center", marginTop: 4 }}>
          {t("have_account")}{" "}
          <Link href="/sign-in" style={{ color: "var(--color-primary)", textDecoration: "none", fontWeight: 500 }}>
            {t("sign_in")}
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
