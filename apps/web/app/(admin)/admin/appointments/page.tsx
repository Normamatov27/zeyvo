"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { apiFetch } from "@/lib/api";
import { Appointment, Branch } from "@/lib/types";

function fmtDatetime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    weekday: "short", day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const APPT_STATUS_COLOR: Record<string, { color: string; bg: string }> = {
  booked:    { color: "var(--color-primary)", bg: "var(--color-primary-soft)" },
  cancelled: { color: "var(--color-fg-3)",    bg: "var(--color-surface-3)" },
  no_show:   { color: "var(--color-warning)", bg: "var(--color-warning-soft)" },
  served:    { color: "var(--color-success)", bg: "var(--color-success-soft)" },
};

export default function AdminAppointmentsPage() {
  const t = useTranslations("appointments");
  const router = useRouter();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Load today + next 7 days
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + 7);

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
    apiFetch<Appointment[]>(
      `/api/v1/appointments?branchId=${selectedBranch}&from=${from.toISOString()}&to=${to.toISOString()}`
    )
      .then(setAppointments)
      .catch(() => setAppointments([]))
      .finally(() => setLoading(false));
  }, [selectedBranch]);

  async function checkIn(id: string) {
    setActionLoading(id);
    try {
      const ticket = await apiFetch<{ id: string }>(`/api/v1/appointments/${id}/check-in`, { method: "POST" });
      router.push(`/admin/queue`);
    } catch (e: any) {
      alert(e?.message ?? "Check-in failed");
    } finally {
      setActionLoading(null);
    }
  }

  async function cancelAppt(id: string) {
    if (!confirm("Cancel this appointment?")) return;
    setActionLoading(id);
    try {
      await apiFetch(`/api/v1/appointments/${id}/cancel?admin=true`, { method: "POST" });
      setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, status: "cancelled" as const } : a));
    } catch (e: any) {
      alert(e?.message ?? "Cancel failed");
    } finally {
      setActionLoading(null);
    }
  }

  const booked = appointments.filter((a) => a.status === "booked");
  const past = appointments.filter((a) => a.status !== "booked");

  return (
    <div style={{ padding: 28, display: "flex", flexDirection: "column", gap: 24, maxWidth: 900 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: -0.4 }}>{t("title")}</div>
          <div style={{ fontSize: 12, color: "var(--color-fg-3)", marginTop: 3 }}>
            Today + next 7 days
          </div>
        </div>

        {branches.length > 1 && (
          <select
            value={selectedBranch ?? ""}
            onChange={(e) => setSelectedBranch(e.target.value)}
            style={{
              padding: "8px 12px", borderRadius: 8,
              border: "1px solid var(--color-border)",
              background: "var(--color-surface)", color: "var(--color-fg)",
              fontSize: 13, cursor: "pointer",
            }}
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ height: 64, borderRadius: 10, background: "var(--color-surface)",
              border: "1px solid var(--color-border)" }}/>
          ))}
        </div>
      ) : (
        <>
          {/* Upcoming */}
          <div>
            <div style={{
              fontSize: 11, fontWeight: 600, color: "var(--color-fg-3)",
              textTransform: "uppercase", letterSpacing: 0.6, fontFamily: "var(--font-mono)",
              marginBottom: 10,
            }}>
              Upcoming ({booked.length})
            </div>
            {booked.length === 0 ? (
              <div style={{ fontSize: 13, color: "var(--color-fg-3)", padding: "20px 0" }}>
                {t("empty_title")}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {booked.map((a) => (
                  <div key={a.id} style={{
                    background: "var(--color-surface)", border: "1px solid var(--color-border)",
                    borderRadius: 10, padding: "12px 16px",
                    display: "flex", alignItems: "center", gap: 16,
                  }}>
                    <div style={{
                      fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 700,
                      color: "var(--color-primary)", minWidth: 50,
                    }}>
                      {fmtTime(a.scheduledAt)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-fg)" }}>
                        {a.serviceName ?? "Service"}
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--color-fg-3)", marginTop: 1, fontFamily: "var(--font-mono)" }}>
                        {fmtDatetime(a.scheduledAt)} · ~{Math.round(a.durationSeconds / 60)} min
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => checkIn(a.id)}
                        disabled={actionLoading === a.id}
                        style={{
                          padding: "7px 14px", borderRadius: 8, border: "none",
                          background: "var(--color-primary)", color: "#fff",
                          fontSize: 12, fontWeight: 600, cursor: "pointer",
                        }}
                      >
                        {actionLoading === a.id ? "…" : t("check_in")}
                      </button>
                      <button
                        onClick={() => cancelAppt(a.id)}
                        disabled={actionLoading === a.id}
                        style={{
                          padding: "7px 12px", borderRadius: 8,
                          border: "1px solid var(--color-border)",
                          background: "var(--color-surface)", color: "var(--color-fg-3)",
                          fontSize: 12, cursor: "pointer",
                        }}
                      >
                        {t("cancel")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Past */}
          {past.length > 0 && (
            <div>
              <div style={{
                fontSize: 11, fontWeight: 600, color: "var(--color-fg-3)",
                textTransform: "uppercase", letterSpacing: 0.6, fontFamily: "var(--font-mono)",
                marginBottom: 10,
              }}>
                Recent ({past.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {past.map((a) => {
                  const cfg = APPT_STATUS_COLOR[a.status] ?? APPT_STATUS_COLOR.cancelled!;
                  return (
                    <div key={a.id} style={{
                      background: "var(--color-surface)", border: "1px solid var(--color-border)",
                      borderRadius: 10, padding: "10px 16px",
                      display: "flex", alignItems: "center", gap: 16, opacity: 0.7,
                    }}>
                      <div style={{
                        fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 600,
                        color: "var(--color-fg-3)", minWidth: 50,
                      }}>
                        {fmtTime(a.scheduledAt)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-fg)" }}>
                          {a.serviceName ?? "Service"}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--color-fg-3)", marginTop: 1, fontFamily: "var(--font-mono)" }}>
                          {fmtDatetime(a.scheduledAt)}
                        </div>
                      </div>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 999,
                        background: cfg.bg, color: cfg.color,
                      }}>
                        {t(`status.${a.status}` as any)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
