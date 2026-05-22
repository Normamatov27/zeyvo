"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

interface TenantDetail {
  id: string;
  slug: string;
  name: string;
  country: string;
  locale: string;
  plan: string;
  active: boolean;
  createdAt: string;
  staffCount: number;
  ticketsTotal: number;
  branches: BranchRow[];
}

interface BranchRow {
  id: string;
  name: string;
  slug: string;
  address: string;
  type: string;
  active: boolean;
  createdAt: string;
}

interface StaffRow {
  id: string;
  fullName: string | null;
  phone: string | null;
  createdAt: string | null;
  roles: string[];
}

const PLANS = ["trial", "starter", "growth", "enterprise"];
const PLAN_COLOR: Record<string, string> = {
  trial: "var(--color-warning)",
  starter: "var(--color-primary)",
  growth: "var(--color-accent)",
  enterprise: "var(--color-success)",
};

function Section({ title, children, action }: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div style={{
      background: "var(--color-surface)", border: "1px solid var(--color-border)",
      borderRadius: 14, overflow: "hidden",
    }}>
      <div style={{
        padding: "12px 18px",
        borderBottom: "1px solid var(--color-hairline)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: -0.2 }}>{title}</div>
        {action}
      </div>
      {children}
    </div>
  );
}

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loadingTenant, setLoadingTenant] = useState(true);
  const [loadingStaff, setLoadingStaff] = useState(true);

  // Delete state
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editPlan, setEditPlan] = useState("trial");
  const [editCountry, setEditCountry] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  const loadTenant = useCallback(async () => {
    try {
      const data = await apiFetch<TenantDetail>(`/api/v1/platform/tenants/${id}`);
      setTenant(data);
    } catch {}
    setLoadingTenant(false);
  }, [id]);

  const loadStaff = useCallback(async () => {
    try {
      const data = await apiFetch<StaffRow[]>(`/api/v1/platform/tenants/${id}/staff`);
      setStaff(data);
    } catch {}
    setLoadingStaff(false);
  }, [id]);

  useEffect(() => {
    loadTenant();
    loadStaff();
  }, [loadTenant, loadStaff]);

  function startEdit() {
    if (!tenant) return;
    setEditName(tenant.name);
    setEditSlug(tenant.slug);
    setEditPlan(tenant.plan);
    setEditCountry(tenant.country);
    setSaveErr(null);
    setEditing(true);
  }

  async function saveEdit() {
    setSaving(true); setSaveErr(null);
    try {
      const updated = await apiFetch<TenantDetail>(`/api/v1/platform/tenants/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: editName, slug: editSlug, plan: editPlan, country: editCountry }),
      });
      setTenant((prev) => prev ? { ...prev, ...updated } : prev);
      setEditing(false);
    } catch (e: any) {
      setSaveErr(e?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function deleteTenant() {
    setDeleting(true);
    try {
      await apiFetch(`/api/v1/platform/tenants/${id}`, { method: "DELETE" });
      router.replace("/platform/tenants" as any);
    } catch {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  async function toggleActive() {
    if (!tenant) return;
    try {
      const updated = await apiFetch<{ active: boolean }>(`/api/v1/platform/tenants/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !tenant.active }),
      });
      setTenant((prev) => prev ? { ...prev, active: updated.active } : prev);
    } catch {}
  }

  async function toggleBranch(branchId: string, currentActive: boolean) {
    try {
      await apiFetch(`/api/v1/platform/tenants/${id}/branches/${branchId}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !currentActive }),
      });
      setTenant((prev) => prev ? {
        ...prev,
        branches: prev.branches.map((b) => b.id === branchId ? { ...b, active: !currentActive } : b),
      } : prev);
    } catch {}
  }

  async function removeStaff(userId: string) {
    try {
      await apiFetch(`/api/v1/platform/tenants/${id}/staff/${userId}`, { method: "DELETE" });
      setStaff((prev) => prev.filter((s) => s.id !== userId));
    } catch {}
  }

  if (loadingTenant) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{
          height: 56, padding: "0 24px", display: "flex", alignItems: "center",
          borderBottom: "1px solid var(--color-hairline)", background: "var(--color-surface)",
        }}>
          <div style={{ height: 18, width: 200, borderRadius: 6, background: "var(--color-surface-2)" }} />
        </div>
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
          {[180, 200, 160].map((h, i) => (
            <div key={i} style={{ height: h, borderRadius: 14, background: "var(--color-surface)", border: "1px solid var(--color-border)" }} />
          ))}
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--color-fg-3)" }}>
        Tenant not found.{" "}
        <button onClick={() => router.back()} style={{ color: "var(--color-primary)", background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>
          Go back
        </button>
      </div>
    );
  }

  const activeBranches = tenant.branches.filter((b) => b.active).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "auto" }}>
      {/* Header */}
      <div style={{
        height: 56, padding: "0 24px", flexShrink: 0,
        display: "flex", alignItems: "center", gap: 12,
        borderBottom: "1px solid var(--color-hairline)",
        background: "var(--color-surface)",
      }}>
        <button onClick={() => router.push("/platform/tenants" as any)} style={{
          background: "none", border: "none", cursor: "pointer",
          color: "var(--color-fg-3)", fontSize: 13, padding: "4px 0",
          display: "flex", alignItems: "center", gap: 4,
        }}>← Tenants</button>
        <span style={{ color: "var(--color-hairline)" }}>|</span>
        <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: -0.3 }}>{tenant.name}</span>
        <span style={{
          fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999,
          color: PLAN_COLOR[tenant.plan] ?? "var(--color-fg-3)",
          background: `color-mix(in oklch, ${PLAN_COLOR[tenant.plan] ?? "var(--color-fg-3)"} 15%, transparent)`,
          fontFamily: "var(--font-mono)",
        }}>{tenant.plan}</span>
        {!tenant.active && (
          <span style={{
            fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999,
            color: "var(--color-danger)", background: "var(--color-danger-soft)",
            fontFamily: "var(--font-mono)",
          }}>suspended</span>
        )}
        <div style={{ flex: 1 }} />
        <button onClick={toggleActive} style={{
          padding: "6px 14px", borderRadius: 8, border: "none",
          background: tenant.active ? "var(--color-danger-soft)" : "var(--color-success-soft)",
          color: tenant.active ? "var(--color-danger)" : "var(--color-success)",
          fontSize: 12, fontWeight: 600, cursor: "pointer",
        }}>
          {tenant.active ? "Suspend org" : "Activate org"}
        </button>
        <button onClick={startEdit} style={{
          padding: "6px 14px", borderRadius: 8, border: "1px solid var(--color-border)",
          background: "var(--color-surface-2)", color: "var(--color-fg-2)",
          fontSize: 12, fontWeight: 600, cursor: "pointer",
        }}>
          Edit
        </button>
        <button onClick={() => setConfirmDelete(true)} style={{
          padding: "6px 14px", borderRadius: 8,
          border: "1.5px solid var(--color-danger)", background: "transparent",
          color: "var(--color-danger)", fontSize: 12, fontWeight: 600, cursor: "pointer",
        }}>
          Delete org
        </button>
      </div>

      <div style={{ flex: 1, padding: 24, display: "flex", flexDirection: "column", gap: 16, overflow: "auto" }}>
        {/* Edit panel */}
        {editing && (
          <div style={{
            background: "var(--color-surface)", border: "1.5px solid var(--color-primary)",
            borderRadius: 14, padding: "18px 20px",
            display: "flex", flexDirection: "column", gap: 14,
          }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Edit organization</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
              {[
                { label: "Name", value: editName, onChange: setEditName },
                { label: "Slug", value: editSlug, onChange: setEditSlug },
                { label: "Country", value: editCountry, onChange: setEditCountry },
              ].map(({ label, value, onChange }) => (
                <label key={label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: "var(--color-fg-3)", textTransform: "uppercase", letterSpacing: 0.4 }}>
                    {label}
                  </span>
                  <input
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    style={{
                      padding: "8px 10px", borderRadius: 8,
                      border: "1px solid var(--color-border)", background: "var(--color-surface-2)",
                      fontSize: 13, color: "var(--color-fg)", outline: "none",
                    }}
                  />
                </label>
              ))}
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: "var(--color-fg-3)", textTransform: "uppercase", letterSpacing: 0.4 }}>
                  Plan
                </span>
                <select
                  value={editPlan}
                  onChange={(e) => setEditPlan(e.target.value)}
                  style={{
                    padding: "8px 10px", borderRadius: 8,
                    border: "1px solid var(--color-border)", background: "var(--color-surface-2)",
                    fontSize: 13, color: "var(--color-fg)", cursor: "pointer",
                  }}
                >
                  {PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
            </div>
            {saveErr && (
              <div style={{ fontSize: 12, color: "var(--color-danger)", background: "var(--color-danger-soft)", padding: "8px 10px", borderRadius: 7 }}>
                {saveErr}
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setEditing(false)} style={{
                padding: "8px 16px", borderRadius: 8, border: "1px solid var(--color-border)",
                background: "transparent", color: "var(--color-fg-3)", fontSize: 13, cursor: "pointer",
              }}>Cancel</button>
              <button onClick={saveEdit} disabled={saving} style={{
                padding: "8px 16px", borderRadius: 8, border: "none",
                background: "var(--color-primary)", color: "#fff",
                fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer",
              }}>{saving ? "Saving…" : "Save changes"}</button>
            </div>
          </div>
        )}

        {/* KPI row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {[
            { label: "Branches", value: `${activeBranches} / ${tenant.branches.length}`, sub: "active / total" },
            { label: "Staff", value: tenant.staffCount, sub: "operators + managers" },
            { label: "Tickets total", value: tenant.ticketsTotal.toLocaleString(), sub: "all time" },
            { label: "Created", value: new Date(tenant.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }), sub: `slug: ${tenant.slug}` },
          ].map(({ label, value, sub }) => (
            <div key={label} style={{
              background: "var(--color-surface)", border: "1px solid var(--color-border)",
              borderRadius: 12, padding: "14px 16px",
            }}>
              <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", textTransform: "uppercase",
                letterSpacing: 0.5, color: "var(--color-fg-4)", fontWeight: 600, marginBottom: 6 }}>
                {label}
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5, fontVariantNumeric: "tabular-nums" }}>
                {value}
              </div>
              <div style={{ fontSize: 11, color: "var(--color-fg-3)", marginTop: 3 }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Branches */}
        <Section title={`Branches (${tenant.branches.length})`}>
          {tenant.branches.length === 0 ? (
            <div style={{ padding: "24px 18px", color: "var(--color-fg-3)", fontSize: 13 }}>
              No branches yet.
            </div>
          ) : (
            <>
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 140px 80px 80px 80px",
                padding: "7px 18px",
                fontSize: 10, fontFamily: "var(--font-mono)", textTransform: "uppercase",
                letterSpacing: 0.5, color: "var(--color-fg-4)", fontWeight: 600,
                borderBottom: "1px solid var(--color-hairline)",
              }}>
                <span>Name</span><span>Slug</span><span>Type</span><span>Status</span><span style={{ textAlign: "right" }}>Action</span>
              </div>
              {tenant.branches.map((b, idx) => (
                <div key={b.id} style={{
                  display: "grid", gridTemplateColumns: "1fr 140px 80px 80px 80px",
                  padding: "11px 18px", alignItems: "center",
                  borderBottom: idx < tenant.branches.length - 1 ? "1px solid var(--color-hairline)" : "none",
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{b.name}</div>
                    {b.address && (
                      <div style={{ fontSize: 11, color: "var(--color-fg-3)", marginTop: 1 }}>{b.address}</div>
                    )}
                  </div>
                  <div style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--color-fg-3)" }}>
                    {b.slug}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-fg-3)", textTransform: "capitalize" }}>{b.type}</div>
                  <div>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 999,
                      color: b.active ? "var(--color-success)" : "var(--color-fg-4)",
                      background: b.active ? "var(--color-success-soft)" : "var(--color-surface-2)",
                    }}>
                      {b.active ? "active" : "off"}
                    </span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <button onClick={() => toggleBranch(b.id, b.active)} style={{
                      padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer",
                      border: b.active ? "1.5px solid var(--color-danger)" : "1.5px solid var(--color-success)",
                      color: b.active ? "var(--color-danger)" : "var(--color-success)",
                      background: "transparent",
                    }}>
                      {b.active ? "Disable" : "Enable"}
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </Section>

        {/* Staff */}
        <Section title={`Staff (${staff.length})`}>
          {loadingStaff ? (
            <div style={{ padding: "20px 18px", color: "var(--color-fg-3)", fontSize: 13 }}>Loading…</div>
          ) : staff.length === 0 ? (
            <div style={{ padding: "24px 18px", color: "var(--color-fg-3)", fontSize: 13 }}>
              No staff members in this organization.
            </div>
          ) : (
            <>
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 160px 200px 80px",
                padding: "7px 18px",
                fontSize: 10, fontFamily: "var(--font-mono)", textTransform: "uppercase",
                letterSpacing: 0.5, color: "var(--color-fg-4)", fontWeight: 600,
                borderBottom: "1px solid var(--color-hairline)",
              }}>
                <span>Name</span><span>Phone</span><span>Roles</span><span style={{ textAlign: "right" }}>Action</span>
              </div>
              {staff.map((s, idx) => (
                <div key={s.id} style={{
                  display: "grid", gridTemplateColumns: "1fr 160px 200px 80px",
                  padding: "11px 18px", alignItems: "center",
                  borderBottom: idx < staff.length - 1 ? "1px solid var(--color-hairline)" : "none",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 7, flex: "none",
                      background: "oklch(0.3 0.08 25)", color: "#fff",
                      display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700,
                    }}>
                      {(s.fullName ?? s.phone ?? "?").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{s.fullName ?? <span style={{ color: "var(--color-fg-4)" }}>No name</span>}</div>
                      <div style={{ fontSize: 10, color: "var(--color-fg-4)", fontFamily: "var(--font-mono)" }}>
                        {s.id.slice(0, 12)}…
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--color-fg-2)" }}>
                    {s.phone ?? "—"}
                  </div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {s.roles.map((r) => (
                      <span key={r} style={{
                        fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 4,
                        background: "var(--color-primary-soft)", color: "var(--color-primary)",
                        fontFamily: "var(--font-mono)",
                      }}>
                        {r}
                      </span>
                    ))}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <button onClick={() => removeStaff(s.id)} style={{
                      padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer",
                      border: "1.5px solid var(--color-danger)", color: "var(--color-danger)",
                      background: "transparent",
                    }}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </Section>
      </div>

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
        }} onClick={() => !deleting && setConfirmDelete(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: "var(--color-surface)", borderRadius: 16, padding: 28,
            width: 400, display: "flex", flexDirection: "column", gap: 16,
            boxShadow: "var(--shadow-4)",
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: "var(--color-danger-soft)", color: "var(--color-danger)",
              display: "grid", placeItems: "center", fontSize: 20,
            }}>⚠</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.3 }}>
                Delete "{tenant?.name}"?
              </div>
              <div style={{ fontSize: 13, color: "var(--color-fg-3)", marginTop: 6, lineHeight: 1.5 }}>
                This permanently deletes the organization and all its branches, staff assignments,
                services, windows, appointments, and tickets. This cannot be undone.
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setConfirmDelete(false)} disabled={deleting} style={{
                flex: 1, padding: "10px 0", borderRadius: 10,
                border: "1px solid var(--color-border)", background: "transparent",
                color: "var(--color-fg-3)", fontSize: 13, fontWeight: 500,
                cursor: deleting ? "not-allowed" : "pointer",
              }}>
                Cancel
              </button>
              <button onClick={deleteTenant} disabled={deleting} style={{
                flex: 1, padding: "10px 0", borderRadius: 10, border: "none",
                background: "var(--color-danger)", color: "#fff",
                fontSize: 13, fontWeight: 700,
                cursor: deleting ? "not-allowed" : "pointer",
              }}>
                {deleting ? "Deleting…" : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
