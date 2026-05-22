"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { BranchDetail, branchLoadLevel } from "@/lib/types";

// ── Branch QR Modal ───────────────────────────────────────────────────────────
function BranchQrModal({ branch, onClose }: { branch: BranchDetail; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const url = typeof window !== "undefined"
    ? `${window.location.origin}/branch/${branch.id}`
    : `/branch/${branch.id}`;

  useEffect(() => {
    if (!canvasRef.current) return;
    import("qrcode").then((QRCode) => {
      QRCode.toCanvas(canvasRef.current!, url, {
        width: 240, margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      });
    });
  }, [url]);

  function printQr() {
    const w = window.open("", "_blank", "width=600,height=700");
    if (!w) return;
    const canvas = canvasRef.current;
    const dataUrl = canvas ? canvas.toDataURL() : "";
    w.document.write(`<!DOCTYPE html><html><head><title>QR — ${branch.name}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: system-ui, sans-serif; display:flex; flex-direction:column;
    align-items:center; justify-content:center; min-height:100vh; padding:32px; background:#fff; }
  .brand { font-size:28px; font-weight:800; letter-spacing:-1px; color:#4f46e5; margin-bottom:6px; }
  .branch { font-size:20px; font-weight:600; color:#111; margin-bottom:24px; text-align:center; }
  img { width:260px; height:260px; display:block; }
  .hint { font-size:15px; color:#666; margin-top:20px; text-align:center; }
</style></head><body>
<div class="brand">zeyvo</div>
<div class="branch">${branch.name}</div>
<img src="${dataUrl}" alt="QR code"/>
<div class="hint">Scan to join the queue on your phone</div>
<script>window.focus(); window.print(); window.onafterprint = () => window.close();</script>
</body></html>`);
    w.document.close();
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "var(--color-surface)", borderRadius: 16, padding: 28,
        width: 340, display: "flex", flexDirection: "column", gap: 16, alignItems: "center",
        boxShadow: "var(--shadow-4)",
      }}>
        <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.3 }}>Join QR code</div>
            <div style={{ fontSize: 11, color: "var(--color-fg-3)", marginTop: 2 }}>{branch.name}</div>
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 7, border: "1px solid var(--color-border)",
            background: "var(--color-surface-2)", cursor: "pointer", color: "var(--color-fg-3)",
            display: "grid", placeItems: "center",
          }}>✕</button>
        </div>

        <div style={{
          background: "#fff", borderRadius: 12, padding: 12,
          border: "1px solid var(--color-border)",
        }}>
          <canvas ref={canvasRef} style={{ display: "block", borderRadius: 4 }} />
        </div>

        <div style={{ fontSize: 11, color: "var(--color-fg-3)", textAlign: "center" }}>
          Customers scan this to join the queue on their phone
        </div>

        <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--color-fg-4)",
          wordBreak: "break-all", textAlign: "center" }}>{url}</div>

        <button onClick={printQr} style={{
          width: "100%", padding: "10px 0", borderRadius: 10, border: "none",
          background: "var(--color-primary)", color: "#fff",
          fontSize: 13, fontWeight: 600, cursor: "pointer",
        }}>
          Print poster
        </button>
      </div>
    </div>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface OperatingHoursDto {
  dayOfWeek: number; // 0=Sun … 6=Sat
  openAt: string;    // "HH:mm"
  closeAt: string;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// ── Operating Hours Modal ─────────────────────────────────────────────────────
function OperatingHoursModal({ branch, onClose }: { branch: BranchDetail; onClose: () => void }) {
  const [rows, setRows] = useState<(OperatingHoursDto & { enabled: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<OperatingHoursDto[]>(`/api/v1/branches/${branch.id}/operating-hours`)
      .then((data) => {
        // Build a full 7-day grid, filling in saved hours
        const map: Record<number, OperatingHoursDto> = {};
        data.forEach((h) => { map[h.dayOfWeek] = h; });
        setRows(
          [1, 2, 3, 4, 5, 6, 0].map((d) => ({
            dayOfWeek: d,
            openAt: map[d]?.openAt ?? "09:00",
            closeAt: map[d]?.closeAt ?? "18:00",
            enabled: !!map[d],
          }))
        );
      })
      .catch(() => {
        // Default all days if fetch fails
        setRows(
          [1, 2, 3, 4, 5, 6, 0].map((d) => ({
            dayOfWeek: d, openAt: "09:00", closeAt: "18:00",
            enabled: d !== 0, // Mon-Sat enabled by default, Sun off
          }))
        );
      })
      .finally(() => setLoading(false));
  }, [branch.id]);

  function update(idx: number, field: string, value: string | boolean) {
    setRows((r) => r.map((row, i) => i === idx ? { ...row, [field]: value } : row));
  }

  async function save() {
    setSaving(true); setErr(null);
    try {
      const payload = rows.filter((r) => r.enabled).map(({ dayOfWeek, openAt, closeAt }) => ({
        dayOfWeek, openAt, closeAt,
      }));
      await apiFetch(`/api/v1/branches/${branch.id}/operating-hours`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      onClose();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to save");
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
        width: 480, display: "flex", flexDirection: "column", gap: 16,
        boxShadow: "var(--shadow-4)", maxHeight: "90vh", overflow: "auto",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.3 }}>Operating hours</div>
            <div style={{ fontSize: 11, color: "var(--color-fg-3)", marginTop: 2 }}>{branch.name}</div>
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 7, border: "1px solid var(--color-border)",
            background: "var(--color-surface-2)", cursor: "pointer", color: "var(--color-fg-3)",
            display: "grid", placeItems: "center",
          }}>✕</button>
        </div>

        {loading ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "var(--color-fg-3)", fontSize: 13 }}>
            Loading…
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {/* Column labels */}
            <div style={{
              display: "grid", gridTemplateColumns: "24px 100px 1fr 14px 1fr",
              gap: 8, padding: "0 4px",
              fontSize: 10, fontFamily: "var(--font-mono)", textTransform: "uppercase",
              letterSpacing: 0.5, color: "var(--color-fg-4)", fontWeight: 600,
            }}>
              <span></span>
              <span>Day</span>
              <span>Open</span>
              <span></span>
              <span>Close</span>
            </div>

            {rows.map((row, idx) => (
              <div key={row.dayOfWeek} style={{
                display: "grid", gridTemplateColumns: "24px 100px 1fr 14px 1fr",
                gap: 8, alignItems: "center",
                opacity: row.enabled ? 1 : 0.4,
                transition: "opacity 0.1s",
              }}>
                {/* Toggle */}
                <input type="checkbox" checked={row.enabled}
                  onChange={(e) => update(idx, "enabled", e.target.checked)}
                  style={{ width: 14, height: 14, accentColor: "var(--color-primary)", cursor: "pointer" }} />

                {/* Day name */}
                <span style={{ fontSize: 13, fontWeight: row.enabled ? 600 : 400, color: "var(--color-fg)" }}>
                  {DAY_NAMES[row.dayOfWeek]}
                </span>

                {/* Open time */}
                <input type="time" value={row.openAt} disabled={!row.enabled}
                  onChange={(e) => update(idx, "openAt", e.target.value)}
                  style={{
                    padding: "6px 8px", borderRadius: 7, fontSize: 13,
                    border: "1px solid var(--color-border)", background: "var(--color-surface-2)",
                    color: "var(--color-fg)", width: "100%",
                  }} />

                <span style={{ fontSize: 11, color: "var(--color-fg-4)", textAlign: "center" }}>–</span>

                {/* Close time */}
                <input type="time" value={row.closeAt} disabled={!row.enabled}
                  onChange={(e) => update(idx, "closeAt", e.target.value)}
                  style={{
                    padding: "6px 8px", borderRadius: 7, fontSize: 13,
                    border: "1px solid var(--color-border)", background: "var(--color-surface-2)",
                    color: "var(--color-fg)", width: "100%",
                  }} />
              </div>
            ))}
          </div>
        )}

        {err && (
          <div style={{ fontSize: 12, color: "var(--color-danger)", background: "var(--color-danger-soft)",
            padding: "8px 10px", borderRadius: 7 }}>{err}</div>
        )}

        <button onClick={save} disabled={saving || loading} style={{
          padding: "11px 0", borderRadius: 10, border: "none",
          background: saving ? "var(--color-fg-4)" : "var(--color-primary)",
          color: "#fff", fontSize: 14, fontWeight: 600,
          cursor: saving || loading ? "not-allowed" : "pointer",
        }}>
          {saving ? "Saving…" : "Save hours"}
        </button>
      </div>
    </div>
  );
}

const TYPE_LABELS: Record<string, string> = {
  bank: "Bank", clinic: "Clinic", telecom: "Telecom",
  government: "Government", custom: "Custom", general: "General",
};
const LOAD_DOT: Record<string, string> = {
  low: "var(--color-success)", medium: "var(--color-warning)", high: "var(--color-danger)",
};

// ── Edit Branch Modal ─────────────────────────────────────────────────────────
function EditBranchModal({ branch, onClose, onSaved }: {
  branch: BranchDetail; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: branch.name, shortName: branch.shortName ?? "",
    address: branch.address ?? "", capacity: String(branch.capacity),
    timezone: branch.timezone, type: branch.type,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setErr(null);
    try {
      await apiFetch(`/api/v1/branches/${branch.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: form.name || undefined,
          shortName: form.shortName || null,
          address: form.address || null,
          capacity: parseInt(form.capacity) || undefined,
          timezone: form.timezone || undefined,
          type: form.type || undefined,
        }),
      });
      onSaved();
      onClose();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to update branch");
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
        width: 440, display: "flex", flexDirection: "column", gap: 16,
        boxShadow: "var(--shadow-4)", maxHeight: "90vh", overflow: "auto",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.3 }}>Edit branch</div>
            <div style={{ fontSize: 11, color: "var(--color-fg-3)", marginTop: 2 }}>{branch.name}</div>
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 7, border: "1px solid var(--color-border)",
            background: "var(--color-surface-2)", cursor: "pointer", color: "var(--color-fg-3)",
            display: "grid", placeItems: "center",
          }}>✕</button>
        </div>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { label: "Branch name", key: "name", placeholder: "Asaka Bank · Mirzo Ulugbek" },
            { label: "Short name", key: "shortName", placeholder: "Asaka MU" },
            { label: "Address", key: "address", placeholder: "Mirzo Ulugbek 32, Toshkent" },
            { label: "Capacity", key: "capacity", placeholder: "100" },
            { label: "Timezone", key: "timezone", placeholder: "Asia/Tashkent" },
          ].map(({ label, key, placeholder }) => (
            <label key={key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-fg-3)" }}>{label}</span>
              <input
                value={(form as any)[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                style={{
                  padding: "9px 11px", borderRadius: 8,
                  border: "1px solid var(--color-border)", background: "var(--color-surface-2)",
                  fontSize: 13, color: "var(--color-fg)",
                }}
              />
            </label>
          ))}

          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-fg-3)" }}>Type</span>
            <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              style={{
                padding: "9px 11px", borderRadius: 8,
                border: "1px solid var(--color-border)", background: "var(--color-surface-2)",
                fontSize: 13, color: "var(--color-fg)",
              }}>
              {Object.entries(TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </label>

          {err && <div style={{ fontSize: 12, color: "var(--color-danger)", background: "var(--color-danger-soft)",
            padding: "8px 10px", borderRadius: 7 }}>{err}</div>}

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

// ── Edit Window Modal ─────────────────────────────────────────────────────────
function EditWindowModal({ win, onClose, onSaved }: {
  win: BranchDetail["windows"][0]; onClose: () => void; onSaved: () => void;
}) {
  const [label, setLabel] = useState(win.label ?? "");
  const [serviceCodes, setServiceCodes] = useState((win.serviceCodes ?? []).join(", "));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setErr(null);
    try {
      const codes = serviceCodes.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
      await apiFetch(`/api/v1/windows/${win.id}`, {
        method: "PATCH",
        body: JSON.stringify({ label: label || null, serviceCodes: codes }),
      });
      onSaved();
      onClose();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to update window");
    } finally {
      setSaving(false);
    }
  }

  async function deleteWindow() {
    setDeleting(true); setErr(null);
    try {
      await apiFetch(`/api/v1/windows/${win.id}`, { method: "DELETE" });
      onSaved();
      onClose();
    } catch (e: any) {
      setErr(e?.message ?? "Delete failed");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "var(--color-surface)", borderRadius: 16, padding: 24,
        width: 380, display: "flex", flexDirection: "column", gap: 16,
        boxShadow: "var(--shadow-4)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.3 }}>Edit window #{win.number}</div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 7, border: "1px solid var(--color-border)",
            background: "var(--color-surface-2)", cursor: "pointer", color: "var(--color-fg-3)",
            display: "grid", placeItems: "center",
          }}>✕</button>
        </div>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-fg-3)" }}>Label / operator name</span>
            <input value={label} onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Aziza T."
              style={{
                padding: "9px 11px", borderRadius: 8,
                border: "1px solid var(--color-border)", background: "var(--color-surface-2)",
                fontSize: 13, color: "var(--color-fg)",
              }} />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-fg-3)" }}>
              Service codes (comma-separated, blank = all)
            </span>
            <input value={serviceCodes} onChange={(e) => setServiceCodes(e.target.value)}
              placeholder="A, B, C"
              style={{
                padding: "9px 11px", borderRadius: 8,
                border: "1px solid var(--color-border)", background: "var(--color-surface-2)",
                fontSize: 13, color: "var(--color-fg)", fontFamily: "var(--font-mono)",
              }} />
            <span style={{ fontSize: 10, color: "var(--color-fg-4)" }}>
              Leave blank to handle all service types
            </span>
          </label>

          {err && <div style={{ fontSize: 12, color: "var(--color-danger)", background: "var(--color-danger-soft)",
            padding: "8px 10px", borderRadius: 7 }}>{err}</div>}

          <button type="submit" disabled={saving} style={{
            padding: "11px 0", borderRadius: 10, border: "none",
            background: saving ? "var(--color-fg-4)" : "var(--color-primary)",
            color: "#fff", fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer",
          }}>
            {saving ? "Saving…" : "Save"}
          </button>
        </form>

        <div style={{ borderTop: "1px solid var(--color-hairline)", paddingTop: 12 }}>
          {confirmDelete ? (
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setConfirmDelete(false)} style={{
                flex: 1, padding: "8px 0", borderRadius: 8,
                border: "1px solid var(--color-border)", background: "transparent",
                color: "var(--color-fg-3)", fontSize: 12, cursor: "pointer",
              }}>Cancel</button>
              <button onClick={deleteWindow} disabled={deleting} style={{
                flex: 1, padding: "8px 0", borderRadius: 8, border: "none",
                background: "var(--color-danger)", color: "#fff",
                fontSize: 12, fontWeight: 600, cursor: deleting ? "not-allowed" : "pointer",
              }}>{deleting ? "Deleting…" : "Confirm delete"}</button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} style={{
              width: "100%", padding: "8px 0", borderRadius: 8,
              border: "1.5px solid var(--color-danger)", background: "transparent",
              color: "var(--color-danger)", fontSize: 12, fontWeight: 500, cursor: "pointer",
            }}>Delete window</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Add Branch Modal ──────────────────────────────────────────────────────────
function AddBranchModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: "", shortName: "", type: "bank", address: "", capacity: "100" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setErr(null);
    try {
      await apiFetch("/api/v1/branches", {
        method: "POST",
        body: JSON.stringify({
          name: form.name, shortName: form.shortName || null,
          type: form.type, address: form.address || null,
          capacity: parseInt(form.capacity) || 100,
        }),
      });
      onCreated();
      onClose();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to create branch");
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
        width: 440, display: "flex", flexDirection: "column", gap: 16,
        boxShadow: "var(--shadow-4)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.3 }}>Add branch</div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 7, border: "1px solid var(--color-border)",
            background: "var(--color-surface-2)", cursor: "pointer", color: "var(--color-fg-3)",
            display: "grid", placeItems: "center",
          }}>✕</button>
        </div>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { label: "Branch name *", key: "name", placeholder: "Asaka Bank · Mirzo Ulugbek", required: true },
            { label: "Short name", key: "shortName", placeholder: "Asaka MU", required: false },
            { label: "Address", key: "address", placeholder: "Mirzo Ulugbek 32, Toshkent", required: false },
            { label: "Capacity", key: "capacity", placeholder: "100", required: false },
          ].map(({ label, key, placeholder, required }) => (
            <label key={key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-fg-3)" }}>{label}</span>
              <input
                value={(form as any)[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                required={required}
                style={{
                  padding: "9px 11px", borderRadius: 8,
                  border: "1px solid var(--color-border)", background: "var(--color-surface-2)",
                  fontSize: 13, color: "var(--color-fg)", outline: "none",
                }}
              />
            </label>
          ))}

          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-fg-3)" }}>Type</span>
            <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              style={{
                padding: "9px 11px", borderRadius: 8,
                border: "1px solid var(--color-border)", background: "var(--color-surface-2)",
                fontSize: 13, color: "var(--color-fg)",
              }}>
              {Object.entries(TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </label>

          {err && <div style={{ fontSize: 12, color: "var(--color-danger)", background: "var(--color-danger-soft)",
            padding: "8px 10px", borderRadius: 7 }}>{err}</div>}

          <button type="submit" disabled={saving} style={{
            padding: "11px 0", borderRadius: 10, border: "none",
            background: saving ? "var(--color-fg-4)" : "var(--color-primary)",
            color: "#fff", fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer",
            marginTop: 4,
          }}>
            {saving ? "Creating…" : "Create branch"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Add Window Modal ──────────────────────────────────────────────────────────
function AddWindowModal({ branchId, existingCount, onClose, onCreated }: {
  branchId: string; existingCount: number; onClose: () => void; onCreated: () => void;
}) {
  const [form, setForm] = useState({ number: String(existingCount + 1), label: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setErr(null);
    try {
      await apiFetch(`/api/v1/branches/${branchId}/windows`, {
        method: "POST",
        body: JSON.stringify({ number: parseInt(form.number), label: form.label || null }),
      });
      onCreated();
      onClose();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to add window");
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
        width: 360, display: "flex", flexDirection: "column", gap: 16,
        boxShadow: "var(--shadow-4)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.3 }}>Add window</div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 7, border: "1px solid var(--color-border)",
            background: "var(--color-surface-2)", cursor: "pointer", color: "var(--color-fg-3)",
            display: "grid", placeItems: "center",
          }}>✕</button>
        </div>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-fg-3)" }}>Window number *</span>
            <input type="number" min={1} value={form.number}
              onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))}
              required style={{
                padding: "9px 11px", borderRadius: 8,
                border: "1px solid var(--color-border)", background: "var(--color-surface-2)",
                fontSize: 13, color: "var(--color-fg)",
              }} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-fg-3)" }}>Label / operator name</span>
            <input value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              placeholder="e.g. Aziza T." style={{
                padding: "9px 11px", borderRadius: 8,
                border: "1px solid var(--color-border)", background: "var(--color-surface-2)",
                fontSize: 13, color: "var(--color-fg)",
              }} />
          </label>

          {err && <div style={{ fontSize: 12, color: "var(--color-danger)", background: "var(--color-danger-soft)",
            padding: "8px 10px", borderRadius: 7 }}>{err}</div>}

          <button type="submit" disabled={saving} style={{
            padding: "11px 0", borderRadius: 10, border: "none",
            background: saving ? "var(--color-fg-4)" : "var(--color-primary)",
            color: "#fff", fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer",
          }}>
            {saving ? "Adding…" : "Add window"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function BranchesPage() {
  const [branches, setBranches] = useState<BranchDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddBranch, setShowAddBranch] = useState(false);
  const [addWindowFor, setAddWindowFor] = useState<BranchDetail | null>(null);
  const [editHoursFor, setEditHoursFor] = useState<BranchDetail | null>(null);
  const [editBranchFor, setEditBranchFor] = useState<BranchDetail | null>(null);
  const [editWindowFor, setEditWindowFor] = useState<BranchDetail["windows"][0] | null>(null);
  const [qrFor, setQrFor] = useState<BranchDetail | null>(null);

  const load = useCallback(async () => {
    try {
      const list = await apiFetch<{ id: string }[]>("/api/v1/admin/branches");
      const details = await Promise.allSettled(
        list.map((b) => apiFetch<BranchDetail>(`/api/v1/branches/${b.id}`))
      );
      setBranches(
        details
          .filter((r) => r.status === "fulfilled")
          .map((r) => (r as PromiseFulfilledResult<BranchDetail>).value)
      );
    } catch {}
    setLoading(false);
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
        <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: -0.3, flex: 1 }}>Branches</span>
        <span style={{ fontSize: 11, color: "var(--color-fg-3)", fontFamily: "var(--font-mono)" }}>
          {branches.length} total
        </span>
        <button onClick={() => setShowAddBranch(true)} style={{
          padding: "6px 14px", borderRadius: 8, border: "none",
          background: "var(--color-primary)", color: "#fff",
          fontSize: 12, fontWeight: 600, cursor: "pointer",
        }}>
          + Add branch
        </button>
      </div>

      <div style={{ flex: 1, padding: 24, overflow: "auto" }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ height: 96, borderRadius: 12, background: "var(--color-surface)",
                border: "1px solid var(--color-border)" }} />
            ))}
          </div>
        ) : (
          <div style={{
            background: "var(--color-surface)", border: "1px solid var(--color-border)",
            borderRadius: 14, overflow: "hidden",
          }}>
            {/* Table header */}
            <div style={{
              display: "grid", gridTemplateColumns: "2fr 1fr 80px 80px 80px 120px 140px",
              padding: "10px 16px",
              borderBottom: "1px solid var(--color-hairline)",
              fontSize: 10, fontFamily: "var(--font-mono)", textTransform: "uppercase",
              letterSpacing: 0.5, color: "var(--color-fg-4)", fontWeight: 600,
            }}>
              <span>Branch</span>
              <span>Address</span>
              <span>Type</span>
              <span>Capacity</span>
              <span>Windows</span>
              <span>Live queue</span>
              <span></span>
            </div>

            {branches.map((b, idx) => {
              const openW = b.windows.filter((w) => w.status === "open").length;
              const load = branchLoadLevel(b.activeTickets, openW);
              return (
                <div key={b.id} style={{
                  display: "grid", gridTemplateColumns: "2fr 1fr 80px 80px 80px 120px 140px",
                  padding: "12px 16px", alignItems: "center",
                  borderBottom: idx < branches.length - 1 ? "1px solid var(--color-hairline)" : "none",
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: -0.1 }}>{b.name}</div>
                    {b.shortName && (
                      <div style={{ fontSize: 11, color: "var(--color-fg-3)", fontFamily: "var(--font-mono)" }}>
                        {b.shortName}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--color-fg-3)" }}>{b.address ?? "—"}</div>
                  <div>
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 999,
                      background: "var(--color-surface-2)", color: "var(--color-fg-2)",
                      fontFamily: "var(--font-mono)", textTransform: "uppercase",
                    }}>
                      {TYPE_LABELS[b.type] ?? b.type}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, fontVariantNumeric: "tabular-nums", color: "var(--color-fg-2)" }}>
                    {b.capacity}
                  </div>
                  <div style={{ fontSize: 13, fontVariantNumeric: "tabular-nums" }}>
                    <span style={{ color: openW > 0 ? "var(--color-success)" : "var(--color-fg-3)" }}>
                      {openW}
                    </span>
                    <span style={{ color: "var(--color-fg-4)" }}> / {b.windows.length}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", flex: "none",
                      background: LOAD_DOT[load] }} />
                    <span style={{ fontSize: 13, fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
                      {b.activeTickets}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--color-fg-3)" }}>in queue</span>
                  </div>
                  <div style={{ display: "flex", gap: 4, justifyContent: "flex-end", flexWrap: "wrap" }}>
                    <button onClick={() => setEditBranchFor(b)} style={{
                      fontSize: 10, padding: "3px 7px", borderRadius: 5,
                      border: "1px solid var(--color-border)", cursor: "pointer",
                      background: "transparent", color: "var(--color-fg-3)",
                    }}>Edit</button>
                    <button onClick={() => setQrFor(b)} style={{
                      fontSize: 10, padding: "3px 7px", borderRadius: 5,
                      border: "1px solid var(--color-border)", cursor: "pointer",
                      background: "transparent", color: "var(--color-fg-3)",
                    }}>QR</button>
                    <button onClick={() => setAddWindowFor(b)} style={{
                      fontSize: 10, padding: "3px 7px", borderRadius: 5,
                      border: "1px solid var(--color-border)", cursor: "pointer",
                      background: "transparent", color: "var(--color-fg-3)",
                    }}>+ Win</button>
                    <button onClick={() => setEditHoursFor(b)} style={{
                      fontSize: 10, padding: "3px 7px", borderRadius: 5,
                      border: "1px solid var(--color-border)", cursor: "pointer",
                      background: "transparent", color: "var(--color-fg-3)",
                    }}>Hours</button>
                    <Link href={`/admin/queue?branchId=${b.id}`} style={{
                      fontSize: 11, padding: "3px 8px", borderRadius: 6,
                      border: "1px solid var(--color-border)",
                      color: "var(--color-fg-2)", textDecoration: "none",
                    }}>Queue →</Link>
                  </div>
                </div>
              );
            })}

            {branches.length === 0 && (
              <div style={{ padding: "40px 16px", textAlign: "center", color: "var(--color-fg-3)", fontSize: 13 }}>
                No branches yet.{" "}
                <button onClick={() => setShowAddBranch(true)} style={{
                  background: "none", border: "none", color: "var(--color-primary)",
                  cursor: "pointer", fontSize: 13, fontWeight: 500,
                }}>Add the first branch →</button>
              </div>
            )}
          </div>
        )}
      </div>

      {showAddBranch && (
        <AddBranchModal onClose={() => setShowAddBranch(false)} onCreated={load} />
      )}
      {addWindowFor && (
        <AddWindowModal
          branchId={addWindowFor.id}
          existingCount={addWindowFor.windows.length}
          onClose={() => setAddWindowFor(null)}
          onCreated={load}
        />
      )}
      {editHoursFor && (
        <OperatingHoursModal
          branch={editHoursFor}
          onClose={() => setEditHoursFor(null)}
        />
      )}
      {editBranchFor && (
        <EditBranchModal
          branch={editBranchFor}
          onClose={() => setEditBranchFor(null)}
          onSaved={load}
        />
      )}
      {qrFor && (
        <BranchQrModal branch={qrFor} onClose={() => setQrFor(null)} />
      )}
      {editWindowFor && (
        <EditWindowModal
          win={editWindowFor}
          onClose={() => setEditWindowFor(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
