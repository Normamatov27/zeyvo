"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";

interface AdminUser {
  id: string;
  fullName: string | null;
  phone: string | null;
  telegramId: number | null;
  createdAt: string | null;
  roles: string[];
}

const ALL_ROLES = ["customer", "operator", "manager", "org_admin"];

const ROLE_COLOR: Record<string, string> = {
  customer: "var(--color-fg-3)",
  operator: "var(--color-primary)",
  manager: "var(--color-accent)",
  org_admin: "var(--color-warning)",
};
const ROLE_BG: Record<string, string> = {
  customer: "var(--color-surface-3)",
  operator: "var(--color-primary-soft)",
  manager: "var(--color-accent-soft)",
  org_admin: "var(--color-warning-soft)",
};

function RoleBadge({ role }: { role: string }) {
  return (
    <span style={{
      fontSize: 10.5, fontWeight: 600, padding: "2px 7px", borderRadius: 999,
      background: ROLE_BG[role] ?? "var(--color-surface-3)",
      color: ROLE_COLOR[role] ?? "var(--color-fg-3)",
      fontFamily: "var(--font-mono)",
    }}>
      {role}
    </span>
  );
}

function ManageRolesModal({ user, onClose, onSaved }: {
  user: AdminUser; onClose: () => void; onSaved: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(user.roles));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function toggle(role: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(role)) next.delete(role);
      else next.add(role);
      return next;
    });
  }

  async function save() {
    setSaving(true); setErr(null);
    try {
      await apiFetch(`/api/v1/admin/users/${user.id}/roles`, {
        method: "POST",
        body: JSON.stringify([...selected]),
      });
      onSaved();
      onClose();
    } catch (e: any) {
      setErr(e?.message ?? "Save failed");
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
        width: 360, display: "flex", flexDirection: "column", gap: 18,
        boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.3 }}>Manage roles</div>
            <div style={{ fontSize: 12, color: "var(--color-fg-3)", marginTop: 2 }}>
              {user.fullName ?? user.phone ?? user.id.slice(0, 8)}
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 7, border: "1px solid var(--color-border)",
            background: "var(--color-surface-2)", cursor: "pointer", color: "var(--color-fg-3)",
            display: "grid", placeItems: "center",
          }}>✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {ALL_ROLES.map((role) => {
            const on = selected.has(role);
            return (
              <button key={role} onClick={() => toggle(role)} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 12px", borderRadius: 10,
                border: `1.5px solid ${on ? (ROLE_COLOR[role] ?? "var(--color-primary)") : "var(--color-border)"}`,
                background: on ? (ROLE_BG[role] ?? "var(--color-primary-soft)") : "transparent",
                cursor: "pointer", textAlign: "left",
              }}>
                <div style={{
                  width: 18, height: 18, borderRadius: 5,
                  border: `2px solid ${on ? (ROLE_COLOR[role] ?? "var(--color-primary)") : "var(--color-border)"}`,
                  background: on ? (ROLE_COLOR[role] ?? "var(--color-primary)") : "transparent",
                  display: "grid", placeItems: "center", flex: "none",
                  transition: "all 0.15s",
                }}>
                  {on && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                      stroke="#fff" strokeWidth="3" strokeLinecap="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-fg)" }}>{role}</div>
                  <div style={{ fontSize: 11, color: "var(--color-fg-3)", marginTop: 1 }}>
                    {role === "customer" && "Default — can join queues"}
                    {role === "operator" && "Can call tickets, serve customers"}
                    {role === "manager" && "Full branch management"}
                    {role === "org_admin" && "Full organization access"}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {err && (
          <div style={{ fontSize: 12, color: "var(--color-danger)", background: "var(--color-danger-soft)",
            padding: "8px 10px", borderRadius: 7 }}>{err}</div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: "10px 0", borderRadius: 10,
            border: "1.5px solid var(--color-border)", background: "transparent",
            color: "var(--color-fg-3)", fontSize: 13, cursor: "pointer",
          }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{
            flex: 2, padding: "10px 0", borderRadius: 10, border: "none",
            background: saving ? "var(--color-fg-4)" : "var(--color-primary)",
            color: "#fff", fontSize: 13, fontWeight: 600,
            cursor: saving ? "not-allowed" : "pointer",
          }}>
            {saving ? "Saving…" : "Save roles"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editUser, setEditUser] = useState<AdminUser | null>(null);

  const load = useCallback((phone?: string) => {
    setLoading(true);
    const url = phone ? `/api/v1/admin/users?phone=${encodeURIComponent(phone)}` : "/api/v1/admin/users";
    apiFetch<AdminUser[]>(url)
      .then(setUsers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    load(search.trim() || undefined);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{
        height: 56, padding: "0 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid var(--color-hairline)",
        background: "var(--color-surface)",
      }}>
        <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: -0.3 }}>Users</span>
        <span style={{ fontSize: 12, color: "var(--color-fg-3)", fontFamily: "var(--font-mono)" }}>
          {loading ? "…" : `${users.length} shown`}
        </span>
      </div>

      <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16, flex: 1, overflow: "auto" }}>
        {/* Search */}
        <form onSubmit={handleSearch} style={{ display: "flex", gap: 8 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by phone (+998…)"
            style={{
              flex: 1, padding: "9px 14px", borderRadius: 10,
              border: "1px solid var(--color-border)", background: "var(--color-surface-2)",
              color: "var(--color-fg)", fontSize: 13, fontFamily: "var(--font-mono)",
              outline: "none",
            }}
          />
          <button type="submit" style={{
            padding: "9px 18px", borderRadius: 10, border: "none",
            background: "var(--color-primary)", color: "#fff",
            fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>
            Search
          </button>
          {search && (
            <button type="button" onClick={() => { setSearch(""); load(); }} style={{
              padding: "9px 14px", borderRadius: 10,
              border: "1px solid var(--color-border)", background: "transparent",
              color: "var(--color-fg-3)", fontSize: 13, cursor: "pointer",
            }}>
              Clear
            </button>
          )}
        </form>

        {/* Table */}
        <div style={{
          background: "var(--color-surface)", border: "1px solid var(--color-border)",
          borderRadius: 14, overflow: "hidden",
          flexShrink: 0,
        }}>
          {/* Header */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 140px 160px 120px 80px",
            padding: "10px 16px",
            borderBottom: "1px solid var(--color-hairline)",
            fontSize: 11, fontWeight: 600, color: "var(--color-fg-3)",
            textTransform: "uppercase", letterSpacing: 0.5,
            fontFamily: "var(--font-mono)",
          }}>
            <span>Name / ID</span>
            <span>Phone</span>
            <span>Roles</span>
            <span>Telegram</span>
            <span/>
          </div>

          {loading && (
            <div style={{ padding: "24px 16px", textAlign: "center",
              color: "var(--color-fg-3)", fontSize: 13 }}>Loading…</div>
          )}

          {!loading && users.length === 0 && (
            <div style={{ padding: "24px 16px", textAlign: "center",
              color: "var(--color-fg-3)", fontSize: 13 }}>No users found</div>
          )}

          {!loading && users.map((u, i) => (
            <div key={u.id} style={{
              display: "grid",
              gridTemplateColumns: "1fr 140px 160px 120px 80px",
              padding: "12px 16px",
              alignItems: "center",
              borderBottom: i < users.length - 1 ? "1px solid var(--color-hairline)" : "none",
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-fg)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {u.fullName ?? "—"}
                </div>
                <div style={{ fontSize: 10.5, color: "var(--color-fg-4)",
                  fontFamily: "var(--font-mono)", marginTop: 1 }}>
                  {u.id.slice(0, 12)}…
                </div>
              </div>

              <div style={{ fontSize: 12.5, color: "var(--color-fg-2)",
                fontFamily: "var(--font-mono)", overflow: "hidden", textOverflow: "ellipsis" }}>
                {u.phone ?? "—"}
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {u.roles.length === 0 ? (
                  <span style={{ fontSize: 11, color: "var(--color-fg-4)" }}>no role</span>
                ) : (
                  u.roles.map((r) => <RoleBadge key={r} role={r}/>)
                )}
              </div>

              <div style={{ fontSize: 11.5, color: u.telegramId ? "var(--color-success)" : "var(--color-fg-4)" }}>
                {u.telegramId ? "Linked" : "—"}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button onClick={() => setEditUser(u)} style={{
                  padding: "5px 12px", borderRadius: 7,
                  border: "1px solid var(--color-border)", background: "transparent",
                  color: "var(--color-fg-2)", fontSize: 12, fontWeight: 500,
                  cursor: "pointer",
                }}>
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editUser && (
        <ManageRolesModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSaved={() => { setEditUser(null); load(search.trim() || undefined); }}
        />
      )}
    </div>
  );
}
