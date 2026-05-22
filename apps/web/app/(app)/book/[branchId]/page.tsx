"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { BranchDetail, SlotInfo, Provider } from "@/lib/types";

function fmtSlotTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function fmtDateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

type Step = "date" | "service" | "provider" | "slot" | "note" | "done";

export default function BookPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const router = useRouter();
  const t = useTranslations("appointments");
  const { userId, _hydrated } = useAuthStore();

  const [branch, setBranch] = useState<BranchDetail | null>(null);
  const [step, setStep] = useState<Step>("date");
  const [selectedDate, setSelectedDate] = useState(isoDate(new Date()));
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null); // null = any
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [patientNote, setPatientNote] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appointmentId, setAppointmentId] = useState<string | null>(null);

  useEffect(() => {
    if (!_hydrated) return;
    if (!userId) router.replace(`/sign-in?redirect=/book/${branchId}`);
  }, [_hydrated, userId, branchId]);

  useEffect(() => {
    apiFetch<BranchDetail>(`/api/v1/branches/${branchId}`)
      .then((b) => {
        setBranch(b);
        if (b.services.length > 0) setSelectedService(b.services[0]!.id);
      })
      .catch(() => setError("Branch not found"));
  }, [branchId]);

  async function loadProviders() {
    setLoadingProviders(true);
    try {
      const provs = await apiFetch<Provider[]>(`/api/v1/providers?branchId=${branchId}`);
      setProviders(provs);
    } catch {
      setProviders([]);
    } finally {
      setLoadingProviders(false);
    }
  }

  async function loadSlots(date: string, serviceId: string, providerId: string | null) {
    setLoadingSlots(true);
    setSlots([]);
    setSelectedSlot(null);
    try {
      const url = `/api/v1/appointments/availability?branchId=${branchId}&date=${date}&serviceId=${serviceId}`
        + (providerId ? `&providerId=${providerId}` : "");
      const data = await apiFetch<SlotInfo[]>(url);
      setSlots(data);
    } catch {
      setError("Failed to load slots");
    } finally {
      setLoadingSlots(false);
    }
  }

  function goToProvider() {
    if (!selectedService) return;
    loadProviders();
    setStep("provider");
  }

  function goToSlots(providerId: string | null) {
    setSelectedProvider(providerId);
    setStep("slot");
    loadSlots(selectedDate, selectedService!, providerId);
  }

  async function confirm() {
    if (!selectedSlot || !selectedService) return;
    setConfirming(true);
    setError(null);
    try {
      const res = await apiFetch<{ id: string }>("/api/v1/appointments", {
        method: "POST",
        body: JSON.stringify({
          branchId,
          serviceId: selectedService,
          scheduledAt: selectedSlot,
          providerId: selectedProvider ?? undefined,
          patientNote: patientNote.trim() || undefined,
        }),
      });
      setAppointmentId(res.id);
      setStep("done");
    } catch (e: any) {
      const code = e?.code ?? "";
      setError(
        code === "appointment.slot_taken" ? t("slot_taken") :
        code === "appointment.slot_in_past" ? "Please pick a future slot." :
        e?.message ?? "Booking failed"
      );
      setConfirming(false);
    }
  }

  const dateOptions = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i); return isoDate(d);
  });

  const stepLabel: Record<Step, string> = {
    date: t("pick_date"),
    service: t("pick_service"),
    provider: "Choose doctor (optional)",
    slot: t("pick_slot"),
    note: "Add a note",
    done: t("confirm"),
  };

  if (!branch) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--color-fg-3)" }}>
        {error ?? t("loading")}
      </div>
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div>
        <button onClick={() => router.back()} style={{
          background: "none", border: "none", padding: 0, cursor: "pointer",
          color: "var(--color-fg-3)", fontSize: 13, marginBottom: 10, display: "flex", alignItems: "center", gap: 4,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m15 18-6-6 6-6"/>
          </svg>
          {branch.name}
        </button>
        <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: -0.4 }}>{t("book_later")}</div>
        <div style={{ fontSize: 12, color: "var(--color-fg-3)", marginTop: 3 }}>{stepLabel[step]}</div>
      </div>

      {/* Step indicator */}
      {step !== "done" && (
        <div style={{ display: "flex", gap: 4 }}>
          {(["date", "service", "provider", "slot", "note"] as Step[]).map((s) => (
            <div key={s} style={{
              flex: 1, height: 3, borderRadius: 2,
              background: s === step ? "var(--color-primary)"
                : ["date", "service", "provider", "slot", "note"].indexOf(s) < ["date", "service", "provider", "slot", "note"].indexOf(step)
                ? "var(--color-primary)"
                : "var(--color-surface-3)",
              opacity: s === step ? 1 : 0.4,
            }}/>
          ))}
        </div>
      )}

      {/* Step: date */}
      {step === "date" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
            {dateOptions.map((d) => {
              const date = new Date(d + "T00:00:00");
              const isSelected = d === selectedDate;
              return (
                <button key={d} onClick={() => setSelectedDate(d)} style={{
                  padding: "8px 4px", borderRadius: 10, border: "none",
                  background: isSelected ? "var(--color-primary)" : "var(--color-surface)",
                  color: isSelected ? "#fff" : "var(--color-fg)",
                  cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                }}>
                  <span style={{ fontSize: 10, opacity: 0.7 }}>
                    {date.toLocaleDateString("en-GB", { weekday: "short" })}
                  </span>
                  <span style={{ fontSize: 15, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                    {date.getDate()}
                  </span>
                </button>
              );
            })}
          </div>
          <div style={{ fontSize: 13, color: "var(--color-fg-2)", textAlign: "center" }}>
            {fmtDateLabel(selectedDate + "T12:00:00")}
          </div>
          <button onClick={() => setStep("service")} style={{
            padding: "13px 0", borderRadius: 12, border: "none",
            background: "var(--color-primary)", color: "#fff",
            fontSize: 15, fontWeight: 600, cursor: "pointer",
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
                padding: "14px 16px", borderRadius: 12, cursor: "pointer",
                border: `1.5px solid ${isSelected ? "var(--color-primary)" : "var(--color-border)"}`,
                background: isSelected ? "var(--color-primary-soft)" : "var(--color-surface)",
                textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{svc.name}</div>
                  <div style={{ fontSize: 12, color: "var(--color-fg-3)", marginTop: 2 }}>
                    ~{Math.round(svc.avgDurationS / 60)} min
                  </div>
                </div>
                {isSelected && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </button>
            );
          })}
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button onClick={() => setStep("date")} style={{
              flex: 1, padding: "13px 0", borderRadius: 12,
              border: "1px solid var(--color-border)", background: "var(--color-surface)",
              color: "var(--color-fg)", fontSize: 14, cursor: "pointer",
            }}>←</button>
            <button onClick={goToProvider} disabled={!selectedService} style={{
              flex: 4, padding: "13px 0", borderRadius: 12, border: "none",
              background: selectedService ? "var(--color-primary)" : "var(--color-fg-4)",
              color: "#fff", fontSize: 15, fontWeight: 600, cursor: selectedService ? "pointer" : "not-allowed",
            }}>
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Step: provider */}
      {step === "provider" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {loadingProviders ? (
            <div style={{ textAlign: "center", padding: 24, color: "var(--color-fg-3)", fontSize: 13 }}>
              Loading providers…
            </div>
          ) : (
            <>
              {/* Any available option */}
              <button onClick={() => goToSlots(null)} style={{
                padding: "14px 16px", borderRadius: 12, cursor: "pointer",
                border: "1.5px solid var(--color-border)",
                background: "var(--color-surface)",
                textAlign: "left", display: "flex", alignItems: "center", gap: 14,
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10, flex: "none",
                  background: "var(--color-surface-3)", color: "var(--color-fg-3)",
                  display: "grid", placeItems: "center", fontSize: 18,
                }}>?</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>Any available</div>
                  <div style={{ fontSize: 12, color: "var(--color-fg-3)", marginTop: 1 }}>
                    Pick from all open slots
                  </div>
                </div>
              </button>

              {providers.map((p) => (
                <button key={p.id} onClick={() => goToSlots(p.id)} style={{
                  padding: "14px 16px", borderRadius: 12, cursor: "pointer",
                  border: "1.5px solid var(--color-border)",
                  background: "var(--color-surface)",
                  textAlign: "left", display: "flex", alignItems: "center", gap: 14,
                }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 10, flex: "none",
                    background: "var(--color-primary-soft)", color: "var(--color-primary)",
                    display: "grid", placeItems: "center",
                    fontSize: 16, fontWeight: 700,
                  }}>
                    {p.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{p.fullName}</div>
                    {p.specialty && (
                      <div style={{ fontSize: 12, color: "var(--color-fg-3)", marginTop: 1 }}>{p.specialty}</div>
                    )}
                  </div>
                </button>
              ))}
            </>
          )}

          <button onClick={() => setStep("service")} style={{
            padding: "12px 0", borderRadius: 12,
            border: "1px solid var(--color-border)", background: "var(--color-surface)",
            color: "var(--color-fg)", fontSize: 14, cursor: "pointer", marginTop: 4,
          }}>← Back</button>
        </div>
      )}

      {/* Step: slot */}
      {step === "slot" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {selectedProvider && (
            <div style={{ fontSize: 12, color: "var(--color-fg-3)", fontFamily: "var(--font-mono)" }}>
              {providers.find((p) => p.id === selectedProvider)?.fullName ?? ""}
            </div>
          )}

          {loadingSlots ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: "var(--color-fg-3)", fontSize: 13 }}>
              {t("loading_slots")}
            </div>
          ) : slots.filter(s => s.available).length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <div style={{ fontSize: 13, color: "var(--color-fg-3)" }}>{t("no_slots")}</div>
              <button onClick={() => setStep("provider")} style={{
                marginTop: 12, padding: "10px 20px", borderRadius: 10,
                border: "1px solid var(--color-border)", background: "var(--color-surface)",
                color: "var(--color-fg)", fontSize: 13, cursor: "pointer",
              }}>
                Choose another provider
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
              {slots.map((slot) => {
                const isSelected = selectedSlot === slot.time;
                return (
                  <button key={slot.time} onClick={() => slot.available && setSelectedSlot(slot.time)}
                    disabled={!slot.available} style={{
                      padding: "10px 4px", borderRadius: 10,
                      border: `1.5px solid ${isSelected ? "var(--color-primary)" : "var(--color-border)"}`,
                      background: !slot.available ? "var(--color-surface-2)" :
                        isSelected ? "var(--color-primary-soft)" : "var(--color-surface)",
                      color: !slot.available ? "var(--color-fg-4)" :
                        isSelected ? "var(--color-primary)" : "var(--color-fg)",
                      fontSize: 13, fontWeight: 500, cursor: slot.available ? "pointer" : "not-allowed",
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
            <div style={{ fontSize: 12, color: "var(--color-danger)", padding: "8px 12px",
              borderRadius: 8, background: "var(--color-danger-soft)" }}>
              {error}
            </div>
          )}

          {!loadingSlots && (
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setStep("provider")} style={{
                flex: 1, padding: "13px 0", borderRadius: 12,
                border: "1px solid var(--color-border)", background: "var(--color-surface)",
                color: "var(--color-fg)", fontSize: 14, cursor: "pointer",
              }}>←</button>
              <button onClick={() => setStep("note")} disabled={!selectedSlot} style={{
                flex: 4, padding: "13px 0", borderRadius: 12, border: "none",
                background: selectedSlot ? "var(--color-primary)" : "var(--color-fg-4)",
                color: "#fff", fontSize: 15, fontWeight: 600,
                cursor: selectedSlot ? "pointer" : "not-allowed",
              }}>
                Next →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step: note */}
      {step === "note" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{
            background: "var(--color-surface)", border: "1px solid var(--color-border)",
            borderRadius: 14, padding: 16,
          }}>
            <div style={{ fontSize: 12, color: "var(--color-fg-3)", marginBottom: 8 }}>
              {fmtDateLabel(selectedDate + "T12:00:00")}
              {selectedSlot && ` at ${fmtSlotTime(selectedSlot)}`}
            </div>
            {selectedProvider && (
              <div style={{ fontSize: 13, color: "var(--color-fg-2)" }}>
                {providers.find((p) => p.id === selectedProvider)?.fullName}
              </div>
            )}
          </div>

          <div>
            <div style={{ fontSize: 12, color: "var(--color-fg-3)", marginBottom: 6 }}>
              Patient note (optional)
            </div>
            <textarea
              value={patientNote}
              onChange={(e) => setPatientNote(e.target.value)}
              placeholder="Describe your symptoms or reason for visit…"
              rows={3}
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 10,
                border: "1px solid var(--color-border)",
                background: "var(--color-surface-2)", color: "var(--color-fg)",
                fontSize: 13, resize: "vertical", boxSizing: "border-box",
              }}
            />
          </div>

          {error && (
            <div style={{ fontSize: 12, color: "var(--color-danger)", padding: "8px 12px",
              borderRadius: 8, background: "var(--color-danger-soft)" }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setStep("slot")} style={{
              flex: 1, padding: "13px 0", borderRadius: 12,
              border: "1px solid var(--color-border)", background: "var(--color-surface)",
              color: "var(--color-fg)", fontSize: 14, cursor: "pointer",
            }}>←</button>
            <button onClick={confirm} disabled={confirming} style={{
              flex: 4, padding: "13px 0", borderRadius: 12, border: "none",
              background: confirming ? "var(--color-fg-4)" : "var(--color-primary)",
              color: "#fff", fontSize: 15, fontWeight: 600,
              cursor: confirming ? "not-allowed" : "pointer",
            }}>
              {confirming ? t("confirming") : t("confirm")}
            </button>
          </div>
        </div>
      )}

      {/* Done */}
      {step === "done" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, textAlign: "center" }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: "var(--color-success-soft)", color: "var(--color-success)",
            display: "grid", placeItems: "center", fontSize: 24, margin: "0 auto",
          }}>✓</div>
          <div style={{ fontSize: 17, fontWeight: 600 }}>{t("booked_title")}</div>
          <div style={{ fontSize: 13, color: "var(--color-fg-3)" }}>
            {fmtDateLabel(selectedDate + "T12:00:00")}{selectedSlot ? ` at ${fmtSlotTime(selectedSlot)}` : ""}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button onClick={() => router.push(`/appointment/${appointmentId}` as any)} style={{
              flex: 1, padding: "13px 0", borderRadius: 12, border: "none",
              background: "var(--color-primary)", color: "#fff",
              fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}>
              {t("view_appointment")}
            </button>
            <button onClick={() => router.push("/branches" as any)} style={{
              flex: 1, padding: "13px 0", borderRadius: 12,
              border: "1px solid var(--color-border)", background: "var(--color-surface)",
              color: "var(--color-fg)", fontSize: 14, cursor: "pointer",
            }}>
              {t("done")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
