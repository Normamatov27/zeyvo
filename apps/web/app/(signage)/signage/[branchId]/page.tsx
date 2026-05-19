"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetchAnon } from "@/lib/api";
import { BranchDetail, Ticket } from "@/lib/types";
import { getStompClient, subscribeBranchQueue } from "@/lib/realtime";

function playSignageAlert() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    // Two-tone chime: major third interval
    ([{ f: 523, d: 0 }, { f: 659, d: 0.25 }]).forEach(({ f, d }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = f;
      osc.type = "triangle";
      gain.gain.setValueAtTime(0.5, ctx.currentTime + d);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + d + 0.8);
      osc.start(ctx.currentTime + d);
      osc.stop(ctx.currentTime + d + 0.9);
    });
    ctx.close();
  } catch {}
}

export default function SignagePage() {
  const { branchId } = useParams<{ branchId: string }>();
  const [branch, setBranch] = useState<BranchDetail | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());
  const [time, setTime] = useState(new Date());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const subRef = useRef<{ unsubscribe: () => void } | null>(null);
  const prevServingIds = useRef<Set<string>>(new Set());

  function updateTickets(newTickets: Ticket[]) {
    const nowServing = newTickets.filter((t) => t.status === "serving" || t.status === "called");
    const nowIds = new Set(nowServing.map((t) => t.id));

    // Find tickets that just appeared in the serving list
    const newlyAdded = nowServing.filter((t) => !prevServingIds.current.has(t.id));
    if (newlyAdded.length > 0) {
      playSignageAlert();
      const addIds = new Set(newlyAdded.map((t) => t.id));
      setFlashIds((prev) => new Set([...prev, ...addIds]));
      // Remove flash class after animation
      setTimeout(() => {
        setFlashIds((prev) => {
          const next = new Set(prev);
          addIds.forEach((id) => next.delete(id));
          return next;
        });
      }, 3000);
    }

    prevServingIds.current = nowIds;
    setTickets(newTickets);
  }

  useEffect(() => {
    async function loadTickets() {
      try {
        const snap = await apiFetchAnon<{ tickets: Ticket[] }>(`/api/v1/signage/${branchId}`);
        updateTickets(snap?.tickets ?? []);
      } catch {}
    }

    async function load() {
      try {
        // /v1/signage/{branchId} is public and has everything needed
        const snap = await apiFetchAnon<{
          name: string; shortName?: string;
          tickets: Ticket[]; windows: { id: string; number: number; label: string | null; status: string }[];
          address?: string;
        }>(`/api/v1/signage/${branchId}`);
        setBranch({
          id: branchId,
          name: snap.name,
          windows: (snap.windows ?? []) as any,
        } as unknown as BranchDetail);
        const t = snap.tickets ?? [];
        // Initial load: don't flash existing serving tickets
        const serving = t.filter((tk) => tk.status === "serving" || tk.status === "called");
        prevServingIds.current = new Set(serving.map((tk) => tk.id));
        setTickets(t);
      } catch {}
    }
    load();

    const stomp = getStompClient();
    const connect = () => {
      subRef.current = subscribeBranchQueue(stomp, branchId, () => loadTickets());
    };
    if (stomp.connected) connect();
    else stomp.onConnect = connect;

    timerRef.current = setInterval(loadTickets, 20_000);
    const clock = setInterval(() => setTime(new Date()), 1_000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      clearInterval(clock);
      subRef.current?.unsubscribe();
    };
  }, [branchId]);

  const serving = tickets.filter((t) => t.status === "serving" || t.status === "called");
  const waiting = tickets.filter((t) => t.status === "waiting");
  const fmtTime = time.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  return (
    <div style={{
      width: "100vw", height: "100vh",
      background: "oklch(0.12 0.02 262)",
      color: "#fff", fontFamily: "var(--font-sans)",
      display: "flex", flexDirection: "column",
      overflow: "hidden",
    }}>
      <style>{`
        @keyframes flash-in {
          0%   { transform: scale(1.04); background: rgba(34,197,94,0.25); box-shadow: 0 0 0 3px rgba(34,197,94,0.5); }
          60%  { transform: scale(1.01); background: rgba(34,197,94,0.12); box-shadow: 0 0 0 2px rgba(34,197,94,0.3); }
          100% { transform: scale(1); background: rgba(255,255,255,0.06); box-shadow: none; }
        }
        .signage-flash { animation: flash-in 3s ease-out forwards; }
      `}</style>

      {/* Top bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "24px 48px",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.8,
            color: "oklch(0.7 0.16 262)" }}>zeyvo</div>
          <div style={{ fontSize: 16, opacity: 0.6, marginTop: 2 }}>
            {branch?.name ?? "Loading…"}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 48, fontWeight: 200, letterSpacing: -2,
            fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{fmtTime}</div>
          <div style={{ fontSize: 14, opacity: 0.5, marginTop: 4 }}>
            {time.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", gap: 0, overflow: "hidden" }}>
        {/* Now serving — left panel */}
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          padding: "40px 48px",
          borderRight: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, opacity: 0.5,
            textTransform: "uppercase", letterSpacing: 1.2,
            fontFamily: "var(--font-mono)", marginBottom: 32 }}>Now serving</div>

          {serving.length === 0 ? (
            <div style={{ flex: 1, display: "grid", placeItems: "center", opacity: 0.3 }}>
              <div style={{ fontSize: 24, fontWeight: 300 }}>Queue is clear</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {serving.slice(0, 6).map((t) => {
                const win = branch?.windows?.find((w) => w.id === t.windowId);
                const isFlashing = flashIds.has(t.id);
                const isCalled = t.status === "called";
                return (
                  <div
                    key={t.id}
                    className={isFlashing ? "signage-flash" : undefined}
                    style={{
                      display: "flex", alignItems: "center", gap: 24,
                      padding: "20px 28px", borderRadius: 16,
                      background: "rgba(255,255,255,0.06)",
                      border: `1px solid ${isCalled ? "rgba(34,197,94,0.5)" : "rgba(255,255,255,0.1)"}`,
                      transition: "border-color 0.3s",
                    }}
                  >
                    {/* Ticket number — big */}
                    <div style={{
                      fontSize: 68, fontWeight: 500, letterSpacing: -3,
                      fontVariantNumeric: "tabular-nums", lineHeight: 1,
                      color: isCalled ? "oklch(0.82 0.14 150)" : "rgba(255,255,255,0.85)",
                      minWidth: 180,
                    }}>{t.number}</div>

                    {/* Window info */}
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: 22, fontWeight: 600,
                        color: "rgba(255,255,255,0.9)",
                      }}>
                        Window {win?.number ?? "—"}
                      </div>
                      {win?.label && (
                        <div style={{ fontSize: 15, opacity: 0.5, marginTop: 4 }}>{win.label}</div>
                      )}
                    </div>

                    {/* Called indicator */}
                    {isCalled && (
                      <div style={{
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                        padding: "8px 16px", borderRadius: 10,
                        background: "rgba(34,197,94,0.15)",
                        border: "1px solid rgba(34,197,94,0.4)",
                      }}>
                        <div style={{ fontSize: 20 }}>🔔</div>
                        <div style={{ fontSize: 11, fontWeight: 600,
                          color: "oklch(0.82 0.14 150)", fontFamily: "var(--font-mono)",
                          textTransform: "uppercase", letterSpacing: 0.8 }}>
                          CALLED
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Queue — right panel */}
        <div style={{ width: 340, padding: "40px 32px", display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 14, fontWeight: 600, opacity: 0.5,
            textTransform: "uppercase", letterSpacing: 1.2,
            fontFamily: "var(--font-mono)", marginBottom: 24 }}>
            Waiting · {waiting.length}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, overflow: "hidden" }}>
            {waiting.slice(0, 12).map((t, i) => (
              <div key={t.id} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 16px", borderRadius: 10,
                background: i === 0 ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 6, flex: "none",
                  background: i === 0 ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.06)",
                  display: "grid", placeItems: "center",
                  fontSize: 12, fontWeight: 700, fontFamily: "var(--font-mono)",
                  color: i === 0 ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.4)",
                }}>{i + 1}</div>
                <div style={{
                  fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 600,
                  fontVariantNumeric: "tabular-nums",
                  color: i === 0 ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.7)",
                }}>{t.number}</div>
                <div style={{ flex: 1, fontSize: 11, opacity: 0.35, textAlign: "right",
                  fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {t.source === "kiosk" ? "kiosk" : t.source === "telegram" ? "tg" : "web"}
                </div>
              </div>
            ))}
            {waiting.length === 0 && (
              <div style={{ opacity: 0.3, fontSize: 15, textAlign: "center", paddingTop: 20 }}>
                No one waiting
              </div>
            )}
            {waiting.length > 12 && (
              <div style={{ fontSize: 13, opacity: 0.4, textAlign: "center",
                paddingTop: 8, fontFamily: "var(--font-mono)" }}>
                +{waiting.length - 12} more
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: "14px 48px",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ fontSize: 12, opacity: 0.35, fontFamily: "var(--font-mono)" }}>
          {branch?.address ?? ""} · Powered by zeyvo
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ fontSize: 12, opacity: 0.4, fontFamily: "var(--font-mono)" }}>
            {branch?.windows?.filter((w) => w.status === "open").length ?? 0} windows open
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 5,
            fontSize: 12, opacity: 0.5, fontFamily: "var(--font-mono)",
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%",
              background: "oklch(0.62 0.14 150)",
              animation: "ping 2s ease-in-out infinite" }}/>
            <style>{`@keyframes ping{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(1.5)}}`}</style>
            live
          </div>
        </div>
      </div>
    </div>
  );
}
