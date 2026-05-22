"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Appointment, Branch, Provider } from "@/lib/types";

const HOUR_HEIGHT = 60; // px per hour
const DAY_START = 8;
const DAY_END = 20;

const STATUS_COLOR: Record<string, { color: string; bg: string; label: string }> = {
  booked:     { color: "var(--color-primary)", bg: "var(--color-primary-soft)", label: "Booked" },
  confirmed:  { color: "var(--color-violet)",  bg: "oklch(0.96 0.04 280)",     label: "Confirmed" },
  checked_in: { color: "var(--color-success)", bg: "var(--color-success-soft)", label: "Checked in" },
  in_progress:{ color: "var(--color-warning)", bg: "var(--color-warning-soft)", label: "In progress" },
  no_show:    { color: "var(--color-fg-3)",    bg: "var(--color-surface-3)",   label: "No-show" },
  served:     { color: "var(--color-success)", bg: "var(--color-success-soft)", label: "Served" },
  cancelled:  { color: "var(--color-fg-4)",    bg: "var(--color-surface-3)",   label: "Cancelled" },
};

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function fmtHour(h: number) {
  return `${String(h).padStart(2, "0")}:00`;
}

function topForInstant(iso: string): number {
  const d = new Date(iso);
  const h = d.getHours() + d.getMinutes() / 60;
  return Math.max(0, (h - DAY_START) * HOUR_HEIGHT);
}

function heightForDuration(seconds: number): number {
  return Math.max(24, (seconds / 3600) * HOUR_HEIGHT);
}

export default function AdminAppointmentsPage() {
  const router = useRouter();
  const [date, setDate] = useState(new Date());
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Branch[]>("/api/v1/admin/branches")
      .then((bs) => { setBranches(bs); if (bs.length > 0) setSelectedBranch(bs[0]!.id); })
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    if (!selectedBranch) return;
    setLoading(true);
    const from = new Date(date); from.setHours(0, 0, 0, 0);
    const to = new Date(date); to.setHours(23, 59, 59, 999);
    try {
      const [appts, provs] = await Promise.all([
        apiFetch<Appointment[]>(
          `/api/v1/appointments?branchId=${selectedBranch}&from=${from.toISOString()}&to=${to.toISOString()}`
        ),
        apiFetch<Provider[]>(`/api/v1/providers?branchId=${selectedBranch}`),
      ]);
      setAppointments(appts);
      setProviders(provs);
    } catch {
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [selectedBranch, date]);

  useEffect(() => { load(); }, [load]);

  async function action(apptId: string, endpoint: string) {
    setActionLoading(apptId + endpoint);
    try {
      await apiFetch(`/api/v1/appointments/${apptId}/${endpoint}`, { method: "POST" });
      await load();
    } catch (e: any) {
      alert(e?.message ?? "Action failed");
    } finally {
      setActionLoading(null);
    }
  }

  async function startServing(apptId: string) {
    setActionLoading(apptId + "start");
    try {
      const ticket = await apiFetch<{ id: string }>(`/api/v1/appointments/${apptId}/start`, { method: "POST" });
      router.push("/admin/queue");
    } catch (e: any) {
      alert(e?.message ?? "Failed to start serving");
      setActionLoading(null);
    }
  }

  function prevDay() { const d = new Date(date); d.setDate(d.getDate() - 1); setDate(d); }
  function nextDay() { const d = new Date(date); d.setDate(d.getDate() + 1); setDate(d); }

  const noProvider = appointments.filter((a) => !a.providerId);
  const totalHours = DAY_END - DAY_START;
  const gridHeight = totalHours * HOUR_HEIGHT;

  const dateLabel = date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div style={{ padding: "20px 28px", display: "flex", flexDirection: "column", gap: 16, minWidth: 0, flex: 1, height: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: -0.3 }}>Appointments</div>
        <div style={{ flex: 1 }}/>
        {branches.length > 1 && (
          <select value={selectedBranch ?? ""} onChange={(e) => setSelectedBranch(e.target.value)}
            style={{ padding: "7px 11px", borderRadius: 8, border: "1px solid var(--color-border)",
              background: "var(--color-surface)", color: "var(--color-fg)", fontSize: 13, cursor: "pointer" }}>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}
        {/* Date nav */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button onClick={prevDay} style={navBtnStyle}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </button>
          <div style={{ fontSize: 13, fontWeight: 500, minWidth: 200, textAlign: "center" }}>{dateLabel}</div>
          <button onClick={nextDay} style={navBtnStyle}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m9 18 6-6-6-6"/>
            </svg>
          </button>
          <button onClick={() => setDate(new Date())}
            style={{ ...navBtnStyle, fontSize: 11, padding: "6px 10px", borderRadius: 6, fontWeight: 500 }}>
            Today
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div style={{ flex: 1, overflow: "auto", border: "1px solid var(--color-border)", borderRadius: 12 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--color-fg-3)", fontSize: 13 }}>Loading…</div>
        ) : (
          <div style={{ display: "flex", minWidth: 600 }}>
            {/* Time axis */}
            <div style={{ width: 56, flexShrink: 0, borderRight: "1px solid var(--color-hairline)" }}>
              <div style={{ height: 40, borderBottom: "1px solid var(--color-hairline)" }}/>
              <div style={{ position: "relative", height: gridHeight }}>
                {Array.from({ length: totalHours }, (_, i) => (
                  <div key={i} style={{
                    position: "absolute", top: i * HOUR_HEIGHT - 8, left: 0, right: 0,
                    textAlign: "right", paddingRight: 8,
                    fontSize: 10, fontFamily: "var(--font-mono)",
                    color: "var(--color-fg-4)",
                  }}>
                    {fmtHour(DAY_START + i)}
                  </div>
                ))}
              </div>
            </div>

            {/* Columns: one per provider + one "unassigned" */}
            {[...providers, null as Provider | null].map((prov) => {
              const colAppts = prov
                ? appointments.filter((a) => a.providerId === prov.id)
                : noProvider;
              if (prov && colAppts.length === 0 && providers.length > 0 && noProvider.length === 0) {
                // Show empty provider columns only if there's data
              }
              return (
                <div key={prov?.id ?? "none"} style={{
                  flex: 1, minWidth: 160,
                  borderRight: "1px solid var(--color-hairline)",
                }}>
                  {/* Column header */}
                  <div style={{
                    height: 40, borderBottom: "1px solid var(--color-hairline)",
                    padding: "0 10px", display: "flex", alignItems: "center",
                    background: "var(--color-surface)",
                    fontSize: 12, fontWeight: 600, color: "var(--color-fg-2)",
                  }}>
                    {prov ? prov.fullName : "Unassigned"}
                    {prov?.specialty && (
                      <span style={{ marginLeft: 6, fontSize: 10, color: "var(--color-fg-4)",
                        fontFamily: "var(--font-mono)" }}>{prov.specialty}</span>
                    )}
                  </div>

                  {/* Hour grid lines + appointments */}
                  <div style={{ position: "relative", height: gridHeight, background: "var(--color-bg)" }}>
                    {Array.from({ length: totalHours }, (_, i) => (
                      <div key={i} style={{
                        position: "absolute", top: i * HOUR_HEIGHT, left: 0, right: 0,
                        borderTop: "1px solid var(--color-hairline)", pointerEvents: "none",
                      }}/>
                    ))}

                    {colAppts.map((a) => {
                      const sc = STATUS_COLOR[a.status] ?? STATUS_COLOR.booked!;
                      const top = topForInstant(a.scheduledAt);
                      const height = heightForDuration(a.durationSeconds);
                      return (
                        <div
                          key={a.id}
                          onClick={() => router.push(`/admin/appointments/${a.id}` as any)}
                          style={{
                            position: "absolute",
                            top, left: 4, right: 4,
                            height: Math.min(height, gridHeight - top - 2),
                            background: sc.bg,
                            border: `1.5px solid ${sc.color}`,
                            borderRadius: 7, padding: "4px 7px",
                            cursor: "pointer", overflow: "hidden",
                            display: "flex", flexDirection: "column", gap: 2,
                          }}
                        >
                          <div style={{ fontSize: 11, fontWeight: 600, color: sc.color,
                            fontFamily: "var(--font-mono)" }}>
                            {new Date(a.scheduledAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--color-fg-2)", overflow: "hidden",
                            textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {a.serviceName ?? "Service"}
                          </div>
                          {/* Inline action */}
                          {(a.status === "booked" || a.status === "confirmed") && (
                            <button
                              onClick={(e) => { e.stopPropagation(); action(a.id, "check-in"); }}
                              disabled={actionLoading != null}
                              style={{
                                marginTop: "auto", padding: "2px 6px", borderRadius: 4,
                                border: "none", background: sc.color, color: "#fff",
                                fontSize: 9, fontWeight: 600, cursor: "pointer", alignSelf: "flex-start",
                              }}
                            >
                              Check in
                            </button>
                          )}
                          {a.status === "checked_in" && (
                            <button
                              onClick={(e) => { e.stopPropagation(); startServing(a.id); }}
                              disabled={actionLoading != null}
                              style={{
                                marginTop: "auto", padding: "2px 6px", borderRadius: 4,
                                border: "none", background: "var(--color-success)", color: "#fff",
                                fontSize: 9, fontWeight: 600, cursor: "pointer", alignSelf: "flex-start",
                              }}
                            >
                              Start
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const navBtnStyle: React.CSSProperties = {
  padding: "6px 8px", borderRadius: 7,
  border: "1px solid var(--color-border)",
  background: "var(--color-surface)", color: "var(--color-fg-2)",
  cursor: "pointer", display: "grid", placeItems: "center",
};
