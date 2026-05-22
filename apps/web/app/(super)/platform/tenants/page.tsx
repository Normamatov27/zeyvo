"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
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

const PLANS = ["trial", "starter", "growth", "enterprise"];
const PLAN_COLOR: Record<string, string> = {
  trial: "var(--color-warning)",
  starter: "var(--color-primary)",
  growth: "var(--color-accent)",
  enterprise: "var(--color-success)",
};

function CreateTenantModal({ onClose, onCreated }: {
  onClose: () => void;
  onCreated: (t: Tenant) => void;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [plan, setPlan] = useState("trial");
  const [country, setCountry] = useState("UZ");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setErr("Name is required"); return; }
    setSaving(true); setErr(null);
    try {
      const body: Record<string, string> = { name: name.trim(), plan, country: country.toUpperCase() };
      if (slug.trim()) body.slug = slug.trim();
      const created = await apiFetch<Tenant>("/api/v1/platform/tenants", {
        method: "POST",
        body: JSON.stringify(body),
      });
      onCreated(created);
      onClose();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to create tenant");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "var(--color-surface)", borderRadius: 16, padding: 24,
        width: 420, display: "flex", flexDirection: "column", gap: 16,
        boxShadow: "var(--shadow-4)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.3 }}>New tenant</div>
            <div style={{ fontSize: 12, color: "var(--color-fg-3)", marginTop: 2 }}>
              Creates an organization immediately — no OTP required
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 7, border: "1px solid var(--color-border)",
            background: "var(--color-surface-2)", cursor: "pointer", color: "var(--color-fg-3)",
            display: "grid", placeItems: "center",
          }}>✕</button>
        </div>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { label: "Organization name", value: name, onChange: setName, placeholder: "Asaka Bank", required: true },
            { label: "Slug (auto-generated if blank)", value: slug, onChange: setSlug, placeholder: "asaka-bank" },
            { label: "Country code", value: country, onChange: setCountry, placeholder: "UZ" },
          ].map(({ label, value, onChange, placeholder, required }) => (
            <label key={label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-fg-3)", textTransform: "uppercase", letterSpacing: 0.4 }}>
                {label}
              </span>
              <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                required={required}
                style={{
                  padding: "9px 12px", borderRadius: 8,
                  border: "1px solid var(--color-border)", background: "var(--color-surface-2)",
                  fontSize: 13, color: "var(--color-fg)", outline: "none",
                }}
              />
            </label>
          ))}

          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-fg-3)", textTransform: "uppercase", letterSpacing: 0.4 }}>
              Plan
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              {PLANS.map((p) => (
                <button key={p} type="button" onClick={() => setPlan(p)} style={{
                  flex: 1, padding: "7px 0", borderRadius: 7, cursor: "pointer",
                  border: `1.5px solid ${plan === p ? (PLAN_COLOR[p] ?? "var(--color-primary)") : "var(--color-border)"}`,
                  background: plan === p ? `color-mix(in oklch, ${PLAN_COLOR[p]} 15%, transparent)` : "var(--color-surface-2)",
                  color: plan === p ? (PLAN_COLOR[p] ?? "var(--color-primary)") : "var(--color-fg-3)",
                  fontSize: 11, fontWeight: plan === p ? 700 : 400,
                  fontFamily: "var(--font-mono)",
                }}>
                  {p}
                </button>
              ))}
            </div>
          </label>

          {err && (
            <div style={{ fontSize: 12, color: "var(--color-danger)", background: "var(--color-danger-soft)", padding: "8px 10px", borderRadius: 7 }}>
              {err}
            </div>
          )}

          <button type="submit" disabled={saving} style={{
            padding: "11px 0", borderRadius: 10, border: "none",
            background: saving ? "var(--color-fg-4)" : "oklch(0.3 0.08 25)",
            color: "#fff", fontSize: 14, fontWeight: 600,
            cursor: saving ? "not-allowed" : "pointer", marginTop: 4,
          }}>
            {saving ? "Creating…" : "Create tenant"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<Tenant[]>("/api/v1/platform/tenants");
      setTenants(data);
    } catch {
      setTenants([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

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
        <button onClick={() => setShowCreate(true)} style={{
          padding: "6px 14px", borderRadius: 8, border: "none",
          background: "oklch(0.3 0.08 25)", color: "#fff",
          fontSize: 12, fontWeight: 600, cursor: "pointer",
        }}>
          + New tenant
        </button>
      </div>

      <div style={{ flex: 1, padding: 24, overflow: "auto" }}>
        <div style={{
          background: "var(--color-surface)", border: "1px solid var(--color-border)",
          borderRadius: 14, overflow: "hidden",
        }}>
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
              No tenants yet.{" "}
              <button onClick={() => setShowCreate(true)} style={{
                color: "oklch(0.58 0.2 25)", background: "none", border: "none",
                cursor: "pointer", fontSize: 13, fontWeight: 500,
              }}>
                Create the first one →
              </button>
            </div>
          ) : tenants.map((t, idx) => (
            <div key={t.id}
              onClick={() => router.push(`/platform/tenants/${t.id}` as any)}
              style={{
                display: "grid", gridTemplateColumns: "1fr 120px 80px 120px 100px",
                padding: "12px 18px", alignItems: "center",
                borderBottom: idx < tenants.length - 1 ? "1px solid var(--color-hairline)" : "none",
                cursor: "pointer", transition: "background 0.1s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-2)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "")}
            >
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

      {showCreate && (
        <CreateTenantModal
          onClose={() => setShowCreate(false)}
          onCreated={(t) => setTenants((prev) => [t, ...prev])}
        />
      )}
    </div>
  );
}
