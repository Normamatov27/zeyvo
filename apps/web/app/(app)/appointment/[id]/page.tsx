"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { apiFetch, ApiError } from "@/lib/api";
import { Appointment } from "@/lib/types";

function fmtDatetime(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function countdown(scheduledAt: string): string {
  const diff = new Date(scheduledAt).getTime() - Date.now();
  if (diff <= 0) return "Now";
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function AppointmentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const t = useTranslations("appointments");

  const [appt, setAppt] = useState<Appointment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [, forceRender] = useState(0);

  useEffect(() => {
    apiFetch<Appointment>(`/api/v1/appointments/my`)
      .then((list: any) => {
        const found = Array.isArray(list) ? list.find((a: Appointment) => a.id === id) : null;
        if (found) setAppt(found);
        else setError("Appointment not found");
      })
      .catch((e: unknown) => {
        setError(e instanceof ApiError && e.status === 404 ? t("not_found") : t("not_found"));
      })
      .finally(() => setLoading(false));
  }, [id]);

  // Countdown ticker
  useEffect(() => {
    const interval = setInterval(() => forceRender(n => n + 1), 30_000);
    return () => clearInterval(interval);
  }, []);

  async function cancel() {
    if (!appt || cancelling) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const updated = await apiFetch<Appointment>(`/api/v1/appointments/${id}/cancel`, { method: "POST" });
      setAppt(updated);
    } catch (e: any) {
      const code = e?.code ?? "";
      setCancelError(
        code === "appointment.cancel_too_late" ? t("cancel_too_late") :
        code === "appointment.not_cancellable" ? "This appointment can no longer be cancelled." :
        e?.message ?? "Failed to cancel"
      );
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--color-fg-3)", fontSize: 13 }}>
        {t("loading")}
      </div>
    );
  }

  if (error || !appt) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <div style={{ fontSize: 14, color: "var(--color-fg-3)" }}>{error ?? t("not_found")}</div>
        <button onClick={() => router.back()} style={{
          marginTop: 16, padding: "10px 20px", borderRadius: 10,
          border: "1px solid var(--color-border)", background: "var(--color-surface)",
          color: "var(--color-fg)", fontSize: 13, cursor: "pointer",
        }}>{t("go_back")}</button>
      </div>
    );
  }

  const isBooked = appt.status === "booked" || appt.status === "confirmed";
  const isDone = appt.status === "served" || appt.status === "no_show";
  const oneHourBefore = new Date(appt.scheduledAt).getTime() - 3600_000;
  const canCancel = isBooked && Date.now() < oneHourBefore;

  const statusColor: Record<string, { color: string; bg: string }> = {
    booked:     { color: "var(--color-primary)", bg: "var(--color-primary-soft)" },
    confirmed:  { color: "var(--color-violet)",  bg: "oklch(0.96 0.04 280)" },
    checked_in: { color: "var(--color-success)", bg: "var(--color-success-soft)" },
    in_progress:{ color: "var(--color-warning)", bg: "var(--color-warning-soft)" },
    cancelled:  { color: "var(--color-fg-3)", bg: "var(--color-surface-3)" },
    no_show:    { color: "var(--color-warning)", bg: "var(--color-warning-soft)" },
    served:     { color: "var(--color-success)", bg: "var(--color-success-soft)" },
  };
  const sc = statusColor[appt.status] ?? { color: "var(--color-fg-3)", bg: "var(--color-surface-3)" };

  return (
    <div style={{ padding: 20, maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Back */}
      <button onClick={() => router.back()} style={{
        background: "none", border: "none", padding: 0, cursor: "pointer",
        color: "var(--color-fg-3)", fontSize: 13, display: "flex", alignItems: "center", gap: 4,
        alignSelf: "flex-start",
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m15 18-6-6 6-6"/>
        </svg>
        {t("back")}
      </button>

      {/* Hero card */}
      <div style={{
        borderRadius: 20, padding: 24, color: "#fff",
        background: isBooked
          ? "linear-gradient(135deg, var(--color-primary) 0%, var(--color-violet) 100%)"
          : "linear-gradient(135deg, var(--color-fg-3) 0%, var(--color-fg-4) 100%)",
      }}>
        <div style={{ fontSize: 11, opacity: 0.7, textTransform: "uppercase", letterSpacing: 0.8,
          fontFamily: "var(--font-mono)" }}>
          {t("title")}
        </div>
        <div style={{ fontSize: 42, fontWeight: 600, letterSpacing: -1.5, lineHeight: 1, marginTop: 8 }}>
          {isBooked ? countdown(appt.scheduledAt) : t(`status.${appt.status}` as any)}
        </div>
        <div style={{ marginTop: 16, fontSize: 13, opacity: 0.85 }}>
          {fmtDatetime(appt.scheduledAt)}
        </div>
        {appt.providerName && (
          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
            {appt.providerName}
          </div>
        )}
        <div style={{
          marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.2)",
          display: "flex", gap: 20,
        }}>
          {appt.branchName && (
            <div>
              <div style={{ fontSize: 10, opacity: 0.6, textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>
                {t("branch_label")}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{appt.branchName}</div>
            </div>
          )}
          {appt.serviceName && (
            <div>
              <div style={{ fontSize: 10, opacity: 0.6, textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>
                {t("service_label")}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{appt.serviceName}</div>
            </div>
          )}
          <div>
            <div style={{ fontSize: 10, opacity: 0.6, textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>
              {t("duration_label")}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>
              ~{Math.round(appt.durationSeconds / 60)} min
            </div>
          </div>
        </div>
      </div>

      {/* Status pill */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <span style={{
          fontSize: 12, fontWeight: 600, padding: "5px 14px", borderRadius: 999,
          background: sc.bg, color: sc.color,
        }}>
          {t(`status.${appt.status}` as any)}
        </span>
      </div>

      {/* Linked ticket */}
      {appt.ticketId && (
        <Link href={`/ticket/${appt.ticketId}`} style={{ textDecoration: "none" }}>
          <div style={{
            background: "var(--color-surface)", border: "1px solid var(--color-border)",
            borderRadius: 12, padding: "12px 16px",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: "var(--color-fg)" }}>
              {t("view_ticket")}
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-fg-4)" strokeWidth="2">
              <path d="m9 18 6-6-6-6"/>
            </svg>
          </div>
        </Link>
      )}

      {/* Cancel */}
      {canCancel && (
        <div>
          {cancelError && (
            <div style={{ fontSize: 12, color: "var(--color-danger)", padding: "8px 12px",
              borderRadius: 8, background: "var(--color-danger-soft)", marginBottom: 8 }}>
              {cancelError}
            </div>
          )}
          <button onClick={cancel} disabled={cancelling} style={{
            width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
            background: "var(--color-danger-soft)", color: "var(--color-danger)",
            fontSize: 14, fontWeight: 600, cursor: cancelling ? "not-allowed" : "pointer",
          }}>
            {cancelling ? t("cancelling") : t("cancel")}
          </button>
        </div>
      )}

      {!canCancel && isBooked && (
        <div style={{ fontSize: 12, color: "var(--color-fg-3)", textAlign: "center" }}>
          {t("cancel_too_late")}
        </div>
      )}
    </div>
  );
}
