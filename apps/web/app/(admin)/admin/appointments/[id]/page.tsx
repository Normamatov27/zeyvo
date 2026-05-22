"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Appointment } from "@/lib/types";

const STATUS_COLOR: Record<string, { color: string; bg: string; label: string }> = {
  booked:     { color: "var(--color-primary)", bg: "var(--color-primary-soft)", label: "Booked" },
  confirmed:  { color: "var(--color-violet)",  bg: "oklch(0.96 0.04 280)",     label: "Confirmed" },
  checked_in: { color: "var(--color-success)", bg: "var(--color-success-soft)", label: "Checked in" },
  in_progress:{ color: "var(--color-warning)", bg: "var(--color-warning-soft)", label: "In progress" },
  no_show:    { color: "var(--color-fg-3)",    bg: "var(--color-surface-3)",   label: "No-show" },
  served:     { color: "var(--color-success)", bg: "var(--color-success-soft)", label: "Served" },
  cancelled:  { color: "var(--color-fg-4)",    bg: "var(--color-surface-3)",   label: "Cancelled" },
};

function fmtDatetime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function AdminAppointmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [appt, setAppt] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Appointment>(`/api/v1/appointments/${id}`)
      .then(setAppt)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  async function action(endpoint: string, params?: string) {
    if (!appt) return;
    setActionLoading(endpoint);
    try {
      if (endpoint === "start") {
        await apiFetch(`/api/v1/appointments/${id}/start`, { method: "POST" });
        router.push("/admin/queue");
        return;
      }
      const url = `/api/v1/appointments/${id}/${endpoint}` + (params ? `?${params}` : "");
      const updated = await apiFetch<Appointment>(url, { method: "POST" });
      setAppt(updated);
    } catch (e: any) {
      alert(e?.message ?? "Action failed");
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return <div style={{ padding: 40, color: "var(--color-fg-3)", fontSize: 13 }}>Loading…</div>;
  }

  if (!appt) {
    return (
      <div style={{ padding: 40 }}>
        <div style={{ color: "var(--color-fg-3)", fontSize: 13 }}>Appointment not found.</div>
        <button onClick={() => router.back()} style={{ marginTop: 12, padding: "8px 16px", borderRadius: 8,
          border: "1px solid var(--color-border)", background: "var(--color-surface)",
          color: "var(--color-fg)", fontSize: 13, cursor: "pointer" }}>Back</button>
      </div>
    );
  }

  const sc = STATUS_COLOR[appt.status] ?? STATUS_COLOR.booked!;
  const typeLabel: Record<string, string> = {
    standard: "Standard", emergency: "Emergency", follow_up: "Follow-up", walk_in: "Walk-in",
  };

  return (
    <div style={{ padding: 28, maxWidth: 720, display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Back */}
      <button onClick={() => router.back()} style={{
        background: "none", border: "none", padding: 0, cursor: "pointer",
        color: "var(--color-fg-3)", fontSize: 13, display: "flex", alignItems: "center", gap: 4,
        alignSelf: "flex-start",
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m15 18-6-6 6-6"/>
        </svg>
        Appointments
      </button>

      {/* Hero */}
      <div style={{
        background: "var(--color-surface)", border: "1px solid var(--color-border)",
        borderRadius: 16, padding: 22,
        display: "flex", flexDirection: "column", gap: 16,
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: -0.3 }}>
              {fmtDatetime(appt.scheduledAt)}
            </div>
            <div style={{ fontSize: 13, color: "var(--color-fg-3)", marginTop: 4 }}>
              {appt.branchName ?? "Branch"} · {appt.serviceName ?? "Service"} · ~{Math.round(appt.durationSeconds / 60)} min
            </div>
            {appt.providerName && (
              <div style={{ fontSize: 13, color: "var(--color-fg-2)", marginTop: 2 }}>
                Provider: {appt.providerName}
              </div>
            )}
          </div>
          <span style={{
            padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600,
            background: sc.bg, color: sc.color, flex: "none",
          }}>
            {sc.label}
          </span>
        </div>

        {/* Meta row */}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {[
            { label: "Type", value: typeLabel[appt.appointmentType] ?? appt.appointmentType },
            { label: "Priority", value: String(appt.priority) },
            appt.checkInAt ? { label: "Checked in", value: new Date(appt.checkInAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) } : null,
          ].filter(Boolean).map((item) => (
            <div key={item!.label} style={{
              background: "var(--color-surface-2)", borderRadius: 8, padding: "8px 14px",
            }}>
              <div style={{ fontSize: 10, color: "var(--color-fg-4)", fontFamily: "var(--font-mono)",
                textTransform: "uppercase", letterSpacing: 0.5 }}>{item!.label}</div>
              <div style={{ fontSize: 13, fontWeight: 500, marginTop: 3 }}>{item!.value}</div>
            </div>
          ))}
        </div>

        {/* Patient note */}
        {appt.patientNote && (
          <div style={{ background: "var(--color-surface-2)", borderRadius: 8, padding: "10px 14px" }}>
            <div style={{ fontSize: 10, color: "var(--color-fg-4)", fontFamily: "var(--font-mono)",
              textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Patient note</div>
            <div style={{ fontSize: 13, color: "var(--color-fg-2)", lineHeight: 1.5 }}>{appt.patientNote}</div>
          </div>
        )}

        {/* Linked ticket */}
        {appt.ticketId && (
          <Link href={`/admin/queue` as any} style={{ textDecoration: "none" }}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "10px 14px", borderRadius: 8,
              background: "var(--color-success-soft)", border: "1px solid var(--color-success)",
            }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-success)" }}>
                Linked queue ticket
              </span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2">
                <path d="m9 18 6-6-6-6"/>
              </svg>
            </div>
          </Link>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {appt.status === "booked" && (
          <button onClick={() => action("confirm")} disabled={actionLoading != null} style={actionBtnStyle("primary")}>
            {actionLoading === "confirm" ? "…" : "Confirm"}
          </button>
        )}
        {(appt.status === "booked" || appt.status === "confirmed") && (
          <>
            <button onClick={() => action("check-in")} disabled={actionLoading != null} style={actionBtnStyle("success")}>
              {actionLoading === "check-in" ? "…" : "Check in"}
            </button>
            <button onClick={() => action("no-show")} disabled={actionLoading != null} style={actionBtnStyle("warning")}>
              {actionLoading === "no-show" ? "…" : "No-show"}
            </button>
          </>
        )}
        {appt.status === "checked_in" && (
          <button onClick={() => action("start")} disabled={actionLoading != null} style={actionBtnStyle("success")}>
            {actionLoading === "start" ? "…" : "Start serving → queue"}
          </button>
        )}
        {(appt.status === "booked" || appt.status === "confirmed") && (
          <button onClick={() => action("cancel", "admin=true")} disabled={actionLoading != null} style={actionBtnStyle("danger")}>
            {actionLoading === "cancel" ? "…" : "Cancel"}
          </button>
        )}
      </div>
    </div>
  );
}

function actionBtnStyle(tone: "primary" | "success" | "warning" | "danger"): React.CSSProperties {
  const map: Record<string, { bg: string; color: string }> = {
    primary: { bg: "var(--color-primary)", color: "#fff" },
    success: { bg: "var(--color-success)", color: "#fff" },
    warning: { bg: "var(--color-warning-soft)", color: "var(--color-warning)" },
    danger:  { bg: "var(--color-danger-soft)",  color: "var(--color-danger)" },
  };
  const t = map[tone]!;
  return {
    padding: "10px 20px", borderRadius: 9, border: "none",
    background: t.bg, color: t.color,
    fontSize: 13, fontWeight: 600, cursor: "pointer",
  };
}
