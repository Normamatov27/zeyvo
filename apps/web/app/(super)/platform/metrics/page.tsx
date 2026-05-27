"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

/* ── types ────────────────────────────────────────────────────────── */
interface OrgRow { id: string; name: string; plan: string; branchCount: number; tickets7d: number; lastActivity: string | null; mrrUzs: number; }
interface PlanDist { plan: string; count: number; }
interface PaymentStatus { status: string; plan: string; count: number; totalUzs: number; }
interface DayCount { day: string; count: number; }
interface RoleCount { role: string; count: number; }

/* ── helpers ──────────────────────────────────────────────────────── */
function fmt(n: number) { return n.toLocaleString("en-US"); }
function planColor(plan: string) {
  return plan === "enterprise" ? "oklch(0.58 0.2 25)" :
         plan === "growth"     ? "oklch(0.55 0.17 145)" :
         plan === "starter"    ? "oklch(0.5 0.18 262)" : "var(--color-fg-4)";
}
function statusColor(s: string) {
  return s === "approved" ? "var(--color-success)" :
         s === "pending"  ? "oklch(0.65 0.18 55)" : "var(--color-danger)";
}
function timeAgo(iso: string | null) {
  if (!iso) return "—";
  const d = Date.now() - new Date(iso).getTime();
  if (d < 60_000) return "just now";
  if (d < 3_600_000) return Math.floor(d / 60_000) + "m ago";
  if (d < 86_400_000) return Math.floor(d / 3_600_000) + "h ago";
  return Math.floor(d / 86_400_000) + "d ago";
}

/* ── small card ──────────────────────────────────────────────────── */
function KCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{
      background: "var(--color-surface)", border: "1px solid var(--color-border)",
      borderRadius: 12, padding: "18px 22px",
    }}>
      <div style={{ fontSize: 11, color: "var(--color-fg-4)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -1, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--color-fg-3)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

/* ── mini bar ────────────────────────────────────────────────────── */
function MiniBar({ values, max, color = "oklch(0.5 0.18 262)" }: { values: number[]; max: number; color?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 32 }}>
      {values.map((v, i) => (
        <div key={i} style={{
          flex: 1, background: color, opacity: max > 0 ? 0.3 + 0.7 * (v / max) : 0.1,
          borderRadius: 2, height: max > 0 ? Math.max(2, Math.round(32 * v / max)) : 2,
        }}/>
      ))}
    </div>
  );
}

/* ── plan donut (fake CSS rings) ──────────────────────────────────── */
function PlanDonut({ data }: { data: PlanDist[] }) {
  const total = data.reduce((s, d) => s + d.count, 0) || 1;
  const plans = ["trial", "starter", "growth", "enterprise"];
  return (
    <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
      {plans.map(p => {
        const row = data.find(d => d.plan === p);
        const count = row?.count ?? 0;
        const pct = Math.round(count * 100 / total);
        return (
          <div key={p} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: 999, background: planColor(p) }}/>
            <span style={{ fontSize: 13, color: "var(--color-fg-2)", textTransform: "capitalize" }}>{p}</span>
            <span style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{count}</span>
            <span style={{ fontSize: 11, color: "var(--color-fg-4)" }}>({pct}%)</span>
          </div>
        );
      })}
    </div>
  );
}

/* ── section header ───────────────────────────────────────────────── */
function SH({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", textTransform: "uppercase",
      letterSpacing: 0.8, color: "var(--color-fg-4)", marginBottom: 12 }}>{children}</div>
  );
}

/* ── main page ────────────────────────────────────────────────────── */
export default function PlatformMetricsPage() {
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [plans, setPlans] = useState<{ distribution: PlanDist[]; recentUpgrades: any[] }>({ distribution: [], recentUpgrades: [] });
  const [payments, setPayments] = useState<{ mrrUzs: number; paidOrgs: number; byStatus: PaymentStatus[] }>({ mrrUzs: 0, paidOrgs: 0, byStatus: [] });
  const [chat, setChat] = useState<{ openConversations: number; resolved7d: number; avgFirstReplyMin: number | null; messagesPerDay: DayCount[] }>({ openConversations: 0, resolved7d: 0, avgFirstReplyMin: null, messagesPerDay: [] });
  const [users, setUsers] = useState<{ totalUsers: number; signups30d: number; activeStaff7d: number; byRole: RoleCount[] }>({ totalUsers: 0, signups30d: 0, activeStaff7d: 0, byRole: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch<OrgRow[]>("/api/v1/platform/metrics/orgs"),
      apiFetch<typeof plans>("/api/v1/platform/metrics/plans"),
      apiFetch<typeof payments>("/api/v1/platform/metrics/payments"),
      apiFetch<typeof chat>("/api/v1/platform/metrics/chat"),
      apiFetch<typeof users>("/api/v1/platform/metrics/users"),
    ]).then(([o, p, pay, c, u]) => {
      setOrgs(o);
      setPlans(p);
      setPayments(pay);
      setChat(c);
      setUsers(u);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const msgCounts = chat.messagesPerDay.map(d => d.count);
  const msgMax = Math.max(...msgCounts, 1);

  if (loading) return (
    <div style={{ padding: 40, display: "flex", flexDirection: "column", gap: 12 }}>
      {[1,2,3].map(i => <div key={i} style={{ height: 80, borderRadius: 12, background: "var(--color-surface-2)" }}/>)}
    </div>
  );

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1100, display: "flex", flexDirection: "column", gap: 36 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5, margin: 0 }}>Platform Metrics</h1>
        <p style={{ fontSize: 13, color: "var(--color-fg-3)", marginTop: 4 }}>Live across all organizations</p>
      </div>

      {/* MRR + payments */}
      <div>
        <SH>Revenue</SH>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 12, marginBottom: 20 }}>
          <KCard label="MRR (UZS)" value={fmt(payments.mrrUzs)} sub="sum of active plan prices"/>
          <KCard label="Paid orgs" value={payments.paidOrgs} sub="non-trial"/>
          <KCard label="Pending requests" value={payments.byStatus.filter(s=>s.status==="pending").reduce((a,b)=>a+b.count,0)}/>
          <KCard label="Approved (30d)" value={payments.byStatus.filter(s=>s.status==="approved").reduce((a,b)=>a+b.count,0)}/>
        </div>
        {payments.byStatus.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-hairline)" }}>
                  {["Status","Plan","Count","Total UZS"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "6px 10px", color: "var(--color-fg-4)", fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.byStatus.map((row, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--color-hairline)" }}>
                    <td style={{ padding: "6px 10px" }}>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 999, background: "var(--color-surface-2)", color: statusColor(row.status) }}>{row.status}</span>
                    </td>
                    <td style={{ padding: "6px 10px", textTransform: "capitalize" }}>{row.plan || "—"}</td>
                    <td style={{ padding: "6px 10px", fontVariantNumeric: "tabular-nums" }}>{row.count}</td>
                    <td style={{ padding: "6px 10px", fontVariantNumeric: "tabular-nums" }}>{fmt(row.totalUzs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Plans distribution */}
      <div>
        <SH>Plans</SH>
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, padding: "20px 24px" }}>
          <PlanDonut data={plans.distribution}/>
          {plans.recentUpgrades.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, color: "var(--color-fg-4)", marginBottom: 8 }}>Recent upgrades (30d)</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {plans.recentUpgrades.map((u, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
                    <span style={{ color: "var(--color-fg-2)" }}>{u.orgName}</span>
                    <span style={{ padding: "1px 6px", borderRadius: 999, fontSize: 10, fontWeight: 600,
                      background: "var(--color-surface-2)", color: planColor(u.plan), textTransform: "capitalize" }}>{u.plan}</span>
                    <span style={{ color: "var(--color-fg-4)", marginLeft: "auto" }}>{timeAgo(u.approvedAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Orgs leaderboard */}
      <div>
        <SH>Org Activity (7d)</SH>
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-hairline)", background: "var(--color-surface-2)" }}>
                {["Organization","Plan","Branches","Tickets 7d","MRR","Last active"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "8px 14px", color: "var(--color-fg-4)", fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orgs.map((o, i) => (
                <tr key={o.id} style={{ borderBottom: i < orgs.length-1 ? "1px solid var(--color-hairline)" : "none" }}>
                  <td style={{ padding: "8px 14px", fontWeight: 600 }}>{o.name}</td>
                  <td style={{ padding: "8px 14px" }}>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 999,
                      background: "var(--color-surface-2)", color: planColor(o.plan), textTransform: "capitalize" }}>{o.plan}</span>
                  </td>
                  <td style={{ padding: "8px 14px", fontVariantNumeric: "tabular-nums" }}>{o.branchCount}</td>
                  <td style={{ padding: "8px 14px", fontVariantNumeric: "tabular-nums", fontWeight: o.tickets7d > 0 ? 600 : 400 }}>{fmt(o.tickets7d)}</td>
                  <td style={{ padding: "8px 14px", fontVariantNumeric: "tabular-nums", color: "var(--color-fg-3)" }}>{o.mrrUzs > 0 ? fmt(o.mrrUzs) : "—"}</td>
                  <td style={{ padding: "8px 14px", color: "var(--color-fg-4)" }}>{timeAgo(o.lastActivity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Support chat */}
      <div>
        <SH>Support Chat</SH>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 12 }}>
          <KCard label="Open" value={chat.openConversations}/>
          <KCard label="Resolved (7d)" value={chat.resolved7d}/>
          <KCard label="Avg first reply" value={chat.avgFirstReplyMin !== null ? Math.round(chat.avgFirstReplyMin) + "m" : "—"}/>
        </div>
        {msgCounts.length > 0 && (
          <div style={{ marginTop: 14, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, padding: "16px 20px" }}>
            <div style={{ fontSize: 11, color: "var(--color-fg-4)", marginBottom: 10 }}>Messages per day (7d)</div>
            <MiniBar values={msgCounts} max={msgMax}/>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              {chat.messagesPerDay.map(d => (
                <span key={d.day} style={{ fontSize: 9, color: "var(--color-fg-4)", fontFamily: "var(--font-mono)" }}>
                  {new Date(d.day).toLocaleDateString("en", { weekday: "narrow" })}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Users */}
      <div>
        <SH>Users & Staff</SH>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 12, marginBottom: 16 }}>
          <KCard label="Total users" value={fmt(users.totalUsers)}/>
          <KCard label="Signups (30d)" value={users.signups30d}/>
          <KCard label="Active staff (7d)" value={users.activeStaff7d} sub="via audit log"/>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {users.byRole.map(r => (
            <div key={r.role} style={{
              background: "var(--color-surface)", border: "1px solid var(--color-border)",
              borderRadius: 10, padding: "10px 16px", display: "flex", alignItems: "center", gap: 10,
            }}>
              <span style={{ fontSize: 12, color: "var(--color-fg-3)", textTransform: "capitalize" }}>{r.role.replace("_", " ")}</span>
              <span style={{ fontSize: 16, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{r.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
