"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { BranchDetail, WindowDesk } from "@/lib/types";

interface StaffUser {
  id: string;
  fullName: string | null;
  phone: string | null;
  roles: string[];
}

const STATUS_COLOR: Record<string, string> = {
  open: "var(--color-success)",
  idle: "var(--color-warning)",
  closed: "var(--color-fg-4)",
  paused: "var(--color-warning)",
};

const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  idle: "Idle",
  closed: "Closed",
  paused: "Paused",
};

function AssignOperatorModal({ win, onClose, onSaved }: {
  win: WindowDesk; onClose: () => void; onSaved: () => void;
}) {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<StaffUser[]>("/api/v1/admin/users")
      .then((all) => setUsers(all.filter((u) => u.roles.includes("operator"))))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function assign(userId: string) {
    setAssigning(true); setErr(null);
    try {
      await apiFetch(`/api/v1/windows/${win.id}/assign?userId=${userId}`, { method: "POST" });
      onSaved(); onClose();
    } catch (e: any) {
      setErr(e?.message ?? "Assign failed"); setAssigning(false);
    }
  }

  async function unassign() {
    setAssigning(true); setErr(null);
    try {
      await apiFetch(`/api/v1/windows/${win.id}/assign`, { method: "DELETE" });
      onSaved(); onClose();
    } catch (e: any) {
      setErr(e?.message ?? "Unassign failed"); setAssigning(false);
    }
  }

  const filtered = users.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (u.fullName ?? "").toLowerCase().includes(q) || (u.phone ?? "").includes(q);
  });

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "var(--color-surface)", borderRadius: 16, padding: 24,
        width: 400, maxHeight: "80vh", display: "flex", flexDirection: "column", gap: 14,
        boxShadow: "var(--shadow-4)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.3 }}>Assign operator</div>
            <div style={{ fontSize: 12, color: "var(--color-fg-3)", marginTop: 2 }}>Window #{win.number}</div>
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 7, border: "1px solid var(--color-border)",
            background: "var(--color-surface-2)", cursor: "pointer", color: "var(--color-fg-3)",
            display: "grid", placeItems: "center",
          }}>✕</button>
        </div>

        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or phone…"
          style={{
            padding: "9px 12px", borderRadius: 8,
            border: "1px solid var(--color-border)", background: "var(--color-surface-2)",
            fontSize: 13, color: "var(--color-fg)", outline: "none",
          }} />

        {err && (
          <div style={{ fontSize: 12, color: "var(--color-danger)", background: "var(--color-danger-soft)",
            padding: "8px 10px", borderRadius: 7 }}>{err}</div>
        )}

        <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
          {loading && <div style={{ fontSize: 13, color: "var(--color-fg-3)", textAlign: "center", padding: 20 }}>Loading operators…</div>}
          {!loading && filtered.length === 0 && <div style={{ fontSize: 13, color: "var(--color-fg-3)", textAlign: "center", padding: 20 }}>No operators found</div>}
          {filtered.map((u) => {
            const isAssigned = win.operatorId === u.id;
            return (
              <div key={u.id} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", borderRadius: 10,
                border: `1.5px solid ${isAssigned ? "var(--color-primary)" : "var(--color-border)"}`,
                background: isAssigned ? "var(--color-primary-soft)" : "var(--color-surface-2)",
              }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 8, flex: "none",
                  background: "var(--color-primary-soft)", color: "var(--color-primary)",
                  display: "grid", placeItems: "center", fontSize: 13, fontWeight: 700,
                }}>
                  {(u.fullName ?? u.phone ?? "?").charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {u.fullName ?? u.phone ?? u.id.slice(0, 8)}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-fg-4)", fontFamily: "var(--font-mono)" }}>
                    {u.phone ?? u.id.slice(0, 12)}
                  </div>
                </div>
                <button onClick={() => isAssigned ? unassign() : assign(u.id)} disabled={assigning} style={{
                  padding: "5px 12px", borderRadius: 7, border: "none",
                  background: isAssigned ? "var(--color-danger)" : "var(--color-primary)",
                  color: "#fff", fontSize: 11, fontWeight: 600, cursor: assigning ? "not-allowed" : "pointer",
                  flex: "none",
                }}>
                  {isAssigned ? "Remove" : "Assign"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function EditWindowModal({ win, onClose, onSaved }: {
  win: WindowDesk; onClose: () => void; onSaved: () => void;
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
      onSaved(); onClose();
    } catch (e: any) {
      setErr(e?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function deleteWindow() {
    setDeleting(true); setErr(null);
    try {
      await apiFetch(`/api/v1/windows/${win.id}`, { method: "DELETE" });
      onSaved(); onClose();
    } catch (e: any) {
      setErr(e?.message ?? "Delete failed");
      setDeleting(false); setConfirmDelete(false);
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
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.3 }}>Edit Window #{win.number}</div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 7, border: "1px solid var(--color-border)",
            background: "var(--color-surface-2)", cursor: "pointer", color: "var(--color-fg-3)",
            display: "grid", placeItems: "center",
          }}>✕</button>
        </div>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-fg-3)" }}>Label</span>
            <input value={label} onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Aziza T." autoFocus
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
          </label>
          {err && (
            <div style={{ fontSize: 12, color: "var(--color-danger)", background: "var(--color-danger-soft)",
              padding: "8px 10px", borderRadius: 7 }}>{err}</div>
          )}
          <button type="submit" disabled={saving} style={{
            padding: "10px 0", borderRadius: 10, border: "none",
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
                color: "var(--color-fg-3)", fontSize: 13, cursor: "pointer",
              }}>Cancel</button>
              <button onClick={deleteWindow} disabled={deleting} style={{
                flex: 1, padding: "8px 0", borderRadius: 8, border: "none",
                background: "var(--color-danger)", color: "#fff",
                fontSize: 13, fontWeight: 600, cursor: deleting ? "not-allowed" : "pointer",
              }}>{deleting ? "Deleting…" : "Confirm delete"}</button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} style={{
              width: "100%", padding: "8px 0", borderRadius: 8,
              border: "1.5px solid var(--color-danger)", background: "transparent",
              color: "var(--color-danger)", fontSize: 13, fontWeight: 500, cursor: "pointer",
            }}>Delete window</button>
          )}
        </div>
      </div>
    </div>
  );
}

function WindowRow({
  window: w,
  onStatusChange,
  onEdit,
  onAssign,
}: {
  window: WindowDesk;
  onStatusChange: (windowId: string, status: string) => Promise<void>;
  onEdit: (win: WindowDesk) => void;
  onAssign: (win: WindowDesk) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function toggle(newStatus: string) {
    setBusy(true);
    try { await onStatusChange(w.id, newStatus); }
    finally { setBusy(false); }
  }

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "52px 1fr 130px 110px minmax(80px,1fr) 230px",
      padding: "10px 18px", alignItems: "center",
      borderBottom: "1px solid var(--color-hairline)",
      opacity: busy ? 0.6 : 1, transition: "opacity 0.15s",
    }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "var(--color-fg-2)" }}>
        W{w.number}
      </div>
      <div style={{ fontSize: 13, color: "var(--color-fg)", fontWeight: 500 }}>
        {w.label ?? `Window ${w.number}`}
      </div>
      <div style={{ fontSize: 12, color: "var(--color-fg-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {w.operatorId
          ? <span style={{ color: "var(--color-success)", fontFamily: "var(--font-mono)", fontSize: 11 }}>assigned</span>
          : <span style={{ color: "var(--color-fg-4)", fontSize: 11 }}>—</span>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", flex: "none", background: STATUS_COLOR[w.status] }} />
        <span style={{ fontSize: 12, color: STATUS_COLOR[w.status], fontWeight: 500 }}>
          {STATUS_LABEL[w.status]}
        </span>
      </div>
      <div style={{ fontSize: 11, color: "var(--color-fg-3)", fontFamily: "var(--font-mono)" }}>
        {w.serviceCodes.length > 0 ? w.serviceCodes.join(", ") : "All"}
      </div>
      <div style={{ display: "flex", gap: 5, justifyContent: "flex-end" }}>
        <button onClick={() => onAssign(w)} style={{
          padding: "5px 10px", borderRadius: 7, fontSize: 11, fontWeight: 600,
          border: "1.5px solid var(--color-primary)", color: "var(--color-primary)",
          background: "var(--color-primary-soft)", cursor: "pointer",
        }}>Assign</button>
        <button onClick={() => onEdit(w)} style={{
          padding: "5px 10px", borderRadius: 7, fontSize: 11, fontWeight: 600,
          border: "1.5px solid var(--color-border)", color: "var(--color-fg-2)",
          background: "transparent", cursor: "pointer",
        }}>Edit</button>
        {w.status !== "open" && (
          <button onClick={() => toggle("open")} disabled={busy} style={{
            padding: "5px 10px", borderRadius: 7, fontSize: 11, fontWeight: 600,
            border: "1.5px solid var(--color-success)", color: "var(--color-success)",
            background: "var(--color-success-soft)", cursor: "pointer",
          }}>Open</button>
        )}
        {w.status === "open" && (
          <button onClick={() => toggle("paused")} disabled={busy} style={{
            padding: "5px 10px", borderRadius: 7, fontSize: 11, fontWeight: 600,
            border: "1.5px solid var(--color-warning)", color: "var(--color-warning)",
            background: "var(--color-warning-soft)", cursor: "pointer",
          }}>Pause</button>
        )}
        {w.status !== "closed" && (
          <button onClick={() => toggle("closed")} disabled={busy} style={{
            padding: "5px 10px", borderRadius: 7, fontSize: 11, fontWeight: 600,
            border: "1.5px solid var(--color-border)", color: "var(--color-fg-3)",
            background: "var(--color-surface-2)", cursor: "pointer",
          }}>Close</button>
        )}
      </div>
    </div>
  );
}

export default function WindowsPage() {
  const [branches, setBranches] = useState<BranchDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [editWindow, setEditWindow] = useState<WindowDesk | null>(null);
  const [assignWindow, setAssignWindow] = useState<WindowDesk | null>(null);

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

  useEffect(() => {
    load();
    const iv = setInterval(load, 15_000);
    return () => clearInterval(iv);
  }, [load]);

  async function handleStatusChange(windowId: string, status: string) {
    await apiFetch(`/api/v1/windows/${windowId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    await load();
  }

  const totalOpen = branches.reduce((s, b) => s + b.windows.filter((w) => w.status === "open").length, 0);
  const totalWindows = branches.reduce((s, b) => s + b.windows.length, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{
        height: 56, padding: "0 24px",
        display: "flex", alignItems: "center", gap: 12,
        borderBottom: "1px solid var(--color-hairline)",
        background: "var(--color-surface)",
      }}>
        <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: -0.3, flex: 1 }}>Windows</span>
        <span style={{ fontSize: 11, color: "var(--color-fg-3)", fontFamily: "var(--font-mono)" }}>
          {totalOpen} open · {totalWindows} total · live
        </span>
      </div>

      <div style={{ flex: 1, padding: 24, overflow: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
        {loading
          ? [1, 2].map((i) => (
              <div key={i} style={{
                height: 160, borderRadius: 12,
                background: "var(--color-surface)", border: "1px solid var(--color-border)",
              }} />
            ))
          : branches.map((b) => {
              const openW = b.windows.filter((w) => w.status === "open").length;
              const sorted = [...b.windows].sort((a, wb) => a.number - wb.number);
              return (
                <div key={b.id} style={{
                  background: "var(--color-surface)", border: "1px solid var(--color-border)",
                  borderRadius: 14, overflow: "hidden", flexShrink: 0,
                }}>
                  <div style={{
                    padding: "12px 18px",
                    borderBottom: "1px solid var(--color-hairline)",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                  }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: -0.2 }}>{b.name}</div>
                      <div style={{ fontSize: 11, color: "var(--color-fg-3)", marginTop: 2 }}>
                        {openW} of {b.windows.length} windows open
                        {b.activeTickets > 0 && ` · ${b.activeTickets} active tickets`}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 3 }}>
                      {sorted.slice(0, 12).map((w) => (
                        <div key={w.id} style={{
                          width: 22, height: 22, borderRadius: 4,
                          background: w.status === "open"
                            ? (w.servingTicket ? "var(--color-success)" : "var(--color-success-soft)")
                            : w.status === "paused" ? "var(--color-warning-soft)"
                            : "var(--color-surface-3)",
                          display: "grid", placeItems: "center",
                          fontSize: 8, fontFamily: "var(--font-mono)", fontWeight: 700,
                          color: w.status === "open" && w.servingTicket ? "#fff"
                            : w.status === "open" ? "var(--color-success)"
                            : w.status === "paused" ? "var(--color-warning)"
                            : "var(--color-fg-4)",
                          border: "1.5px solid " + (
                            w.status === "open" ? "var(--color-success)"
                            : w.status === "paused" ? "var(--color-warning)"
                            : "var(--color-border)"
                          ),
                        }}>
                          {w.number}
                        </div>
                      ))}
                    </div>
                  </div>

                  {sorted.length > 0 && (
                    <div style={{
                      display: "grid", gridTemplateColumns: "52px 1fr 130px 110px minmax(80px,1fr) 230px",
                      padding: "7px 18px",
                      fontSize: 10, fontFamily: "var(--font-mono)", textTransform: "uppercase",
                      letterSpacing: 0.5, color: "var(--color-fg-4)", fontWeight: 600,
                      borderBottom: "1px solid var(--color-hairline)",
                    }}>
                      <span>#</span><span>Label</span><span>Operator</span>
                      <span>Status</span><span>Services</span>
                      <span style={{ textAlign: "right" }}>Actions</span>
                    </div>
                  )}

                  {sorted.map((w) => (
                    <WindowRow
                      key={w.id}
                      window={w}
                      onStatusChange={handleStatusChange}
                      onEdit={setEditWindow}
                      onAssign={setAssignWindow}
                    />
                  ))}

                  {b.windows.length === 0 && (
                    <div style={{ padding: "24px 18px", color: "var(--color-fg-3)", fontSize: 13 }}>
                      No windows configured for this branch.
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

      {editWindow && (
        <EditWindowModal win={editWindow} onClose={() => setEditWindow(null)} onSaved={load} />
      )}
      {assignWindow && (
        <AssignOperatorModal win={assignWindow} onClose={() => setAssignWindow(null)} onSaved={load} />
      )}
    </div>
  );
}
