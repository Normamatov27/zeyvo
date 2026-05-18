"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Ticket, fmtClock } from "@/lib/types";

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  served:    { label: "Served",    color: "var(--color-success)",  bg: "var(--color-success-soft)" },
  waiting:   { label: "Waiting",   color: "var(--color-primary)",  bg: "var(--color-primary-soft)" },
  called:    { label: "Called",    color: "var(--color-warning)",  bg: "var(--color-warning-soft)" },
  serving:   { label: "Serving",   color: "var(--color-success)",  bg: "var(--color-success-soft)" },
  no_show:   { label: "No-show",   color: "var(--color-warning)",  bg: "var(--color-warning-soft)" },
  cancelled: { label: "Cancelled", color: "var(--color-fg-3)",     bg: "var(--color-surface-3)" },
  expired:   { label: "Expired",   color: "var(--color-fg-4)",     bg: "var(--color-surface-3)" },
  transferred: { label: "Transferred", color: "var(--color-accent)", bg: "var(--color-accent-soft)" },
};

function fmtDate(ts: string) {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function HistoryPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    apiFetch<Ticket[]>("/api/v1/tickets/my")
      .then(setTickets)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  // Group by date
  const grouped: { date: string; tickets: Ticket[] }[] = [];
  for (const t of tickets) {
    const date = fmtDate(t.joinedAt);
    const last = grouped[grouped.length - 1];
    if (last && last.date === date) last.tickets.push(t);
    else grouped.push({ date, tickets: [t] });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
      <div style={{
        padding: "16px 16px 12px",
        borderBottom: "1px solid var(--color-hairline)",
        background: "var(--color-bg)",
        position: "sticky", top: 0, zIndex: 5,
      }}>
        <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: -0.3 }}>History</div>
        <div style={{ fontSize: 11.5, color: "var(--color-fg-3)", marginTop: 1 }}>
          {loading ? "Loading…" : `${tickets.length} tickets`}
        </div>
      </div>

      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 20 }}>
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{ height: 72, borderRadius: 12, background: "var(--color-surface)",
                border: "1px solid var(--color-border)", animation: "pulse 1.5s ease-in-out infinite" }}/>
            ))}
          </div>
        )}

        {!loading && error && (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--color-fg-3)" }}>
            <div style={{ fontSize: 13 }}>Sign in to see your history</div>
            <Link href="/sign-in" style={{
              display: "inline-block", marginTop: 12, padding: "8px 20px",
              borderRadius: 10, background: "var(--color-primary)", color: "#fff",
              fontSize: 13, fontWeight: 500, textDecoration: "none",
            }}>Sign in</Link>
          </div>
        )}

        {!loading && !error && tickets.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🎫</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: "var(--color-fg)" }}>No tickets yet</div>
            <div style={{ fontSize: 13, color: "var(--color-fg-3)", marginTop: 4 }}>
              Join a queue and it'll appear here
            </div>
            <Link href="/" style={{
              display: "inline-block", marginTop: 16, padding: "10px 22px",
              borderRadius: 12, background: "var(--color-primary)", color: "#fff",
              fontSize: 13, fontWeight: 600, textDecoration: "none",
            }}>Find a queue</Link>
          </div>
        )}

        {grouped.map(({ date, tickets: group }) => (
          <div key={date}>
            <div style={{
              fontSize: 11, fontWeight: 600, color: "var(--color-fg-3)",
              textTransform: "uppercase", letterSpacing: 0.6,
              fontFamily: "var(--font-mono)", marginBottom: 8,
            }}>
              {date}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {group.map((t) => {
                const cfg = STATUS_CFG[t.status] ?? STATUS_CFG.cancelled!;
                const isActive = ["waiting", "called", "serving"].includes(t.status);
                return (
                  <Link key={t.id} href={`/ticket/${t.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                    <div style={{
                      background: "var(--color-surface)", border: "1px solid var(--color-border)",
                      borderRadius: 12, padding: "12px 14px",
                      display: "flex", alignItems: "center", gap: 12,
                      cursor: "pointer",
                    }}>
                      {/* Ticket number */}
                      <div style={{
                        width: 48, height: 48, borderRadius: 10, flex: "none",
                        background: "var(--color-surface-2)",
                        display: "grid", placeItems: "center",
                        fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700,
                        color: "var(--color-fg)",
                      }}>
                        {t.number}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-fg)",
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {t.branchName ?? "Branch"}
                        </div>
                        <div style={{ fontSize: 11.5, color: "var(--color-fg-3)", marginTop: 2,
                          fontFamily: "var(--font-mono)" }}>
                          {t.serviceName && <span style={{ marginRight: 4 }}>{t.serviceName} ·</span>}
                          {t.source === "kiosk" ? "walk-in" : "remote"} · {fmtClock(t.joinedAt)}
                          {t.servedAt && ` → ${fmtClock(t.servedAt)}`}
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 999,
                          background: cfg.bg, color: cfg.color,
                          display: "flex", alignItems: "center", gap: 4,
                        }}>
                          {isActive && (
                            <span style={{ width: 5, height: 5, borderRadius: "50%",
                              background: cfg.color, flex: "none" }}/>
                          )}
                          {cfg.label}
                        </span>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                          stroke="var(--color-fg-4)" strokeWidth="2">
                          <path d="m9 18 6-6-6-6"/>
                        </svg>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
