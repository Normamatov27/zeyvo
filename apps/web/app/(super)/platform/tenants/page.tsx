"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface Tenant {
  id: string;
  slug: string;
  name: string;
  plan: string;
  country: string;
  createdAt: string;
  branchCount?: number;
}

const PLAN_COLOR: Record<string, string> = {
  trial: "var(--color-warning)",
  starter: "var(--color-primary)",
  growth: "var(--color-accent)",
  enterprise: "var(--color-success)",
};

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<Tenant[]>("/api/v1/platform/tenants")
      .then(setTenants)
      .catch(() => setTenants([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{
        height: 56, padding: "0 24px",
        display: "flex", alignItems: "center", gap: 12,
        borderBottom: "1px solid var(--color-hairline)",
        background: "var(--color-surface)",
      }}>
        <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: -0.3, flex: 1 }}>Tenants</span>
        <span style={{ fontSize: 11, color: "var(--color-fg-3)", fontFamily: "var(--font-mono)" }}>
          {tenants.length} organizations
        </span>
      </div>

      <div style={{ flex: 1, padding: 24, overflow: "auto" }}>
        <div style={{
          background: "var(--color-surface)", border: "1px solid var(--color-border)",
          borderRadius: 14, overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 120px 80px 120px 100px",
            padding: "8px 18px",
            fontSize: 10, fontFamily: "var(--font-mono)", textTransform: "uppercase",
            letterSpacing: 0.5, color: "var(--color-fg-4)", fontWeight: 600,
            borderBottom: "1px solid var(--color-hairline)",
          }}>
            <span>Organization</span>
            <span>Slug</span>
            <span>Country</span>
            <span>Plan</span>
            <span>Created</span>
          </div>

          {loading ? (
            [1, 2, 3].map((i) => (
              <div key={i} style={{
                height: 52, margin: "8px 18px", borderRadius: 8,
                background: "var(--color-surface-2)",
              }} />
            ))
          ) : tenants.length === 0 ? (
            <div style={{ padding: "40px 18px", textAlign: "center", color: "var(--color-fg-3)", fontSize: 13 }}>
              No tenants yet. The first organization is created when a user signs up.
            </div>
          ) : tenants.map((t, idx) => (
            <div key={t.id} style={{
              display: "grid", gridTemplateColumns: "1fr 120px 80px 120px 100px",
              padding: "12px 18px", alignItems: "center",
              borderBottom: idx < tenants.length - 1 ? "1px solid var(--color-hairline)" : "none",
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{t.name}</div>
                {t.branchCount != null && (
                  <div style={{ fontSize: 11, color: "var(--color-fg-3)", marginTop: 1 }}>
                    {t.branchCount} branch{t.branchCount !== 1 ? "es" : ""}
                  </div>
                )}
              </div>
              <div style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--color-fg-3)" }}>
                {t.slug}
              </div>
              <div style={{ fontSize: 12, color: "var(--color-fg-2)" }}>{t.country}</div>
              <div>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999,
                  color: PLAN_COLOR[t.plan] ?? "var(--color-fg-3)",
                  background: "color-mix(in oklch, " + (PLAN_COLOR[t.plan] ?? "var(--color-fg-3)") + " 15%, transparent)",
                  fontFamily: "var(--font-mono)",
                }}>
                  {t.plan}
                </span>
              </div>
              <div style={{ fontSize: 11, color: "var(--color-fg-3)", fontFamily: "var(--font-mono)" }}>
                {new Date(t.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
