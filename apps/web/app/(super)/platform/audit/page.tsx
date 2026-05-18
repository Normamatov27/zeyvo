"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface AuditEvent {
  id: number;
  occurredAt: string;
  actorUserId: string | null;
  actorRole: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  traceId: string | null;
  ip: string | null;
}

const ACTION_COLOR: Record<string, string> = {
  "ticket.created": "var(--color-primary)",
  "ticket.called": "var(--color-accent)",
  "ticket.served": "var(--color-success)",
  "ticket.no_show": "var(--color-warning)",
  "ticket.cancelled": "var(--color-fg-3)",
  "window.status_changed": "var(--color-violet)",
  "user.signed_in": "var(--color-fg-2)",
  "user.telegram_linked": "var(--color-accent)",
};

export default function AuditPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<AuditEvent[]>("/api/v1/platform/audit?limit=100")
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  function fmtTime(ts: string) {
    return new Date(ts).toLocaleTimeString("en-GB", {
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  }

  function fmtDate(ts: string) {
    return new Date(ts).toLocaleDateString("en-GB", {
      day: "2-digit", month: "short",
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{
        height: 56, padding: "0 24px",
        display: "flex", alignItems: "center", gap: 12,
        borderBottom: "1px solid var(--color-hairline)",
        background: "var(--color-surface)",
      }}>
        <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: -0.3, flex: 1 }}>Audit log</span>
        <span style={{ fontSize: 11, color: "var(--color-fg-3)", fontFamily: "var(--font-mono)" }}>
          last 100 events
        </span>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
        <div style={{
          background: "var(--color-surface)", border: "1px solid var(--color-border)",
          borderRadius: 14, overflow: "hidden",
        }}>
          {/* Column header */}
          <div style={{
            display: "grid", gridTemplateColumns: "90px 90px 1fr 100px 80px 100px",
            padding: "7px 18px",
            fontSize: 10, fontFamily: "var(--font-mono)", textTransform: "uppercase",
            letterSpacing: 0.5, color: "var(--color-fg-4)", fontWeight: 600,
            borderBottom: "1px solid var(--color-hairline)",
          }}>
            <span>Date</span>
            <span>Time</span>
            <span>Action</span>
            <span>Actor</span>
            <span>Role</span>
            <span>IP</span>
          </div>

          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{
                height: 44, margin: "6px 18px", borderRadius: 6,
                background: "var(--color-surface-2)",
              }} />
            ))
          ) : events.length === 0 ? (
            <div style={{ padding: "40px 18px", textAlign: "center", color: "var(--color-fg-3)", fontSize: 13 }}>
              No audit events yet. Actions like ticket creation and sign-ins will appear here.
            </div>
          ) : events.map((ev, idx) => (
            <div key={ev.id} style={{
              display: "grid", gridTemplateColumns: "90px 90px 1fr 100px 80px 100px",
              padding: "10px 18px", alignItems: "center",
              borderBottom: idx < events.length - 1 ? "1px solid var(--color-hairline)" : "none",
              fontSize: 12,
            }}>
              <div style={{ color: "var(--color-fg-3)", fontFamily: "var(--font-mono)" }}>
                {fmtDate(ev.occurredAt)}
              </div>
              <div style={{ color: "var(--color-fg-3)", fontFamily: "var(--font-mono)" }}>
                {fmtTime(ev.occurredAt)}
              </div>
              <div style={{
                color: ACTION_COLOR[ev.action] ?? "var(--color-fg)",
                fontFamily: "var(--font-mono)", fontWeight: 500,
              }}>
                {ev.action}
                {ev.targetId && (
                  <span style={{ color: "var(--color-fg-4)", marginLeft: 6 }}>
                    ·{ev.targetId.slice(0, 8)}
                  </span>
                )}
              </div>
              <div style={{ color: "var(--color-fg-2)", fontFamily: "var(--font-mono)" }}>
                {ev.actorUserId ? ev.actorUserId.slice(0, 8) + "…" : "system"}
              </div>
              <div style={{ color: "var(--color-fg-3)" }}>
                {ev.actorRole ?? "—"}
              </div>
              <div style={{ color: "var(--color-fg-4)", fontFamily: "var(--font-mono)" }}>
                {ev.ip ?? "—"}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
