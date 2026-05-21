"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { BranchDetail } from "@/lib/types";

function AddServiceModal({ branchId, onClose, onCreated }: {
  branchId: string; onClose: () => void; onCreated: () => void;
}) {
  const [form, setForm] = useState({ code: "", name: "", avgDurationS: "300" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setErr(null);
    try {
      await apiFetch(`/api/v1/branches/${branchId}/services`, {
        method: "POST",
        body: JSON.stringify({
          code: form.code.toUpperCase(),
          name: form.name,
          avgDurationS: parseInt(form.avgDurationS) || 300,
        }),
      });
      onCreated();
      onClose();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to create service");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "var(--color-surface)", borderRadius: 16, padding: 24,
        width: 400, display: "flex", flexDirection: "column", gap: 16,
        boxShadow: "var(--shadow-4)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.3 }}>Add service</div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 7, border: "1px solid var(--color-border)",
            background: "var(--color-surface-2)", cursor: "pointer", color: "var(--color-fg-3)",
            display: "grid", placeItems: "center",
          }}>✕</button>
        </div>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-fg-3)" }}>Code * (A–Z)</span>
            <input
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.slice(0, 1).toUpperCase() }))}
              placeholder="A"
              required
              maxLength={1}
              style={{
                padding: "9px 11px", borderRadius: 8,
                border: "1px solid var(--color-border)", background: "var(--color-surface-2)",
                fontSize: 13, color: "var(--color-fg)", fontFamily: "var(--font-mono)",
                letterSpacing: 2,
              }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-fg-3)" }}>Service name *</span>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Open an account"
              required
              style={{
                padding: "9px 11px", borderRadius: 8,
                border: "1px solid var(--color-border)", background: "var(--color-surface-2)",
                fontSize: 13, color: "var(--color-fg)",
              }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-fg-3)" }}>Avg duration (seconds)</span>
            <input
              type="number"
              min={30}
              max={3600}
              value={form.avgDurationS}
              onChange={(e) => setForm((f) => ({ ...f, avgDurationS: e.target.value }))}
              style={{
                padding: "9px 11px", borderRadius: 8,
                border: "1px solid var(--color-border)", background: "var(--color-surface-2)",
                fontSize: 13, color: "var(--color-fg)",
              }}
            />
          </label>

          {err && (
            <div style={{ fontSize: 12, color: "var(--color-danger)", background: "var(--color-danger-soft)",
              padding: "8px 10px", borderRadius: 7 }}>{err}</div>
          )}

          <button type="submit" disabled={saving} style={{
            padding: "11px 0", borderRadius: 10, border: "none",
            background: saving ? "var(--color-fg-4)" : "var(--color-primary)",
            color: "#fff", fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer",
            marginTop: 4,
          }}>
            {saving ? "Creating…" : "Create service"}
          </button>
        </form>
      </div>
    </div>
  );
}

function EditServiceModal({ svc, onClose, onSaved }: {
  svc: { id: string; name: string; avgDurationS: number; priority: number };
  onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: svc.name,
    avgDurationS: String(svc.avgDurationS),
    priority: String(svc.priority),
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setErr(null);
    try {
      await apiFetch(`/api/v1/services/${svc.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: form.name || undefined,
          avgDurationS: parseInt(form.avgDurationS) || undefined,
          priority: parseInt(form.priority),
        }),
      });
      onSaved();
      onClose();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to update service");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "var(--color-surface)", borderRadius: 16, padding: 24,
        width: 400, display: "flex", flexDirection: "column", gap: 16,
        boxShadow: "var(--shadow-4)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.3 }}>Edit service</div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 7, border: "1px solid var(--color-border)",
            background: "var(--color-surface-2)", cursor: "pointer", color: "var(--color-fg-3)",
            display: "grid", placeItems: "center",
          }}>✕</button>
        </div>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-fg-3)" }}>Service name</span>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              style={{
                padding: "9px 11px", borderRadius: 8,
                border: "1px solid var(--color-border)", background: "var(--color-surface-2)",
                fontSize: 13, color: "var(--color-fg)",
              }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-fg-3)" }}>Avg duration (seconds)</span>
            <input
              type="number" min={30} max={3600}
              value={form.avgDurationS}
              onChange={(e) => setForm((f) => ({ ...f, avgDurationS: e.target.value }))}
              style={{
                padding: "9px 11px", borderRadius: 8,
                border: "1px solid var(--color-border)", background: "var(--color-surface-2)",
                fontSize: 13, color: "var(--color-fg)",
              }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-fg-3)" }}>Priority</span>
            <select
              value={form.priority}
              onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
              style={{
                padding: "9px 11px", borderRadius: 8,
                border: "1px solid var(--color-border)", background: "var(--color-surface-2)",
                fontSize: 13, color: "var(--color-fg)",
              }}
            >
              <option value="0">Normal (0)</option>
              <option value="10">Low priority (10)</option>
              <option value="20">High priority (20)</option>
              <option value="90">Emergency (90)</option>
            </select>
          </label>

          {err && (
            <div style={{ fontSize: 12, color: "var(--color-danger)", background: "var(--color-danger-soft)",
              padding: "8px 10px", borderRadius: 7 }}>{err}</div>
          )}

          <button type="submit" disabled={saving} style={{
            padding: "11px 0", borderRadius: 10, border: "none",
            background: saving ? "var(--color-fg-4)" : "var(--color-primary)",
            color: "#fff", fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer",
            marginTop: 4,
          }}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ServicesPage() {
  const [branches, setBranches] = useState<BranchDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [addServiceFor, setAddServiceFor] = useState<string | null>(null);
  const [editService, setEditService] = useState<BranchDetail["services"][0] | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const list = await apiFetch<{ id: string }[]>("/api/v1/branches");
      const details = await Promise.allSettled(
        list.map((b) => apiFetch<BranchDetail>(`/api/v1/branches/${b.id}`))
      );
      const resolved = details
        .filter((r) => r.status === "fulfilled")
        .map((r) => (r as PromiseFulfilledResult<BranchDetail>).value);
      setBranches(resolved);
      if (resolved.length > 0 && !expanded) setExpanded(resolved[0]!.id);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleService(serviceId: string, active: boolean) {
    setToggling(serviceId);
    try {
      await apiFetch(`/api/v1/services/${serviceId}/active?active=${active}`, { method: "PATCH" });
      await load();
    } catch {}
    setToggling(null);
  }

  async function deleteService(serviceId: string) {
    setDeleting(serviceId);
    try {
      await apiFetch(`/api/v1/services/${serviceId}`, { method: "DELETE" });
      setConfirmDelete(null);
      await load();
    } catch {}
    setDeleting(null);
  }

  const totalServices = branches.reduce((s, b) => s + b.services.length, 0);
  const activeServices = branches.reduce((s, b) => s + b.services.filter((sv) => sv.active).length, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{
        height: 56, padding: "0 24px",
        display: "flex", alignItems: "center", gap: 12,
        borderBottom: "1px solid var(--color-hairline)",
        background: "var(--color-surface)",
      }}>
        <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: -0.3, flex: 1 }}>Services</span>
        <span style={{ fontSize: 11, color: "var(--color-fg-3)", fontFamily: "var(--font-mono)" }}>
          {activeServices} active · {totalServices} total
        </span>
      </div>

      <div style={{ flex: 1, padding: 24, overflow: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
        {loading ? (
          [1, 2].map((i) => (
            <div key={i} style={{ height: 120, borderRadius: 12, background: "var(--color-surface)",
              border: "1px solid var(--color-border)" }} />
          ))
        ) : branches.map((b) => {
          const isOpen = expanded === b.id;
          return (
            <div key={b.id} style={{
              background: "var(--color-surface)", border: "1px solid var(--color-border)",
              borderRadius: 14, overflow: "hidden",
              flexShrink: 0,
            }}>
              <div style={{
                padding: "14px 18px",
                display: "flex", alignItems: "center", gap: 12,
                borderBottom: isOpen ? "1px solid var(--color-hairline)" : "none",
              }}>
                <button
                  onClick={() => setExpanded(isOpen ? null : b.id)}
                  style={{
                    flex: 1, display: "flex", alignItems: "center", gap: 12,
                    background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: -0.2, color: "var(--color-fg)" }}>
                      {b.name}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--color-fg-3)", marginTop: 2 }}>
                      {b.services.filter((s) => s.active).length} active · {b.services.length} total services
                    </div>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="var(--color-fg-3)" strokeWidth="2.5"
                    style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s", flexShrink: 0 }}>
                    <path d="m6 9 6 6 6-6"/>
                  </svg>
                </button>

                {isOpen && (
                  <button
                    onClick={() => setAddServiceFor(b.id)}
                    style={{
                      padding: "5px 12px", borderRadius: 7, border: "none",
                      background: "var(--color-primary)", color: "#fff",
                      fontSize: 11, fontWeight: 600, cursor: "pointer", flexShrink: 0,
                    }}
                  >
                    + Add service
                  </button>
                )}
              </div>

              {isOpen && (
                <div>
                  <div style={{
                    display: "grid", gridTemplateColumns: "44px 1fr 110px 90px 90px 90px",
                    padding: "8px 18px",
                    fontSize: 10, fontFamily: "var(--font-mono)", textTransform: "uppercase",
                    letterSpacing: 0.5, color: "var(--color-fg-4)", fontWeight: 600,
                    borderBottom: "1px solid var(--color-hairline)",
                  }}>
                    <span>Code</span>
                    <span>Name</span>
                    <span>Avg duration</span>
                    <span>Priority</span>
                    <span>Status</span>
                    <span>Actions</span>
                  </div>

                  {[...b.services].sort((a, sv) => a.displayOrder - sv.displayOrder).map((svc, idx) => (
                    <div key={svc.id} style={{
                      display: "grid", gridTemplateColumns: "44px 1fr 110px 90px 90px 90px",
                      padding: "11px 18px", alignItems: "center",
                      borderBottom: idx < b.services.length - 1 ? "1px solid var(--color-hairline)" : "none",
                      opacity: (toggling === svc.id || deleting === svc.id) ? 0.5 : 1,
                      transition: "opacity 0.15s",
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 6,
                        background: svc.active ? "var(--color-primary-soft)" : "var(--color-surface-3)",
                        color: svc.active ? "var(--color-primary)" : "var(--color-fg-4)",
                        display: "grid", placeItems: "center",
                        fontSize: 13, fontWeight: 700, fontFamily: "var(--font-mono)",
                      }}>
                        {svc.code}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: svc.active ? "var(--color-fg)" : "var(--color-fg-3)" }}>
                        {svc.name}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--color-fg-2)", fontFamily: "var(--font-mono)" }}>
                        {Math.round(svc.avgDurationS / 60)} min
                      </div>
                      <div style={{ fontSize: 12, color: "var(--color-fg-3)" }}>
                        {svc.priority === 0 ? "Normal" : svc.priority >= 20 ? "High" : "Low"}
                      </div>
                      <div>
                        <button
                          onClick={() => toggleService(svc.id, !svc.active)}
                          disabled={toggling === svc.id}
                          style={{
                            fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 5,
                            border: "1px solid " + (svc.active ? "var(--color-danger)" : "var(--color-success)"),
                            background: "transparent",
                            color: svc.active ? "var(--color-danger)" : "var(--color-success)",
                            cursor: toggling === svc.id ? "wait" : "pointer",
                          }}
                        >
                          {svc.active ? "Disable" : "Enable"}
                        </button>
                      </div>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button
                          onClick={() => setEditService(svc)}
                          style={{
                            fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 5,
                            border: "1px solid var(--color-border)",
                            background: "transparent", color: "var(--color-fg-2)",
                            cursor: "pointer",
                          }}
                        >
                          Edit
                        </button>
                        {confirmDelete === svc.id ? (
                          <button
                            onClick={() => deleteService(svc.id)}
                            disabled={deleting === svc.id}
                            style={{
                              fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 5,
                              border: "1px solid var(--color-danger)",
                              background: "var(--color-danger)", color: "#fff",
                              cursor: "pointer",
                            }}
                          >
                            {deleting === svc.id ? "…" : "Confirm"}
                          </button>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(svc.id)}
                            style={{
                              fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 5,
                              border: "1px solid var(--color-danger)",
                              background: "transparent", color: "var(--color-danger)",
                              cursor: "pointer",
                            }}
                          >
                            Del
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {b.services.length === 0 && (
                    <div style={{ padding: "24px 18px", color: "var(--color-fg-3)", fontSize: 13 }}>
                      No services configured.{" "}
                      <button
                        onClick={() => setAddServiceFor(b.id)}
                        style={{ background: "none", border: "none", color: "var(--color-primary)", cursor: "pointer", fontSize: 13 }}
                      >
                        Add the first one →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {!loading && branches.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--color-fg-3)" }}>
            No branches found.
          </div>
        )}
      </div>

      {addServiceFor && (
        <AddServiceModal
          branchId={addServiceFor}
          onClose={() => setAddServiceFor(null)}
          onCreated={load}
        />
      )}
      {editService && (
        <EditServiceModal
          svc={editService}
          onClose={() => setEditService(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
