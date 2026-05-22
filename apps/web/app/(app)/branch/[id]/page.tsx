"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { apiFetch } from "@/lib/api";
import { ApiError } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { useUiStore } from "@/stores/ui";
import { BranchDetail, Ticket, branchLoadLevel, estimateWaitMin } from "@/lib/types";

const ACTIVE = new Set(["waiting", "called", "serving"]);

export default function BranchPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const t = useTranslations("branch");
  const { userId, _hydrated } = useAuthStore();
  const { setCurrentOrg, clearCurrentOrg } = useUiStore();
  const [branch, setBranch] = useState<BranchDetail | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [existingTicket, setExistingTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auth gate — wait for hydration before redirecting
  useEffect(() => {
    if (!_hydrated) return;
    if (userId === null) {
      router.replace(`/sign-in?redirect=/branch/${id}`);
    }
  }, [userId, _hydrated, id]);

  useEffect(() => {
    if (!_hydrated || userId === null) return;
    Promise.all([
      apiFetch<BranchDetail>(`/api/v1/branches/${id}`),
      apiFetch<Ticket[]>("/api/v1/tickets/my").catch(() => [] as Ticket[]),
    ]).then(([b, myTickets]) => {
      setBranch(b);
      if (b.services.length > 0) setSelected(b.services[0]!.id);
      const active = myTickets.find((t) => t.branchId === id && ACTIVE.has(t.status));
      if (active) setExistingTicket(active);
      if (b.organizationId) setCurrentOrg(b.organizationId, b.orgName ?? b.name);
    }).catch(() => setError("Branch not found"))
      .finally(() => setLoading(false));
    return () => clearCurrentOrg();
  }, [id, userId]);

  async function joinQueue() {
    if (!branch || !selected) return;
    setJoining(true);
    setError(null);
    try {
      const svc = branch.services.find((s) => s.id === selected)!;
      const ticket = await apiFetch<{ id: string; number: string }>("/api/v1/tickets", {
        method: "POST",
        body: JSON.stringify({
          branchId: branch.id,
          serviceId: selected,
          serviceCode: svc.code,
          source: "remote",
          branchCapacity: branch.capacity,
        }),
      });
      router.push(`/ticket/${ticket.id}`);
    } catch (e: any) {
      if (e instanceof ApiError && e.code === "queue.active_ticket_exists") {
        // Find the existing ticket and redirect to it
        try {
          const myTickets = await apiFetch<Ticket[]>("/api/v1/tickets/my");
          const active = myTickets.find((tk) => tk.branchId === id && ACTIVE.has(tk.status));
          if (active) { router.push(`/ticket/${active.id}`); return; }
        } catch {}
      }
      setError(e.message ?? "Failed to join queue");
      setJoining(false);
    }
  }

  // Show spinner while store is hydrating or redirecting unauthenticated users
  if (!_hydrated || userId === null) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        minHeight: "100%", padding: 40,
      }}>
        <span style={{
          width: 28, height: 28, borderRadius: "50%",
          border: "3px solid var(--color-border)",
          borderTopColor: "var(--color-primary)",
          animation: "spin 0.8s linear infinite",
          display: "block",
        }}/>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ height: 80, borderRadius: 12, background: "var(--color-surface)",
            border: "1px solid var(--color-border)" }}/>
        ))}
      </div>
    );
  }

  if (error || !branch) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <div style={{ fontSize: 14, color: "var(--color-danger)" }}>{error ?? t("not_found")}</div>
        <button onClick={() => router.back()} style={{ marginTop: 14, padding: "8px 16px",
          borderRadius: 10, border: "1px solid var(--color-border)", background: "transparent",
          color: "var(--color-fg)", cursor: "pointer" }}>{t("go_back")}</button>
      </div>
    );
  }

  const openWindows = branch.windows.filter((w) => w.status === "open").length;
  const load = branchLoadLevel(branch.activeTickets, openWindows);
  const avgS = branch.services.find((s) => s.id === selected)?.avgDurationS ?? 300;
  const occ = Math.min(100, Math.round((branch.activeTickets / Math.max(1, openWindows)) * 25));

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
      {/* Header — full width within the 480px column */}
      <div style={{
        padding: "12px 16px 14px",
        borderBottom: "1px solid var(--color-hairline)",
        background: "var(--color-bg)",
        position: "sticky", top: 0, zIndex: 5,
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <button onClick={() => router.back()} style={{
          width: 34, height: 34, borderRadius: 10,
          background: "var(--color-surface)", border: "1px solid var(--color-border)",
          display: "grid", placeItems: "center", color: "var(--color-fg)", cursor: "pointer",
          flex: "none",
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m15 18-6-6 6-6"/>
          </svg>
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: -0.3, whiteSpace: "nowrap",
            overflow: "hidden", textOverflow: "ellipsis" }}>{branch.name}</div>
          <div style={{ fontSize: 11.5, color: "var(--color-fg-3)", marginTop: 1 }}>
            {branch.address ?? "Tashkent"}
          </div>
        </div>
      </div>

      {/* Content column — max 480px centered */}
      <div style={{ maxWidth: 480, margin: "0 auto", width: "100%" }}>
        <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
          {/* Occupancy card */}
          <div style={{
            background: "var(--color-surface)", border: "1px solid var(--color-border)",
            borderRadius: 14, padding: 14, display: "flex", flexDirection: "column", gap: 10,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-fg-3)",
                textTransform: "uppercase", letterSpacing: 0.6, fontFamily: "var(--font-mono)" }}>
                {t("occupancy")}
              </div>
              <span style={{
                display: "flex", alignItems: "center", gap: 4,
                fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 999,
                background: "var(--color-success-soft)", color: "var(--color-success)",
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%",
                  background: "var(--color-success)", flex: "none" }}/>
                {t("live")}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontSize: 32, fontWeight: 600, letterSpacing: -1,
                fontVariantNumeric: "tabular-nums" }}>{occ}%</span>
              <span style={{ fontSize: 12, color: "var(--color-fg-3)" }}>
                {t("people_windows", { people: branch.activeTickets, windows: openWindows })}
              </span>
            </div>
            <div style={{ display: "flex", gap: 2, height: 6, borderRadius: 3, overflow: "hidden" }}>
              {branch.windows.map((w) => (
                <div key={w.id} style={{
                  flex: 1,
                  background: w.status === "open"
                    ? (w.servingTicket ? "var(--color-success)" : "var(--color-success-soft)")
                    : "var(--color-surface-3)",
                }}/>
              ))}
            </div>
          </div>

          {/* Already in queue banner */}
          {existingTicket && (
            <div style={{
              background: "var(--color-primary-soft)", border: "1.5px solid var(--color-primary)",
              borderRadius: 14, padding: 14,
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
            }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-primary)",
                  textTransform: "uppercase", letterSpacing: 0.5, fontFamily: "var(--font-mono)",
                  marginBottom: 3 }}>
                  {t("in_queue_already")}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-fg)",
                  fontFamily: "var(--font-mono)" }}>
                  {existingTicket.number}
                </div>
                <div style={{ fontSize: 12, color: "var(--color-fg-2)", marginTop: 2 }}>
                  {t("status_label")}: {existingTicket.status}
                  {existingTicket.queuePosition != null && ` · ${t("people_ahead", { count: existingTicket.queuePosition })}`}
                </div>
              </div>
              <button
                onClick={() => router.push(`/ticket/${existingTicket.id}`)}
                style={{
                  padding: "10px 16px", borderRadius: 10, border: "none",
                  background: "var(--color-primary)", color: "#fff",
                  fontSize: 13, fontWeight: 600, cursor: "pointer", flex: "none",
                }}
              >
                {t("view_ticket")}
              </button>
            </div>
          )}

          {/* Service picker */}
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-fg-3)",
            textTransform: "uppercase", letterSpacing: 0.6, fontFamily: "var(--font-mono)" }}>
            {t("choose_service")}
          </div>
          {branch.services.filter((s) => s.active).map((svc) => {
            const sel = svc.id === selected;
            const waitMin = estimateWaitMin(branch.activeTickets, svc.avgDurationS, openWindows);
            return (
              <div key={svc.id} onClick={() => setSelected(svc.id)} style={{
                display: "flex", alignItems: "center", gap: 12, padding: 14,
                background: "var(--color-surface)",
                border: `1.5px solid ${sel ? "var(--color-primary)" : "var(--color-border)"}`,
                borderRadius: 12,
                boxShadow: sel ? "0 0 0 3px var(--color-primary-soft)" : "none",
                cursor: "pointer", transition: "border-color 0.15s",
              }}>
                <div style={{
                  width: 20, height: 20, borderRadius: "50%", flex: "none",
                  border: `2px solid ${sel ? "var(--color-primary)" : "var(--color-border-2)"}`,
                  background: sel ? "var(--color-primary)" : "transparent",
                  display: "grid", placeItems: "center", transition: "all 0.15s",
                }}>
                  {sel && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>
                    <span style={{ fontFamily: "var(--font-mono)", color: "var(--color-fg-3)",
                      fontSize: 12, marginRight: 4 }}>{svc.code}-</span>
                    {svc.name}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--color-fg-3)", marginTop: 2 }}>
                    {t("min_per_customer", { min: Math.round(svc.avgDurationS / 60) })} · {t("min_wait", { wait: waitMin })}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Notification nudge */}
          <div style={{
            background: "var(--color-primary-soft)", borderRadius: 12, padding: 12,
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.5">
              <path d="M12 2a10 10 0 100 20A10 10 0 0012 2z"/><path d="M12 6v6l4 2"/>
            </svg>
            <div style={{ flex: 1, fontSize: 12, color: "var(--color-primary)" }}>
              {t("notification_nudge")}
            </div>
          </div>

          {error && (
            <div style={{ fontSize: 13, color: "var(--color-danger)",
              padding: "10px 14px", borderRadius: 10,
              background: "var(--color-danger-soft)" }}>{error}</div>
          )}

          {/* CTA */}
          {existingTicket ? (
            <button
              onClick={() => router.push(`/ticket/${existingTicket.id}`)}
              style={{
                padding: "14px 0", borderRadius: 14, border: "none",
                background: "var(--color-primary)", color: "#fff",
                fontSize: 15, fontWeight: 600, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                marginTop: 4,
              }}
            >
              {t("track_ticket")}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          ) : (
            <>
              <button
                onClick={joinQueue}
                disabled={!selected || joining}
                style={{
                  padding: "14px 0", borderRadius: 14, border: "none",
                  background: joining ? "var(--color-fg-4)" : "var(--color-primary)",
                  color: "#fff", fontSize: 15, fontWeight: 600, cursor: joining ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  marginTop: 4,
                }}
              >
                {joining ? t("joining") : t("take_ticket")}
                {!joining && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                )}
              </button>
              <button
                onClick={() => router.push(`/book/${id}` as any)}
                style={{
                  padding: "12px 0", borderRadius: 14,
                  border: "1px solid var(--color-border)", background: "var(--color-surface)",
                  color: "var(--color-fg-2)", fontSize: 14, fontWeight: 500, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                Book for later
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
