"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Ticket, fmtClock, fmtEta } from "@/lib/types";

const ACTIVE = new Set(["waiting", "called", "serving"]);

export default function TgTicketPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const load = () => apiFetch<Ticket>(`/api/v1/tickets/${id}`).then(setTicket).catch(() => {});
    load();
    pollRef.current = setInterval(load, 10_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [id]);

  useEffect(() => {
    if (ticket && !ACTIVE.has(ticket.status) && pollRef.current) {
      clearInterval(pollRef.current);
    }
  }, [ticket?.status]);

  if (!ticket) return (
    <div style={{ padding: 40, textAlign: "center", color: "var(--color-fg-3)" }}>Loading…</div>
  );

  const isServing = ticket.status === "serving" || ticket.status === "called";
  const isDone = !ACTIVE.has(ticket.status);

  return (
    <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{
        borderRadius: 20, padding: 24, color: "#fff",
        background: isDone
          ? "linear-gradient(135deg, var(--color-fg-3) 0%, var(--color-fg-4) 100%)"
          : isServing
          ? "linear-gradient(135deg, var(--color-success) 0%, var(--color-accent) 100%)"
          : "linear-gradient(135deg, var(--color-primary) 0%, var(--color-violet) 100%)",
      }}>
        <div style={{ fontSize: 11, opacity: 0.7, textTransform: "uppercase",
          letterSpacing: 0.8, fontFamily: "var(--font-mono)" }}>
          {isDone ? ticket.status : isServing ? "now serving · you" : "your ticket"}
        </div>
        <div style={{ fontSize: 72, fontWeight: 500, letterSpacing: -3, lineHeight: 1,
          fontVariantNumeric: "tabular-nums", marginTop: 8 }}>
          {ticket.number}
        </div>
        <div style={{ marginTop: 16, display: "flex", gap: 20,
          paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.2)" }}>
          <div>
            <div style={{ fontSize: 10, opacity: 0.6, textTransform: "uppercase",
              fontFamily: "var(--font-mono)" }}>status</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>
              {isServing ? "now" : ticket.status}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, opacity: 0.6, textTransform: "uppercase",
              fontFamily: "var(--font-mono)" }}>ETA</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>
              {fmtEta(ticket.etaMinutes)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, opacity: 0.6, textTransform: "uppercase",
              fontFamily: "var(--font-mono)" }}>joined</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>
              {fmtClock(ticket.joinedAt)}
            </div>
          </div>
        </div>
      </div>

      {isDone && (
        <button onClick={() => router.push("/tg")} style={{
          padding: "14px 0", borderRadius: 14, border: "none",
          background: "var(--color-primary)", color: "#fff",
          fontSize: 15, fontWeight: 600, cursor: "pointer",
        }}>
          Back to home
        </button>
      )}
    </div>
  );
}
