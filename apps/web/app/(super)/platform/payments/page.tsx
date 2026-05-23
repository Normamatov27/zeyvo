"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface PaymentRequest {
  id: string;
  orgId: string;
  orgName: string;
  plan: string;
  amount: number;
  currency: string;
  txRef: string | null;
  note: string | null;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  reviewedAt: string | null;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return Math.floor(diff / 60_000) + "m ago";
  if (diff < 86_400_000) return Math.floor(diff / 3_600_000) + "h ago";
  return Math.floor(diff / 86_400_000) + "d ago";
}

const STATUS_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  pending:  { bg: "var(--color-warning-soft)", fg: "var(--color-warning)", label: "Pending" },
  approved: { bg: "var(--color-success-soft)", fg: "var(--color-success)", label: "Approved" },
  rejected: { bg: "var(--color-danger-soft)",  fg: "var(--color-danger)",  label: "Rejected" },
};

export default function PaymentsPage() {
  const [tab, setTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  function load(status: string) {
    setLoading(true);
    apiFetch<PaymentRequest[]>(`/api/v1/platform/payments?status=${status}`)
      .then(setPayments)
      .catch(() => setPayments([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(tab); }, [tab]);

  async function act(id: string, action: "approve" | "reject") {
    setActing(id);
    try {
      await apiFetch(`/api/v1/platform/payments/${id}/${action}`, { method: "POST" });
      setPayments((prev) => prev.filter((p) => p.id !== id));
    } catch (e: any) {
      alert(e?.message ?? "Failed");
    } finally {
      setActing(null);
    }
  }

  const s = STATUS_STYLE[tab]!;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{
        height: 56, padding: "0 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid var(--color-hairline)",
        background: "var(--color-surface)",
      }}>
        <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: -0.3 }}>Payments</span>
        <div style={{ display: "flex", gap: 4, padding: 3, borderRadius: 8, background: "var(--color-surface-2)" }}>
          {(["pending", "approved", "rejected"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: "5px 14px", borderRadius: 6, border: "none", cursor: "pointer",
              background: tab === t ? "var(--color-primary-soft)" : "transparent",
              color: tab === t ? "var(--color-primary)" : "var(--color-fg-3)",
              fontSize: 12, fontWeight: tab === t ? 600 : 400,
              textTransform: "capitalize",
            }}>{t}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: 24, overflow: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} style={{ height: 80, borderRadius: 12, background: "var(--color-surface)",
              border: "1px solid var(--color-border)" }}/>
          ))
        ) : payments.length === 0 ? (
          <div style={{ padding: "60px 0", textAlign: "center", color: "var(--color-fg-3)", fontSize: 13 }}>
            No {tab} payments.
          </div>
        ) : payments.map((p) => (
          <div key={p.id} style={{
            background: "var(--color-surface)", border: "1px solid var(--color-border)",
            borderRadius: 14, padding: "16px 20px",
            display: "flex", alignItems: "flex-start", gap: 16,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{p.orgName}</span>
                <span style={{
                  fontSize: 10, padding: "2px 8px", borderRadius: 999, fontFamily: "var(--font-mono)",
                  background: s.bg, color: s.fg, fontWeight: 600, textTransform: "capitalize",
                }}>{p.status}</span>
                <span style={{
                  fontSize: 10, padding: "2px 8px", borderRadius: 999,
                  background: "var(--color-primary-soft)", color: "var(--color-primary)",
                  fontFamily: "var(--font-mono)", fontWeight: 600, textTransform: "capitalize",
                }}>{p.plan}</span>
              </div>
              <div style={{ display: "flex", gap: 20, fontSize: 13 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-fg)" }}>
                  {typeof p.amount === "number" ? p.amount.toLocaleString() : p.amount} {p.currency}
                </span>
                {p.txRef && (
                  <span style={{ color: "var(--color-fg-3)", fontFamily: "var(--font-mono)" }}>
                    ref: {p.txRef}
                  </span>
                )}
                {p.note && (
                  <span style={{ color: "var(--color-fg-3)" }}>"{p.note}"</span>
                )}
                <span style={{ color: "var(--color-fg-4)", fontSize: 11, fontFamily: "var(--font-mono)", marginLeft: "auto" }}>
                  {timeAgo(p.createdAt)}
                </span>
              </div>
            </div>
            {tab === "pending" && (
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button onClick={() => act(p.id, "approve")} disabled={acting === p.id} style={{
                  padding: "8px 18px", borderRadius: 8, border: "none",
                  background: "var(--color-success)", color: "#fff",
                  fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}>
                  {acting === p.id ? "…" : "Approve"}
                </button>
                <button onClick={() => act(p.id, "reject")} disabled={acting === p.id} style={{
                  padding: "8px 14px", borderRadius: 8,
                  border: "1px solid var(--color-danger-soft)",
                  background: "var(--color-danger-soft)", color: "var(--color-danger)",
                  fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}>
                  Reject
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
