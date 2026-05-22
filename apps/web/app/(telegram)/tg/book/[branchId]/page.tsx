"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { apiFetch } from "@/lib/api";
import { BranchDetail, SlotInfo } from "@/lib/types";

function fmtSlotTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default function TgBookPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const router = useRouter();
  const t = useTranslations("appointments");

  const [branch, setBranch] = useState<BranchDetail | null>(null);
  const [step, setStep] = useState<"date" | "service" | "slot" | "done">("date");
  const [selectedDate, setSelectedDate] = useState(isoDate(new Date()));
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appointmentId, setAppointmentId] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<BranchDetail>(`/api/v1/branches/${branchId}`)
      .then((b) => {
        setBranch(b);
        if (b.services.length > 0) setSelectedService(b.services[0]!.id);
      })
      .catch(() => setError("Branch not found"));
  }, [branchId]);

  async function loadSlots(date: string, serviceId: string) {
    setLoadingSlots(true);
    setSlots([]);
    setSelectedSlot(null);
    try {
      const data = await apiFetch<SlotInfo[]>(
        `/api/v1/appointments/availability?branchId=${branchId}&date=${date}&serviceId=${serviceId}`
      );
      setSlots(data);
    } catch {
      setError("Failed to load slots");
    } finally {
      setLoadingSlots(false);
    }
  }

  async function confirm() {
    if (!selectedSlot || !selectedService) return;
    setConfirming(true);
    setError(null);
    try {
      const res = await apiFetch<{ id: string }>("/api/v1/appointments", {
        method: "POST",
        body: JSON.stringify({ branchId, serviceId: selectedService, scheduledAt: selectedSlot }),
      });
      setAppointmentId(res.id);
      setStep("done");
    } catch (e: any) {
      setError(e?.code === "appointment.slot_taken" ? t("slot_taken") : e?.message ?? "Booking failed");
      setConfirming(false);
    }
  }

  const dateOptions = Array.from({ length: 10 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return isoDate(d);
  });

  if (!branch) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.5)", fontSize: 13 }}>
        {error ?? "Loading…"}
      </div>
    );
  }

  const tgStyle: React.CSSProperties = {
    background: "#0f1117", minHeight: "100svh", color: "#fff", padding: 16,
    fontFamily: "var(--font-sans)", display: "flex", flexDirection: "column", gap: 14,
  };

  return (
    <div style={tgStyle}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={() => router.back()} style={{
          background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 10,
          width: 34, height: 34, display: "grid", placeItems: "center",
          color: "#fff", cursor: "pointer", flex: "none",
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m15 18-6-6 6-6"/>
          </svg>
        </button>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{t("book_later")}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{branch.name}</div>
        </div>
      </div>

      {/* Step label */}
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-mono)",
        textTransform: "uppercase", letterSpacing: 0.6 }}>
        {step === "date" ? t("pick_date") : step === "service" ? t("pick_service") :
          step === "slot" ? t("pick_slot") : t("confirm")}
      </div>

      {/* Step: date */}
      {step === "date" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
            {dateOptions.map((d) => {
              const date = new Date(d + "T00:00:00");
              const isSelected = d === selectedDate;
              return (
                <button key={d} onClick={() => setSelectedDate(d)} style={{
                  padding: "10px 4px", borderRadius: 12,
                  border: `1.5px solid ${isSelected ? "rgba(99,102,241,0.8)" : "rgba(255,255,255,0.1)"}`,
                  background: isSelected ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.04)",
                  color: "#fff", cursor: "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                }}>
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.4)" }}>
                    {date.toLocaleDateString("en-GB", { weekday: "short" })}
                  </span>
                  <span style={{ fontSize: 16, fontWeight: 600 }}>{date.getDate()}</span>
                </button>
              );
            })}
          </div>
          <button onClick={() => setStep("service")} style={{
            padding: "13px 0", borderRadius: 14, border: "none",
            background: "linear-gradient(135deg, var(--color-primary) 0%, var(--color-violet) 100%)",
            color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer",
          }}>
            {t("pick_service")} →
          </button>
        </div>
      )}

      {/* Step: service */}
      {step === "service" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {branch.services.map((svc) => {
            const isSelected = selectedService === svc.id;
            return (
              <button key={svc.id} onClick={() => setSelectedService(svc.id)} style={{
                padding: "14px 16px", borderRadius: 12,
                border: `1.5px solid ${isSelected ? "rgba(99,102,241,0.8)" : "rgba(255,255,255,0.1)"}`,
                background: isSelected ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.04)",
                textAlign: "left", cursor: "pointer", color: "#fff",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{svc.name}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
                    ~{Math.round(svc.avgDurationS / 60)} min
                  </div>
                </div>
                {isSelected && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </button>
            );
          })}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setStep("date")} style={{
              flex: 1, padding: "13px 0", borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)",
              color: "#fff", fontSize: 14, cursor: "pointer",
            }}>←</button>
            <button onClick={() => { setStep("slot"); loadSlots(selectedDate, selectedService!); }}
              disabled={!selectedService} style={{
                flex: 4, padding: "13px 0", borderRadius: 12, border: "none",
                background: selectedService
                  ? "linear-gradient(135deg, var(--color-primary) 0%, var(--color-violet) 100%)"
                  : "rgba(255,255,255,0.1)",
                color: "#fff", fontSize: 15, fontWeight: 600, cursor: selectedService ? "pointer" : "not-allowed",
              }}>
              {t("pick_slot")} →
            </button>
          </div>
        </div>
      )}

      {/* Step: slot */}
      {step === "slot" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {loadingSlots ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
              Loading…
            </div>
          ) : slots.filter(s => s.available).length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>{t("no_slots")}</div>
              <button onClick={() => setStep("date")} style={{
                marginTop: 12, padding: "10px 20px", borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)",
                color: "#fff", fontSize: 13, cursor: "pointer",
              }}>{t("pick_date")}</button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
              {slots.map((slot) => {
                const isSelected = selectedSlot === slot.time;
                return (
                  <button key={slot.time} onClick={() => slot.available && setSelectedSlot(slot.time)}
                    disabled={!slot.available} style={{
                      padding: "10px 4px", borderRadius: 10,
                      border: `1.5px solid ${isSelected ? "rgba(99,102,241,0.8)" : "rgba(255,255,255,0.1)"}`,
                      background: !slot.available ? "rgba(255,255,255,0.02)" :
                        isSelected ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.04)",
                      color: !slot.available ? "rgba(255,255,255,0.2)" : "#fff",
                      fontSize: 12, fontWeight: 500, cursor: slot.available ? "pointer" : "not-allowed",
                      fontFamily: "var(--font-mono)",
                      textDecoration: !slot.available ? "line-through" : "none",
                    }}>
                    {fmtSlotTime(slot.time)}
                  </button>
                );
              })}
            </div>
          )}

          {error && (
            <div style={{ fontSize: 12, color: "#f87171", padding: "8px 12px",
              borderRadius: 8, background: "rgba(239,68,68,0.1)" }}>{error}</div>
          )}

          {!loadingSlots && (
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setStep("service")} style={{
                flex: 1, padding: "13px 0", borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)",
                color: "#fff", fontSize: 14, cursor: "pointer",
              }}>←</button>
              <button onClick={confirm} disabled={!selectedSlot || confirming} style={{
                flex: 4, padding: "13px 0", borderRadius: 12, border: "none",
                background: selectedSlot && !confirming
                  ? "linear-gradient(135deg, var(--color-primary) 0%, var(--color-violet) 100%)"
                  : "rgba(255,255,255,0.1)",
                color: "#fff", fontSize: 15, fontWeight: 600,
                cursor: selectedSlot && !confirming ? "pointer" : "not-allowed",
              }}>
                {confirming ? t("confirming") : t("confirm")}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Done */}
      {step === "done" && (
        <div style={{ textAlign: "center", padding: "20px 0", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: "rgba(16,185,129,0.15)", color: "#10b981",
            display: "grid", placeItems: "center", fontSize: 24, margin: "0 auto",
          }}>✓</div>
          <div style={{ fontSize: 17, fontWeight: 600 }}>Booked!</div>
          {selectedSlot && (
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
              {fmtSlotTime(selectedSlot)} on {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long" })}
            </div>
          )}
          <button onClick={() => router.push("/tg" as any)} style={{
            padding: "13px 0", borderRadius: 14, border: "none",
            background: "linear-gradient(135deg, var(--color-primary) 0%, var(--color-violet) 100%)",
            color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
          }}>
            Back to home
          </button>
        </div>
      )}
    </div>
  );
}
