"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { BranchDetail } from "@/lib/types";

interface StaffUser {
  id: string;
  fullName: string | null;
  phone: string | null;
  roles: string[];
}

function AddStaffModal({ branches, onClose, onSaved }: {
  branches: BranchDetail[]; onClose: () => void; onSaved: () => void;
}) {
  const [selectedBranchId, setSelectedBranchId] = useState(branches[0]?.id ?? "");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"operator" | "manager">("operator");
  const [foundUser, setFoundUser] = useState<{ id: string; fullName: string | null; phone: string | null } | null>(null);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function lookup() {
    if (!phone.trim()) return;
    setSearching(true); setErr(null); setFoundUser(null);
    try {
      const user = await apiFetch<{ id: string; fullName: string | null; phone: string | null }>(
        `/api/v1/admin/users/lookup?phone=${encodeURIComponent(phone.trim())}`
      );
      setFoundUser(user);
    } catch (e: any) {
      setErr(e?.code === "user.not_found" ? "No account found with that phone number." : (e?.message ?? "Lookup failed"));
    } finally {
      setSearching(false);
    }
  }

  async function save() {
    if (!foundUser) return;
    setSaving(true); setErr(null);
    try {
      await apiFetch(`/api/v1/admin/users/${foundUser.id}/roles/add?role=${role}`, { method: "POST" });
      setDone(true);
      onSaved();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to assign role");
      setSaving(false);
    }
  }

  const selectedBranch = branches.find((b) => b.id === selectedBranchId);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "var(--color-surface)", borderRadius: 16, padding: 24,
        width: 420, display: "flex", flexDirection: "column", gap: 16,
        boxShadow: "var(--shadow-4)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.3 }}>Add staff member</div>
            <div style={{ fontSize: 12, color: "var(--color-fg-3)", marginTop: 2 }}>
              Find by phone and assign a role
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 7, border: "1px solid var(--color-border)",
            background: "var(--color-surface-2)", cursor: "pointer", color: "var(--color-fg-3)",
            display: "grid", placeItems: "center",
          }}>✕</button>
        </div>

        {done ? (
          <div style={{ textAlign: "center", padding: "16px 0", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14, margin: "0 auto",
              background: "var(--color-success-soft)", color: "var(--color-success)",
              display: "grid", placeItems: "center", fontSize: 22,
            }}>✓</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              {foundUser?.fullName ?? foundUser?.phone} added as {role}
            </div>
            <div style={{ fontSize: 12, color: "var(--color-fg-3)" }}>
              Assign them to a window from the{" "}
              <strong>{selectedBranch?.name}</strong> Windows page.
            </div>
            <button onClick={onClose} style={{
              padding: "10px 0", borderRadius: 10, border: "none",
              background: "var(--color-primary)", color: "#fff",
              fontSize: 14, fontWeight: 600, cursor: "pointer", marginTop: 4,
            }}>Done</button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-fg-3)", textTransform: "uppercase", letterSpacing: 0.4 }}>Branch</span>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                style={{
                  padding: "9px 12px", borderRadius: 8,
                  border: "1px solid var(--color-border)", background: "var(--color-surface-2)",
                  fontSize: 13, color: "var(--color-fg)", cursor: "pointer",
                }}
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-fg-3)", textTransform: "uppercase", letterSpacing: 0.4 }}>Phone number</span>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setFoundUser(null); setErr(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter") lookup(); }}
                  placeholder="+998 90 123 4567"
                  style={{
                    flex: 1, padding: "9px 12px", borderRadius: 8,
                    border: "1px solid var(--color-border)", background: "var(--color-surface-2)",
                    fontSize: 13, color: "var(--color-fg)", outline: "none",
                  }}
                />
                <button onClick={lookup} disabled={!phone.trim() || searching} style={{
                  padding: "9px 14px", borderRadius: 8, border: "none",
                  background: phone.trim() ? "var(--color-primary)" : "var(--color-surface-3)",
                  color: "#fff", fontSize: 13, fontWeight: 600,
                  cursor: phone.trim() && !searching ? "pointer" : "not-allowed",
                  flex: "none",
                }}>
                  {searching ? "…" : "Find"}
                </button>
              </div>
            </div>

            {foundUser && (
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", borderRadius: 10,
                border: "1.5px solid var(--color-success)",
                background: "var(--color-success-soft)",
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, flex: "none",
                  background: "var(--color-success)", color: "#fff",
                  display: "grid", placeItems: "center", fontSize: 14, fontWeight: 700,
                }}>
                  {(foundUser.fullName ?? foundUser.phone ?? "?").charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-fg)" }}>
                    {foundUser.fullName ?? "No name set"}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-fg-3)", fontFamily: "var(--font-mono)" }}>
                    {foundUser.phone}
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-success)" }}>Found ✓</span>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-fg-3)", textTransform: "uppercase", letterSpacing: 0.4 }}>Role</span>
              <div style={{ display: "flex", gap: 8 }}>
                {(["operator", "manager"] as const).map((r) => (
                  <button key={r} onClick={() => setRole(r)} style={{
                    flex: 1, padding: "9px 0", borderRadius: 8,
                    border: `1.5px solid ${role === r ? "var(--color-primary)" : "var(--color-border)"}`,
                    background: role === r ? "var(--color-primary-soft)" : "var(--color-surface-2)",
                    color: role === r ? "var(--color-primary)" : "var(--color-fg-2)",
                    fontSize: 13, fontWeight: role === r ? 600 : 400, cursor: "pointer",
                    textTransform: "capitalize",
                  }}>
                    {r}
                  </button>
                ))}
              </div>
              <span style={{ fontSize: 10.5, color: "var(--color-fg-4)" }}>
                {role === "operator"
                  ? "Can serve tickets at their assigned window"
                  : "Can manage branches, windows, and services"}
              </span>
            </div>

            {err && (
              <div style={{ fontSize: 12, color: "var(--color-danger)", background: "var(--color-danger-soft)",
                padding: "8px 10px", borderRadius: 7 }}>{err}</div>
            )}

            <button
              onClick={save}
              disabled={!foundUser || saving}
              style={{
                padding: "11px 0", borderRadius: 10, border: "none",
                background: foundUser && !saving ? "var(--color-primary)" : "var(--color-fg-4)",
                color: "#fff", fontSize: 14, fontWeight: 600,
                cursor: foundUser && !saving ? "pointer" : "not-allowed",
              }}
            >
              {saving ? "Adding…" : `Add as ${role}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const ROLE_COLOR: Record<string, string> = {
  operator: "var(--color-primary)",
  manager: "var(--color-warning)",
  org_admin: "var(--color-danger)",
  super_admin: "var(--color-danger)",
};

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [branches, setBranches] = useState<BranchDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddStaff, setShowAddStaff] = useState(false);

  const load = useCallback(async () => {
    try {
      const [users, branchList] = await Promise.all([
        apiFetch<StaffUser[]>("/api/v1/admin/users"),
        apiFetch<{ id: string }[]>("/api/v1/admin/branches"),
      ]);
      setStaff(users);
      const details = await Promise.allSettled(
        branchList.map((b) => apiFetch<BranchDetail>(`/api/v1/branches/${b.id}`))
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

  const filtered = staff.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (u.fullName ?? "").toLowerCase().includes(q) || (u.phone ?? "").includes(q);
  });

  const displayRoles = (roles: string[]) =>
    roles
      .filter((r) => ["operator", "manager", "org_admin", "super_admin"].includes(r))
      .map((r) => r.replace("_", " "));

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{
        height: 56, padding: "0 24px",
        display: "flex", alignItems: "center", gap: 12,
        borderBottom: "1px solid var(--color-hairline)",
        background: "var(--color-surface)",
      }}>
        <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: -0.3, flex: 1 }}>Staff</span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          style={{
            padding: "6px 12px", borderRadius: 8, width: 200,
            border: "1px solid var(--color-border)", background: "var(--color-surface-2)",
            fontSize: 13, color: "var(--color-fg)", outline: "none",
          }}
        />
        <button onClick={() => setShowAddStaff(true)} style={{
          padding: "6px 14px", borderRadius: 8, border: "none",
          background: "var(--color-primary)", color: "#fff",
          fontSize: 12, fontWeight: 600, cursor: "pointer",
        }}>
          + Add staff
        </button>
      </div>

      <div style={{ flex: 1, overflow: "auto" }}>
        {loading ? (
          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 8 }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{
                height: 52, borderRadius: 10,
                background: "var(--color-surface)", border: "1px solid var(--color-border)",
              }} />
            ))}
          </div>
        ) : (
          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 0 }}>
            <div style={{
              background: "var(--color-surface)", border: "1px solid var(--color-border)",
              borderRadius: 14, overflow: "hidden",
            }}>
              {/* Column header */}
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 160px 200px",
                padding: "8px 18px",
                fontSize: 10, fontFamily: "var(--font-mono)", textTransform: "uppercase",
                letterSpacing: 0.5, color: "var(--color-fg-4)", fontWeight: 600,
                borderBottom: "1px solid var(--color-hairline)",
              }}>
                <span>Name</span>
                <span>Phone</span>
                <span>Roles</span>
              </div>

              {filtered.length === 0 && (
                <div style={{ padding: "32px 18px", color: "var(--color-fg-3)", fontSize: 13, textAlign: "center" }}>
                  {search ? "No staff match your search." : "No staff members yet."}
                </div>
              )}

              {filtered.map((u, idx) => {
                const roles = displayRoles(u.roles);
                const initials = (u.fullName ?? u.phone ?? "?").charAt(0).toUpperCase();
                return (
                  <div key={u.id} style={{
                    display: "grid", gridTemplateColumns: "1fr 160px 200px",
                    padding: "12px 18px", alignItems: "center",
                    borderBottom: idx < filtered.length - 1 ? "1px solid var(--color-hairline)" : "none",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: 8, flex: "none",
                        background: "var(--color-primary-soft)", color: "var(--color-primary)",
                        display: "grid", placeItems: "center",
                        fontSize: 13, fontWeight: 700,
                      }}>
                        {initials}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-fg)" }}>
                          {u.fullName ?? <span style={{ color: "var(--color-fg-4)" }}>No name</span>}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--color-fg-4)", fontFamily: "var(--font-mono)" }}>
                          {u.id.slice(0, 12)}…
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--color-fg-2)", fontFamily: "var(--font-mono)" }}>
                      {u.phone ?? "—"}
                    </div>
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                      {roles.length === 0 && (
                        <span style={{ fontSize: 11, color: "var(--color-fg-4)" }}>customer</span>
                      )}
                      {roles.map((r) => (
                        <span key={r} style={{
                          fontSize: 11, fontWeight: 600,
                          padding: "2px 7px", borderRadius: 5,
                          background: `color-mix(in srgb, ${ROLE_COLOR[r.replace(" ", "_")]} 12%, transparent)`,
                          color: ROLE_COLOR[r.replace(" ", "_")] ?? "var(--color-fg-3)",
                          border: `1px solid color-mix(in srgb, ${ROLE_COLOR[r.replace(" ", "_")]} 25%, transparent)`,
                        }}>
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {showAddStaff && branches.length > 0 && (
        <AddStaffModal
          branches={branches}
          onClose={() => setShowAddStaff(false)}
          onSaved={load}
        />
      )}
    </div>
  );
}
