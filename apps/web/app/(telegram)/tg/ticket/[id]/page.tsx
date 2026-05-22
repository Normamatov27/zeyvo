"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { Ticket, fmtClock, fmtEta } from "@/lib/types";
import { FullPageLoader } from "@/components/Loader";

const ACTIVE = new Set(["waiting", "called", "serving"]);

export default function TgTicketPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = (initial: boolean) => apiFetch<Ticket>(`/api/v1/tickets/${id}`)
    .then((t) => { setTicket(t); setError(null); })
    .catch((e: unknown) => {
      // Only surface errors on the initial fetch — subsequent poll errors should be silent
      if (!initial) return;
      const msg = e instanceof ApiError
        ? (e.status === 404 ? "Ticket not found" : e.status === 401 || e.status === 403 ? "Please sign in to view this ticket" : "Couldn't load this ticket")
        : "Couldn't load this ticket";
      setError(msg);
    })
    .finally(() => { if (initial) setLoading(false); });

  useEffect(() => {
    load(true);
    pollRef.current = setInterval(() => load(false), 10_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (ticket && !ACTIVE.has(ticket.status) && pollRef.current) {
      clearInterval(pollRef.current);
    }
  }, [ticket?.status]);

  if (loading) {
    return <FullPageLoader variant="dark" label="Loading your ticket" hint="reading the queue · · ·"/>;
  }

  if (error) {
    return (
      <div style={{
        padding: "60px 24px", textAlign: "center",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 14,
          background: "var(--color-danger-soft)", color: "var(--color-danger)",
          display: "grid", placeItems: "center", fontSize: 20, fontWeight: 700,
        }}>!</div>
        <div style={{ fontSize: 14, fontWeight: 500, color: "var(--color-fg)" }}>{error}</div>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button onClick={() => { setError(null); setLoading(true); load(true); }} style={{
            padding: "10px 18px", borderRadius: 10, border: "1px solid var(--color-border)",
            background: "var(--color-surface)", color: "var(--color-fg)",
            fontSize: 13, fontWeight: 500, cursor: "pointer",
          }}>Try again</button>
          <button onClick={() => router.push("/tg" as any)} style={{
            padding: "10px 18px", borderRadius: 10, border: "none",
            background: "var(--color-primary)", color: "#fff",
            fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>Back to home</button>
        </div>
      </div>
    );
  }

  if (!ticket) return null;

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
        <button onClick={() => router.push("/tg" as any)} style={{
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
