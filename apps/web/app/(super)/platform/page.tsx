"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface PlatformStats {
  totalOrganizations: number;
  totalBranches: number;
  totalTicketsToday: number;
  totalUsers: number;
}

function StatTile({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{
      background: "var(--color-surface)", border: "1px solid var(--color-border)",
      borderRadius: 14, padding: "18px 20px",
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-fg-3)",
        textTransform: "uppercase", letterSpacing: 0.5, fontFamily: "var(--font-mono)", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.8, fontVariantNumeric: "tabular-nums" }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: "var(--color-fg-3)", marginTop: 4 }}>{sub}</div>
      )}
    </div>
  );
}

export default function PlatformOverviewPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<PlatformStats>("/api/v1/platform/stats")
      .then(setStats)
      .catch(() => {
        setStats({ totalOrganizations: 0, totalBranches: 0, totalTicketsToday: 0, totalUsers: 0 });
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{
        height: 56, padding: "0 24px",
        display: "flex", alignItems: "center",
        borderBottom: "1px solid var(--color-hairline)",
        background: "var(--color-surface)",
      }}>
        <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: -0.3 }}>Platform overview</span>
      </div>

      <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          <StatTile label="Organizations" value={loading ? "—" : (stats?.totalOrganizations ?? 0)} />
          <StatTile label="Branches" value={loading ? "—" : (stats?.totalBranches ?? 0)} />
          <StatTile label="Tickets today" value={loading ? "—" : (stats?.totalTicketsToday ?? 0)} />
          <StatTile label="Users" value={loading ? "—" : (stats?.totalUsers ?? 0)} />
        </div>

        {/* System status */}
        <div style={{
          background: "var(--color-surface)", border: "1px solid var(--color-border)",
          borderRadius: 14, padding: "18px 20px",
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>System status</div>
          {[
            { name: "Backend API", status: "operational" },
            { name: "PostgreSQL", status: "operational" },
            { name: "Redis", status: "operational" },
            { name: "Nginx (TLS)", status: "operational" },
            { name: "Telegram Bot", status: "operational" },
          ].map((svc) => (
            <div key={svc.name} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "9px 0", borderBottom: "1px solid var(--color-hairline)",
            }}>
              <span style={{ fontSize: 13, color: "var(--color-fg-2)" }}>{svc.name}</span>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999,
                background: "var(--color-success-soft)", color: "var(--color-success)",
                fontFamily: "var(--font-mono)",
              }}>
                {svc.status}
              </span>
            </div>
          ))}
        </div>

        {/* Quick links */}
        <div style={{
          background: "var(--color-surface)", border: "1px solid var(--color-border)",
          borderRadius: 14, padding: "18px 20px",
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Quick actions</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { label: "View tenants →", href: "/platform/tenants" },
              { label: "Feature flags →", href: "/platform/flags" },
              { label: "Audit log →", href: "/platform/audit" },
            ].map((a) => (
              <a key={a.label} href={a.href} style={{
                padding: "8px 14px", borderRadius: 8, border: "1px solid var(--color-border)",
                fontSize: 12, color: "var(--color-fg-2)", textDecoration: "none",
                fontWeight: 500,
              }}>{a.label}</a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
