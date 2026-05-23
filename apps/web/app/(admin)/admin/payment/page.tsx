"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

const PLANS = {
  starter:    { label: "Starter",    uzsAmount: 499_000,   usdAmount: 39,   desc: "1 branch · 5 users · 3,000 tickets/mo" },
  growth:     { label: "Growth",     uzsAmount: 1_490_000, usdAmount: 117,  desc: "3 branches · 20 users · 25,000 tickets/mo · analytics" },
  enterprise: { label: "Enterprise", uzsAmount: 4_900_000, usdAmount: 385,  desc: "Custom branches · priority support · dedicated setup" },
};

const CARDS = {
  UZS: { number: "5614 6831 6050 5871", bank: "Uzum Bank · UZS" },
  USD: { number: "4916 9903 2573 8083", bank: "Uzum Visa · USD" },
};

export default function PaymentPage() {
  const router = useRouter();
  const [plan, setPlan] = useState<"starter" | "growth" | "enterprise">("starter");
  const [currency, setCurrency] = useState<"UZS" | "USD">("UZS");
  const [txRef, setTxRef] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const card = CARDS[currency];
  const amount = currency === "UZS" ? PLANS[plan].uzsAmount : PLANS[plan].usdAmount;

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!txRef.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch("/api/v1/payments", {
        method: "POST",
        body: JSON.stringify({ plan, currency, amount, txRef: txRef.trim(), note: note.trim() || null }),
      });
      setDone(true);
    } catch (err: any) {
      setError(err?.message ?? "Failed to submit. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div style={{ padding: 48, maxWidth: 520, margin: "0 auto", textAlign: "center", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: "var(--color-success-soft)",
          color: "var(--color-success)", display: "grid", placeItems: "center", margin: "0 auto", fontSize: 24 }}>
          ✓
        </div>
        <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: -0.4 }}>Payment submitted</div>
        <div style={{ fontSize: 14, color: "var(--color-fg-3)", lineHeight: 1.6 }}>
          Your payment claim has been sent to the super admin. Your plan will be upgraded within 24 hours after confirmation.
        </div>
        <button onClick={() => (router as any).replace("/admin/overview")} style={{
          padding: "12px 0", borderRadius: 10, border: "none",
          background: "var(--color-primary)", color: "#fff",
          fontSize: 14, fontWeight: 600, cursor: "pointer", marginTop: 8,
        }}>
          Go to dashboard
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 32, maxWidth: 560, display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8,
          fontFamily: "var(--font-mono)", color: "var(--color-primary)", marginBottom: 6 }}>
          Upgrade plan
        </div>
        <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: -0.4 }}>Payment instructions</div>
        <div style={{ fontSize: 13, color: "var(--color-fg-3)", marginTop: 4, lineHeight: 1.5 }}>
          Transfer the exact amount to the card below, then fill in the reference. We'll confirm within 24h.
        </div>
      </div>

      {/* Plan selector */}
      <div style={{ display: "flex", gap: 10 }}>
        {(["starter", "growth", "enterprise"] as const).map((p) => {
          const active = plan === p;
          return (
            <button key={p} onClick={() => setPlan(p)} style={{
              flex: 1, padding: "14px 16px", borderRadius: 12, cursor: "pointer",
              border: `1.5px solid ${active ? "var(--color-primary)" : "var(--color-border)"}`,
              background: active ? "var(--color-primary-soft)" : "var(--color-surface)",
              textAlign: "left",
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: active ? "var(--color-primary)" : "var(--color-fg)" }}>{PLANS[p].label}</div>
              <div style={{ fontSize: 11, color: "var(--color-fg-3)", marginTop: 2 }}>{PLANS[p].desc}</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginTop: 8, fontFamily: "var(--font-mono)",
                color: active ? "var(--color-primary)" : "var(--color-fg)" }}>
                {PLANS[p].uzsAmount.toLocaleString()} UZS / mo
              </div>
              <div style={{ fontSize: 10, color: "var(--color-fg-4)", fontFamily: "var(--font-mono)" }}>
                ${PLANS[p].usdAmount} USD / mo
              </div>
            </button>
          );
        })}
      </div>

      {/* Currency selector */}
      <div style={{ display: "flex", gap: 4, padding: 3, borderRadius: 8, background: "var(--color-surface-2)", alignSelf: "flex-start" }}>
        {(["UZS", "USD"] as const).map((c) => (
          <button key={c} onClick={() => setCurrency(c)} style={{
            padding: "6px 18px", borderRadius: 6, border: "none",
            background: currency === c ? "var(--color-primary-soft)" : "transparent",
            color: currency === c ? "var(--color-primary)" : "var(--color-fg-3)",
            fontSize: 12, fontWeight: currency === c ? 700 : 400, cursor: "pointer",
            fontFamily: "var(--font-mono)",
          }}>{c}</button>
        ))}
      </div>

      {/* Card info */}
      <div style={{
        background: "var(--color-surface)", border: "1px solid var(--color-border)",
        borderRadius: 14, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14,
      }}>
        <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.6,
          fontFamily: "var(--font-mono)", color: "var(--color-fg-3)" }}>
          Transfer to
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "var(--font-mono)", letterSpacing: 2 }}>
              {card.number}
            </div>
            <div style={{ fontSize: 11, color: "var(--color-fg-3)", marginTop: 4, fontFamily: "var(--font-mono)" }}>
              {card.bank}
            </div>
          </div>
          <button onClick={() => copy(card.number.replace(/\s/g, ""), "card")} style={{
            padding: "8px 14px", borderRadius: 8, border: "1px solid var(--color-border)",
            background: copied === "card" ? "var(--color-success-soft)" : "var(--color-surface-2)",
            color: copied === "card" ? "var(--color-success)" : "var(--color-fg-2)",
            fontSize: 12, fontWeight: 500, cursor: "pointer",
          }}>
            {copied === "card" ? "Copied!" : "Copy"}
          </button>
        </div>
        <div style={{ padding: "14px 16px", borderRadius: 10, background: "var(--color-primary-soft)",
          display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--color-fg-3)", fontFamily: "var(--font-mono)", marginBottom: 2 }}>Amount to transfer</div>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--color-primary)" }}>
              {currency === "UZS"
                ? `${PLANS[plan].uzsAmount.toLocaleString()} UZS`
                : `$${PLANS[plan].usdAmount} USD`}
            </div>
          </div>
          <button onClick={() => copy(String(amount), "amount")} style={{
            padding: "6px 12px", borderRadius: 7, border: "none",
            background: copied === "amount" ? "var(--color-success-soft)" : "var(--color-primary)",
            color: copied === "amount" ? "var(--color-success)" : "#fff",
            fontSize: 11, fontWeight: 600, cursor: "pointer",
          }}>
            {copied === "amount" ? "Copied!" : "Copy amount"}
          </button>
        </div>
      </div>

      {/* Confirmation form */}
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>Confirm your transfer</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 500, color: "var(--color-fg-2)" }}>
            Transaction reference / last 4 digits of sender card <span style={{ color: "var(--color-danger)" }}>*</span>
          </label>
          <input
            value={txRef}
            onChange={(e) => setTxRef(e.target.value)}
            placeholder="e.g. 1234 or TXN-2026XXXXXX"
            style={{
              padding: "10px 14px", borderRadius: 10,
              border: "1.5px solid var(--color-border)",
              background: "var(--color-surface-2)",
              color: "var(--color-fg)", fontSize: 13, outline: "none",
            }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 500, color: "var(--color-fg-2)" }}>Note (optional)</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Any extra info for the admin"
            style={{
              padding: "10px 14px", borderRadius: 10,
              border: "1.5px solid var(--color-border)",
              background: "var(--color-surface-2)",
              color: "var(--color-fg)", fontSize: 13, outline: "none",
            }}
          />
        </div>

        {error && (
          <div style={{ fontSize: 12, color: "var(--color-danger)", padding: "10px 12px",
            borderRadius: 8, background: "var(--color-danger-soft)" }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={!txRef.trim() || submitting} style={{
          padding: "13px 0", borderRadius: 10, border: "none",
          background: !txRef.trim() ? "var(--color-fg-4)" : "var(--color-primary)",
          color: "#fff", fontSize: 14, fontWeight: 600,
          cursor: !txRef.trim() ? "not-allowed" : "pointer",
        }}>
          {submitting ? "Submitting…" : "Submit payment claim"}
        </button>

        <div style={{ fontSize: 11, color: "var(--color-fg-3)", textAlign: "center", lineHeight: 1.5 }}>
          Super admin will confirm your payment within 24 hours. You can continue using the trial until then.
        </div>
      </form>
    </div>
  );
}
