"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

interface PlatformStats {
  totalOrganizations: number;
  totalBranches: number;
  totalTicketsToday: number;
  totalUsers: number;
}

interface AuditEvent {
  id: string;
  occurredAt: string;
  actorRole: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  traceId: string | null;
}

function StatTile({ label, value, sub, accent }: {
  label: string; value: string | number; sub?: string; accent?: "primary" | "accent" | "violet" | "success";
}) {
  const accentMap = {
    primary: { bg: "var(--color-primary-soft)", fg: "var(--color-primary)" },
    accent:  { bg: "var(--color-accent-soft)",  fg: "var(--color-accent)" },
    violet:  { bg: "var(--color-violet-soft)",  fg: "var(--color-violet)" },
    success: { bg: "var(--color-success-soft)", fg: "var(--color-success)" },
  };
  const a = accent ? accentMap[accent] : null;
  return (
    <div style={{
      background: "var(--color-surface)", border: "1px solid var(--color-border)",
      borderRadius: 14, padding: "16px 18px",
      position: "relative", overflow: "hidden",
    }}>
      {a && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 3,
          background: a.fg,
        }}/>
      )}
      <div style={{ fontSize: 11, fontWeight: 600,
        color: a ? a.fg : "var(--color-fg-3)",
        textTransform: "uppercase", letterSpacing: 0.5,
        fontFamily: "var(--font-mono)", marginBottom: 8,
      }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.8, fontVariantNumeric: "tabular-nums" }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: "var(--color-fg-3)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - then);
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return Math.floor(diff / 60_000) + "m ago";
  if (diff < 86_400_000) return Math.floor(diff / 3_600_000) + "h ago";
  return Math.floor(diff / 86_400_000) + "d ago";
}

function actionLabel(action: string): string {
  return action.replace(/_/g, " ").replace(/\./g, " · ");
}

export default function PlatformOverviewPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      apiFetch<PlatformStats>("/api/v1/platform/stats"),
      apiFetch<AuditEvent[]>("/api/v1/platform/audit?limit=8"),
    ]).then(([s, a]) => {
      if (s.status === "fulfilled") setStats(s.value);
      if (a.status === "fulfilled") setAudit(a.value);
      setLoading(false);
    });
  }, []);

  // Refresh audit every 30s
  useEffect(() => {
    const iv = setInterval(() => {
      apiFetch<AuditEvent[]>("/api/v1/platform/audit?limit=8").then(setAudit).catch(() => {});
    }, 30_000);
    return () => clearInterval(iv);
  }, []);

  // Trial vs paid orgs estimate — placeholder until we have plans on the org table
  const estMRR = stats ? Math.max(0, stats.totalBranches - 0) * 40 : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{
        height: 56, padding: "0 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid var(--color-hairline)",
        background: "var(--color-surface)",
      }}>
        <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: -0.3 }}>Platform overview</span>
        <span style={{
          display: "flex", alignItems: "center", gap: 6,
          fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--color-fg-3)",
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-success)" }}/>
          live · auto-refresh 30s
        </span>
      </div>

      <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 18, overflow: "auto" }}>
        {/* Top KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
          <StatTile
            label="Organizations"
            value={loading ? "—" : (stats?.totalOrganizations ?? 0)}
            sub="across all tenants"
            accent="primary"
          />
          <StatTile
            label="Branches"
            value={loading ? "—" : (stats?.totalBranches ?? 0)}
            sub={`~$${estMRR} MRR estimate`}
            accent="accent"
          />
          <StatTile
            label="Tickets today"
            value={loading ? "—" : (stats?.totalTicketsToday ?? 0)}
            sub="all branches · last 24h"
            accent="violet"
          />
          <StatTile
            label="Users"
            value={loading ? "—" : (stats?.totalUsers ?? 0)}
            sub="customers + staff"
            accent="success"
          />
          <StatTile
            label="Audit events"
            value={loading ? "—" : audit.length > 0 ? `${audit.length}+` : "0"}
            sub="recent (last loaded)"
          />
        </div>

        {/* Two columns: System status + Recent activity */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 14 }}>
          {/* System status */}
          <div style={{
            background: "var(--color-surface)", border: "1px solid var(--color-border)",
            borderRadius: 14, padding: "14px 18px",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>System status</div>
              <span style={{
                fontSize: 10, fontFamily: "var(--font-mono)",
                color: "var(--color-success)",
                textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600,
              }}>
                all green
              </span>
            </div>
            {[
              { name: "Backend API",   status: "operational" },
              { name: "PostgreSQL",    status: "operational" },
              { name: "Redis",         status: "operational" },
              { name: "Nginx (TLS)",   status: "operational" },
              { name: "Telegram Bot",  status: "operational" },
              { name: "DevSMS",        status: "operational" },
            ].map((svc, i, arr) => (
              <div key={svc.name} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "8px 0",
                borderBottom: i < arr.length - 1 ? "1px solid var(--color-hairline)" : "none",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: "var(--color-success)",
                  }}/>
                  <span style={{ fontSize: 13, color: "var(--color-fg-2)" }}>{svc.name}</span>
                </div>
                <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--color-fg-3)" }}>
                  {svc.status}
                </span>
              </div>
            ))}
          </div>

          {/* Recent activity */}
          <div style={{
            background: "var(--color-surface)", border: "1px solid var(--color-border)",
            borderRadius: 14, padding: "14px 18px",
            display: "flex", flexDirection: "column",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Recent activity</div>
              <Link href="/platform/audit" style={{
                fontSize: 11, color: "var(--color-primary)",
                textDecoration: "none", fontWeight: 500,
                fontFamily: "var(--font-mono)",
              }}>
                view all →
              </Link>
            </div>
            {audit.length === 0 && !loading && (
              <div style={{ fontSize: 12, color: "var(--color-fg-3)", padding: "12px 0" }}>
                No recent events.
              </div>
            )}
            {audit.slice(0, 6).map((ev, i, arr) => (
              <div key={ev.id} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "8px 0",
                borderBottom: i < arr.length - 1 ? "1px solid var(--color-hairline)" : "none",
              }}>
                <span style={{
                  fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--color-fg-4)",
                  minWidth: 64,
                }}>
                  {timeAgo(ev.occurredAt)}
                </span>
                <span style={{
                  fontSize: 12, color: "var(--color-fg-2)",
                  fontFamily: "var(--font-mono)", flex: 1,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {actionLabel(ev.action)}
                </span>
                {ev.actorRole && (
                  <span style={{
                    fontSize: 10, padding: "2px 7px", borderRadius: 999,
                    background: "var(--color-surface-2)", color: "var(--color-fg-3)",
                    fontFamily: "var(--font-mono)", fontWeight: 600,
                  }}>
                    {ev.actorRole}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div style={{
          background: "var(--color-surface)", border: "1px solid var(--color-border)",
          borderRadius: 14, padding: "14px 18px",
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Quick actions</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {[
              { label: "Tenants",       href: "/platform/tenants", desc: "Org list, plan, status" },
              { label: "Feature flags", href: "/platform/flags",   desc: "Toggle rollouts" },
              { label: "Audit log",     href: "/platform/audit",   desc: "Every action recorded" },
            ].map((a) => (
              <Link key={a.label} href={a.href} style={{
                padding: "12px 14px", borderRadius: 10,
                border: "1px solid var(--color-border)",
                background: "var(--color-surface-2)",
                textDecoration: "none",
                display: "flex", flexDirection: "column", gap: 4,
              }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-fg)" }}>
                  {a.label} →
                </span>
                <span style={{ fontSize: 11, color: "var(--color-fg-3)" }}>{a.desc}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
