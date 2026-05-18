"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { BranchDetail, Service } from "@/lib/types";

const IDLE_RESET_MS = 18_000;

function printTicket(number: string, serviceName: string, branchName: string) {
  const w = window.open("", "_blank", "width=320,height=480");
  if (!w) return;
  const ts = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  w.document.write(`<!DOCTYPE html><html><head><title>Ticket ${number}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: "Courier New", monospace; text-align:center; padding:24px 20px; background:#fff; color:#000; }
  .brand { font-size:22px; font-weight:900; letter-spacing:-0.5px; margin-bottom:4px; }
  .branch { font-size:13px; color:#555; margin-bottom:12px; }
  .dash { border-top:1px dashed #aaa; margin:10px 0; }
  .svc { font-size:14px; margin-bottom:8px; }
  .num { font-size:88px; font-weight:700; line-height:1; letter-spacing:-4px; margin:8px 0; }
  .ts { font-size:11px; color:#888; margin-top:12px; }
</style></head><body>
<div class="brand">zeyvo</div>
<div class="branch">${branchName}</div>
<div class="dash"></div>
<div class="svc">${serviceName}</div>
<div class="num">${number}</div>
<div class="dash"></div>
<div class="ts">${ts}</div>
<script>window.focus(); window.print(); window.onafterprint = () => window.close();</script>
</body></html>`);
  w.document.close();
}

export default function KioskPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const [branch, setBranch] = useState<BranchDetail | null>(null);
  const [screen, setScreen] = useState<"idle" | "services" | "confirm" | "done">("idle");
  const [selected, setSelected] = useState<Service | null>(null);
  const [ticketNumber, setTicketNumber] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [queueDepth, setQueueDepth] = useState<number | null>(null);
  const idleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function resetIdle() {
    if (idleRef.current) clearTimeout(idleRef.current);
    idleRef.current = setTimeout(() => {
      setScreen("idle");
      setSelected(null);
      setTicketNumber(null);
      setQueueDepth(null);
    }, IDLE_RESET_MS);
  }

  function touch() { resetIdle(); }

  useEffect(() => {
    apiFetch<BranchDetail>(`/api/v1/branches/${branchId}`).then(setBranch).catch(() => {});
    return () => { if (idleRef.current) clearTimeout(idleRef.current); };
  }, [branchId]);

  function selectService(svc: Service) {
    touch();
    setSelected(svc);
    setScreen("confirm");
    // Load live queue depth for this service
    apiFetch<{ id: string }[]>(`/api/v1/tickets?branchId=${branchId}`)
      .then((tickets) => setQueueDepth(tickets.length))
      .catch(() => {});
  }

  async function takeTicket() {
    if (!branch || !selected || joining) return;
    setJoining(true);
    try {
      const t = await apiFetch<{ id: string; number: string }>("/api/v1/tickets", {
        method: "POST",
        body: JSON.stringify({
          branchId: branch.id,
          serviceId: selected.id,
          serviceCode: selected.code,
          source: "kiosk",
          branchCapacity: branch.capacity,
        }),
      });
      setTicketNumber(t.number);
      setScreen("done");
      resetIdle();
    } catch {
      setJoining(false);
    }
  }

  const btn = (label: string, onClick: () => void, variant: "primary" | "ghost" = "primary") => (
    <button
      onClick={() => { touch(); onClick(); }}
      style={{
        minHeight: 64, padding: "0 32px", borderRadius: 16,
        border: variant === "ghost" ? "2px solid var(--color-border-2)" : "none",
        background: variant === "ghost" ? "transparent" : "var(--color-primary)",
        color: variant === "ghost" ? "var(--color-fg-2)" : "#fff",
        fontSize: 20, fontWeight: 600, cursor: "pointer",
        width: "100%",
      }}
    >
      {label}
    </button>
  );

  return (
    <div
      onClick={touch}
      style={{
        width: "100vw", height: "100vh",
        background: "var(--color-bg)", color: "var(--color-fg)",
        fontFamily: "var(--font-sans)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        userSelect: "none",
      }}
    >
      {/* Idle screen */}
      {screen === "idle" && (
        <div style={{ textAlign: "center", maxWidth: 480 }}>
          <div style={{ fontSize: 64, fontWeight: 700, letterSpacing: -2.5,
            color: "var(--color-primary)", marginBottom: 8 }}>zeyvo</div>
          <div style={{ fontSize: 22, color: "var(--color-fg-2)", marginBottom: 8 }}>
            {branch?.name ?? "Welcome"}
          </div>
          <div style={{ fontSize: 16, color: "var(--color-fg-3)", marginBottom: 48 }}>
            {branch?.address ?? ""}
          </div>
          {branch && branch.activeTickets > 0 && (
            <div style={{
              fontSize: 14, color: "var(--color-fg-3)", marginBottom: 24,
              background: "var(--color-surface)", borderRadius: 10, padding: "8px 16px",
              display: "inline-block",
            }}>
              {branch.activeTickets} in queue now
            </div>
          )}
          <button
            onClick={() => { setScreen("services"); resetIdle(); }}
            style={{
              minHeight: 72, padding: "0 48px", borderRadius: 20, border: "none",
              background: "var(--color-primary)", color: "#fff",
              fontSize: 22, fontWeight: 700, cursor: "pointer",
              boxShadow: "0 8px 32px var(--color-primary-soft)",
              display: "block", marginLeft: "auto", marginRight: "auto",
            }}
          >
            Take a ticket →
          </button>
        </div>
      )}

      {/* Service picker */}
      {screen === "services" && branch && (
        <div style={{ width: "100%", maxWidth: 560, padding: "0 32px" }}>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.8, marginBottom: 8 }}>
            Choose service
          </div>
          <div style={{ fontSize: 16, color: "var(--color-fg-3)", marginBottom: 32 }}>
            {branch.name}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
            {branch.services.filter((s) => s.active).map((svc) => (
              <button
                key={svc.id}
                onClick={() => selectService(svc)}
                style={{
                  minHeight: 72, padding: "0 24px", borderRadius: 16,
                  background: "var(--color-surface)",
                  border: "1.5px solid var(--color-border)",
                  display: "flex", alignItems: "center", gap: 16,
                  cursor: "pointer", textAlign: "left",
                }}
              >
                <div style={{
                  width: 48, height: 48, borderRadius: 12, flex: "none",
                  background: "var(--color-primary-soft)", color: "var(--color-primary)",
                  display: "grid", placeItems: "center",
                  fontSize: 20, fontWeight: 700, fontFamily: "var(--font-mono)",
                }}>{svc.code}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 18, fontWeight: 600, color: "var(--color-fg)" }}>
                    {svc.name}
                  </div>
                  <div style={{ fontSize: 14, color: "var(--color-fg-3)", marginTop: 2 }}>
                    ~{Math.round(svc.avgDurationS / 60)} min per customer
                  </div>
                </div>
                <span style={{ fontSize: 22, color: "var(--color-fg-3)" }}>›</span>
              </button>
            ))}
          </div>
          {btn("← Back", () => setScreen("idle"), "ghost")}
        </div>
      )}

      {/* Confirm */}
      {screen === "confirm" && selected && (
        <div style={{ textAlign: "center", maxWidth: 480, padding: "0 32px" }}>
          <div style={{ fontSize: 20, color: "var(--color-fg-3)", marginBottom: 8 }}>
            You selected
          </div>
          <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: -1, marginBottom: 4 }}>
            {selected.name}
          </div>
          <div style={{ fontSize: 16, color: "var(--color-fg-3)", marginBottom: 12 }}>
            ~{Math.round(selected.avgDurationS / 60)} min per customer
          </div>
          {queueDepth !== null && (
            <div style={{
              fontSize: 14, fontWeight: 600,
              color: queueDepth < 5 ? "var(--color-success)" : queueDepth < 15 ? "var(--color-warning)" : "var(--color-danger)",
              background: "var(--color-surface-2)", borderRadius: 8,
              padding: "6px 14px", display: "inline-block", marginBottom: 32,
            }}>
              {queueDepth === 0 ? "No wait — go right in!" : `${queueDepth} ${queueDepth === 1 ? "person" : "people"} ahead`}
            </div>
          )}
          {queueDepth === null && <div style={{ marginBottom: 32 }}/>}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button
              onClick={() => { touch(); takeTicket(); }}
              disabled={joining}
              style={{
                minHeight: 72, padding: "0 32px", borderRadius: 18, border: "none",
                background: joining ? "var(--color-fg-4)" : "var(--color-primary)",
                color: "#fff", fontSize: 22, fontWeight: 700,
                cursor: joining ? "not-allowed" : "pointer",
              }}
            >
              {joining ? "Getting ticket…" : "Get my ticket"}
            </button>
            {btn("← Go back", () => setScreen("services"), "ghost")}
          </div>
        </div>
      )}

      {/* Done */}
      {screen === "done" && ticketNumber && selected && branch && (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 18, color: "var(--color-fg-3)", marginBottom: 12 }}>Your ticket</div>
          <div style={{
            fontSize: 128, fontWeight: 500, letterSpacing: -6, lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
            color: "var(--color-primary)",
          }}>{ticketNumber}</div>
          <div style={{ fontSize: 18, color: "var(--color-fg-3)", marginTop: 16 }}>
            Please wait to be called
          </div>
          <div style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 12, maxWidth: 320, marginLeft: "auto", marginRight: "auto" }}>
            <button
              onClick={() => { touch(); printTicket(ticketNumber, selected.name, branch.name); }}
              style={{
                minHeight: 64, padding: "0 32px", borderRadius: 16,
                background: "var(--color-surface)", color: "var(--color-fg-2)",
                fontSize: 18, fontWeight: 600, cursor: "pointer",
                border: "2px solid var(--color-border)",
              }}
            >
              🖨 Print receipt
            </button>
            {btn("Done", () => { setScreen("idle"); setTicketNumber(null); setSelected(null); setQueueDepth(null); })}
          </div>
        </div>
      )}
    </div>
  );
}
