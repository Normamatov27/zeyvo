"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Provider, Branch, ProviderScheduleSlot } from "@/lib/types";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function ProviderInitial({ name }: { name: string }) {
  return (
    <div style={{
      width: 38, height: 38, borderRadius: 10, flex: "none",
      background: "var(--color-primary-soft)", color: "var(--color-primary)",
      display: "grid", placeItems: "center",
      fontSize: 16, fontWeight: 700,
    }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

type ScheduleForm = Record<number, { enabled: boolean; startTime: string; endTime: string; slotDurationMin: number }>;

function defaultScheduleForm(): ScheduleForm {
  const form: ScheduleForm = {};
  for (let d = 1; d <= 7; d++) {
    form[d] = { enabled: d <= 5, startTime: "09:00", endTime: "18:00", slotDurationMin: 15 };
  }
  return form;
}

function scheduleFromSlots(slots: ProviderScheduleSlot[], branchId: string): ScheduleForm {
  const form = defaultScheduleForm();
  for (let d = 1; d <= 7; d++) form[d]!.enabled = false;
  for (const s of slots) {
    if (s.branchId !== branchId) continue;
    form[s.dayOfWeek] = {
      enabled: true,
      startTime: s.startTime.slice(0, 5),
      endTime: s.endTime.slice(0, 5),
      slotDurationMin: s.slotDurationMin,
    };
  }
  return form;
}

export default function ProvidersPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(false);

  // Add form state
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState("");
  const [addSpecialty, setAddSpecialty] = useState("");
  const [addBranches, setAddBranches] = useState<string[]>([]);
  const [addSaving, setAddSaving] = useState(false);

  // Schedule editor
  const [schedProvider, setSchedProvider] = useState<Provider | null>(null);
  const [schedBranch, setSchedBranch] = useState<string | null>(null);
  const [schedForm, setSchedForm] = useState<ScheduleForm>(defaultScheduleForm());
  const [schedSaving, setSchedSaving] = useState(false);

  useEffect(() => {
    apiFetch<Branch[]>("/api/v1/admin/branches")
      .then((bs) => {
        setBranches(bs);
        if (bs.length > 0) setSelectedBranch(bs[0]!.id);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedBranch) return;
    setLoading(true);
    apiFetch<Provider[]>(`/api/v1/providers?branchId=${selectedBranch}`)
      .then(setProviders)
      .catch(() => setProviders([]))
      .finally(() => setLoading(false));
  }, [selectedBranch]);

  async function handleAdd() {
    if (!addName.trim()) return;
    setAddSaving(true);
    try {
      const p = await apiFetch<Provider>("/api/v1/providers", {
        method: "POST",
        body: JSON.stringify({ fullName: addName.trim(), specialty: addSpecialty.trim() || null, branchIds: addBranches }),
      });
      setProviders((prev) => [...prev, p]);
      setShowAdd(false);
      setAddName(""); setAddSpecialty(""); setAddBranches([]);
    } catch (e: any) {
      alert(e?.message ?? "Failed to create provider");
    } finally {
      setAddSaving(false);
    }
  }

  async function toggleActive(p: Provider) {
    try {
      if (p.active) {
        await apiFetch(`/api/v1/providers/${p.id}`, { method: "DELETE" });
        setProviders((prev) => prev.filter((x) => x.id !== p.id));
      }
    } catch (e: any) {
      alert(e?.message ?? "Failed");
    }
  }

  function openSchedule(p: Provider) {
    const branch = selectedBranch ?? (p.branchIds[0] ?? null);
    setSchedProvider(p);
    setSchedBranch(branch);
    setSchedForm(scheduleFromSlots(p.schedule ?? [], branch ?? ""));
  }

  async function saveSchedule() {
    if (!schedProvider || !schedBranch) return;
    setSchedSaving(true);
    const slots = Object.entries(schedForm)
      .filter(([, v]) => v.enabled)
      .map(([dow, v]) => ({
        branchId: schedBranch,
        dayOfWeek: Number(dow),
        startTime: v.startTime,
        endTime: v.endTime,
        slotDurationMin: v.slotDurationMin,
      }));
    try {
      await apiFetch(`/api/v1/providers/${schedProvider.id}/schedule`, {
        method: "PUT",
        body: JSON.stringify(slots),
      });
      setSchedProvider(null);
    } catch (e: any) {
      alert(e?.message ?? "Failed to save schedule");
    } finally {
      setSchedSaving(false);
    }
  }

  return (
    <div style={{ padding: 28, display: "flex", flexDirection: "column", gap: 24, maxWidth: 920 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: -0.4 }}>Providers</div>
          <div style={{ fontSize: 12, color: "var(--color-fg-3)", marginTop: 2 }}>
            Manage doctors and specialists
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {branches.length > 1 && (
            <select
              value={selectedBranch ?? ""}
              onChange={(e) => setSelectedBranch(e.target.value)}
              style={{
                padding: "7px 11px", borderRadius: 8,
                border: "1px solid var(--color-border)",
                background: "var(--color-surface)", color: "var(--color-fg)",
                fontSize: 13, cursor: "pointer",
              }}
            >
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
          <button
            onClick={() => setShowAdd(true)}
            style={{
              padding: "8px 16px", borderRadius: 8, border: "none",
              background: "var(--color-primary)", color: "#fff",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            + Add provider
          </button>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <div style={{
          background: "var(--color-surface)", border: "1.5px solid var(--color-primary)",
          borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", gap: 14,
        }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>New provider</div>
          <div style={{ display: "flex", gap: 12 }}>
            <input
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              placeholder="Full name *"
              style={{
                flex: 1, padding: "9px 12px", borderRadius: 8,
                border: "1px solid var(--color-border)",
                background: "var(--color-surface-2)", color: "var(--color-fg)", fontSize: 13,
              }}
            />
            <input
              value={addSpecialty}
              onChange={(e) => setAddSpecialty(e.target.value)}
              placeholder="Specialty (e.g. Cardiologist)"
              style={{
                flex: 1, padding: "9px 12px", borderRadius: 8,
                border: "1px solid var(--color-border)",
                background: "var(--color-surface-2)", color: "var(--color-fg)", fontSize: 13,
              }}
            />
          </div>
          <div>
            <div style={{ fontSize: 12, color: "var(--color-fg-3)", marginBottom: 6 }}>Assign to branches</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {branches.map((b) => {
                const checked = addBranches.includes(b.id);
                return (
                  <label key={b.id} style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "5px 10px", borderRadius: 7,
                    border: `1px solid ${checked ? "var(--color-primary)" : "var(--color-border)"}`,
                    background: checked ? "var(--color-primary-soft)" : "var(--color-surface-2)",
                    cursor: "pointer", fontSize: 12,
                  }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => setAddBranches((prev) =>
                        checked ? prev.filter((x) => x !== b.id) : [...prev, b.id]
                      )}
                      style={{ display: "none" }}
                    />
                    {b.name}
                  </label>
                );
              })}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleAdd} disabled={!addName.trim() || addSaving} style={{
              padding: "9px 20px", borderRadius: 8, border: "none",
              background: "var(--color-primary)", color: "#fff",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>
              {addSaving ? "Saving…" : "Add provider"}
            </button>
            <button onClick={() => setShowAdd(false)} style={{
              padding: "9px 16px", borderRadius: 8,
              border: "1px solid var(--color-border)",
              background: "var(--color-surface)", color: "var(--color-fg-2)",
              fontSize: 13, cursor: "pointer",
            }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Provider list */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ height: 64, borderRadius: 10, background: "var(--color-surface)",
              border: "1px solid var(--color-border)" }}/>
          ))}
        </div>
      ) : providers.length === 0 ? (
        <div style={{ padding: "40px 0", textAlign: "center", color: "var(--color-fg-3)", fontSize: 13 }}>
          No providers at this branch yet.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {providers.map((p) => (
            <div key={p.id} style={{
              background: "var(--color-surface)", border: "1px solid var(--color-border)",
              borderRadius: 12, padding: "14px 18px",
              display: "flex", alignItems: "center", gap: 14,
            }}>
              <ProviderInitial name={p.fullName} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{p.fullName}</div>
                {p.specialty && (
                  <div style={{ fontSize: 12, color: "var(--color-fg-3)", marginTop: 2,
                    fontFamily: "var(--font-mono)" }}>{p.specialty}</div>
                )}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => openSchedule(p)} style={{
                  padding: "6px 14px", borderRadius: 7,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface-2)", color: "var(--color-fg-2)",
                  fontSize: 12, cursor: "pointer",
                }}>
                  Schedule
                </button>
                <button onClick={() => toggleActive(p)} style={{
                  padding: "6px 12px", borderRadius: 7,
                  border: "1px solid var(--color-danger-soft)",
                  background: "var(--color-danger-soft)", color: "var(--color-danger)",
                  fontSize: 12, cursor: "pointer",
                }}>
                  Deactivate
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Schedule editor modal */}
      {schedProvider && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center",
        }} onClick={(e) => { if (e.target === e.currentTarget) setSchedProvider(null); }}>
          <div style={{
            background: "var(--color-surface)", borderRadius: 18, padding: 28,
            width: 560, maxHeight: "85vh", overflowY: "auto",
            display: "flex", flexDirection: "column", gap: 18,
            boxShadow: "0 16px 64px rgba(0,0,0,0.25)",
          }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>
              Schedule — {schedProvider.fullName}
            </div>

            {schedProvider.branchIds.length > 1 && (
              <select
                value={schedBranch ?? ""}
                onChange={(e) => {
                  setSchedBranch(e.target.value);
                  setSchedForm(scheduleFromSlots(schedProvider.schedule ?? [], e.target.value));
                }}
                style={{
                  padding: "8px 12px", borderRadius: 8,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface-2)", color: "var(--color-fg)", fontSize: 13,
                }}
              >
                {branches.filter((b) => schedProvider.branchIds.includes(b.id)).map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {DAYS.map((dayName, idx) => {
                const dow = idx + 1;
                const slot = schedForm[dow]!;
                return (
                  <div key={dow} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 14px", borderRadius: 10,
                    background: slot.enabled ? "var(--color-surface-2)" : "var(--color-surface-3)",
                    border: "1px solid var(--color-border)",
                  }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", minWidth: 48 }}>
                      <input
                        type="checkbox"
                        checked={slot.enabled}
                        onChange={() => setSchedForm((prev) => ({
                          ...prev, [dow]: { ...prev[dow]!, enabled: !slot.enabled }
                        }))}
                      />
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{dayName}</span>
                    </label>
                    {slot.enabled && (
                      <>
                        <input type="time" value={slot.startTime}
                          onChange={(e) => setSchedForm((prev) => ({ ...prev, [dow]: { ...prev[dow]!, startTime: e.target.value } }))}
                          style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid var(--color-border)",
                            background: "var(--color-surface)", color: "var(--color-fg)", fontSize: 13 }} />
                        <span style={{ fontSize: 12, color: "var(--color-fg-3)" }}>to</span>
                        <input type="time" value={slot.endTime}
                          onChange={(e) => setSchedForm((prev) => ({ ...prev, [dow]: { ...prev[dow]!, endTime: e.target.value } }))}
                          style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid var(--color-border)",
                            background: "var(--color-surface)", color: "var(--color-fg)", fontSize: 13 }} />
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
                          <select
                            value={slot.slotDurationMin}
                            onChange={(e) => setSchedForm((prev) => ({ ...prev, [dow]: { ...prev[dow]!, slotDurationMin: Number(e.target.value) } }))}
                            style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid var(--color-border)",
                              background: "var(--color-surface)", color: "var(--color-fg)", fontSize: 12 }}
                          >
                            {[10, 15, 20, 30, 45, 60].map((m) => (
                              <option key={m} value={m}>{m} min</option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setSchedProvider(null)} style={{
                padding: "9px 18px", borderRadius: 8,
                border: "1px solid var(--color-border)",
                background: "var(--color-surface)", color: "var(--color-fg-2)",
                fontSize: 13, cursor: "pointer",
              }}>
                Cancel
              </button>
              <button onClick={saveSchedule} disabled={schedSaving} style={{
                padding: "9px 20px", borderRadius: 8, border: "none",
                background: "var(--color-primary)", color: "#fff",
                fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}>
                {schedSaving ? "Saving…" : "Save schedule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
