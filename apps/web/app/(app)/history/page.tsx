"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { apiFetch } from "@/lib/api";
import { Ticket, Appointment, fmtClock } from "@/lib/types";

const TICKET_STATUS_COLOR: Record<string, { color: string; bg: string }> = {
  served:    { color: "var(--color-success)", bg: "var(--color-success-soft)" },
  waiting:   { color: "var(--color-primary)", bg: "var(--color-primary-soft)" },
  called:    { color: "var(--color-warning)", bg: "var(--color-warning-soft)" },
  serving:   { color: "var(--color-success)", bg: "var(--color-success-soft)" },
  no_show:   { color: "var(--color-warning)", bg: "var(--color-warning-soft)" },
  cancelled: { color: "var(--color-fg-3)",    bg: "var(--color-surface-3)" },
  expired:   { color: "var(--color-fg-4)",    bg: "var(--color-surface-3)" },
  transferred:{ color: "var(--color-accent)", bg: "var(--color-accent-soft)" },
};

const APPT_STATUS_COLOR: Record<string, { color: string; bg: string }> = {
  booked:    { color: "var(--color-primary)", bg: "var(--color-primary-soft)" },
  cancelled: { color: "var(--color-fg-3)",    bg: "var(--color-surface-3)" },
  no_show:   { color: "var(--color-warning)", bg: "var(--color-warning-soft)" },
  served:    { color: "var(--color-success)", bg: "var(--color-success-soft)" },
};

const LOCALE_FMT: Record<string, string> = { en: "en-GB", ru: "ru-RU", uz: "uz-UZ" };

type HistoryItem =
  | { kind: "ticket"; date: string; ts: number; data: Ticket }
  | { kind: "appt";   date: string; ts: number; data: Appointment };

function useFmtDate() {
  const t = useTranslations("history");
  const locale = useLocale();
  return (ts: string) => {
    const d = new Date(ts);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return t("today");
    if (d.toDateString() === yesterday.toDateString()) return t("yesterday");
    return d.toLocaleDateString(LOCALE_FMT[locale] ?? "en-GB", { day: "numeric", month: "short", year: "numeric" });
  };
}

export default function HistoryPage() {
  const t = useTranslations("history");
  const tAppt = useTranslations("appointments");
  const tAuth = useTranslations("auth");
  const tQueue = useTranslations("queue");
  const fmtDate = useFmtDate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<"tickets" | "appointments">("tickets");

  useEffect(() => {
    Promise.all([
      apiFetch<Ticket[]>("/api/v1/tickets/my").catch(() => [] as Ticket[]),
      apiFetch<Appointment[]>("/api/v1/appointments/my").catch(() => [] as Appointment[]),
    ])
      .then(([tks, appts]) => { setTickets(tks); setAppointments(appts); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const ticketItems: HistoryItem[] = tickets
    .map((tk): HistoryItem => ({
      kind: "ticket", ts: new Date(tk.joinedAt).getTime(),
      date: fmtDate(tk.joinedAt), data: tk,
    }))
    .sort((a, b) => b.ts - a.ts);

  const apptItems: HistoryItem[] = appointments
    .map((a): HistoryItem => ({
      kind: "appt", ts: new Date(a.scheduledAt).getTime(),
      date: fmtDate(a.scheduledAt), data: a,
    }))
    .sort((a, b) => b.ts - a.ts);

  const items = tab === "tickets" ? ticketItems : apptItems;
  const isEmpty = items.length === 0;

  function buildGroups(list: HistoryItem[]) {
    const grouped: { date: string; items: HistoryItem[] }[] = [];
    for (const item of list) {
      const last = grouped[grouped.length - 1];
      if (last && last.date === item.date) last.items.push(item);
      else grouped.push({ date: item.date, items: [item] });
    }
    return grouped;
  }
  const grouped = buildGroups(items);

  const TAB_STYLE = (active: boolean) => ({
    flex: 1, padding: "8px 0", borderRadius: 8, border: "none", cursor: "pointer",
    fontSize: 13, fontWeight: 600,
    background: active ? "var(--color-fg)" : "transparent",
    color: active ? "var(--color-bg)" : "var(--color-fg-3)",
    transition: "all 0.15s",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
      <div style={{
        padding: "16px 16px 0",
        borderBottom: "1px solid var(--color-hairline)",
        background: "var(--color-bg)",
        position: "sticky", top: 0, zIndex: 5,
      }}>
        <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: -0.3 }}>{t("title")}</div>
        {/* Tabs */}
        <div style={{
          display: "flex", gap: 4, marginTop: 12,
          background: "var(--color-surface-2)", borderRadius: 10, padding: 4,
        }}>
          <button style={TAB_STYLE(tab === "tickets")} onClick={() => setTab("tickets")}>
            {t("tab_tickets")}
          </button>
          <button style={TAB_STYLE(tab === "appointments")} onClick={() => setTab("appointments")}>
            {t("tab_appointments")}
          </button>
        </div>
        <div style={{ height: 12 }}/>
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
            <div style={{ fontSize: 13 }}>{t("sign_in_prompt")}</div>
            <Link href="/sign-in" style={{
              display: "inline-block", marginTop: 12, padding: "8px 20px",
              borderRadius: 10, background: "var(--color-primary)", color: "#fff",
              fontSize: 13, fontWeight: 500, textDecoration: "none",
            }}>{tAuth("sign_in")}</Link>
          </div>
        )}

        {!loading && !error && isEmpty && tab === "tickets" && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: "var(--color-fg)" }}>{t("empty_title")}</div>
            <div style={{ fontSize: 13, color: "var(--color-fg-3)", marginTop: 4 }}>{t("empty_sub")}</div>
            <Link href="/branches" style={{
              display: "inline-block", marginTop: 16, padding: "10px 22px",
              borderRadius: 12, background: "var(--color-primary)", color: "#fff",
              fontSize: 13, fontWeight: 600, textDecoration: "none",
            }}>{tQueue("find")}</Link>
          </div>
        )}

        {!loading && !error && isEmpty && tab === "appointments" && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: "var(--color-fg)" }}>{tAppt("empty_title")}</div>
            <div style={{ fontSize: 13, color: "var(--color-fg-3)", marginTop: 4 }}>{tAppt("empty_sub")}</div>
            <Link href="/branches" style={{
              display: "inline-block", marginTop: 16, padding: "10px 22px",
              borderRadius: 12, background: "var(--color-primary)", color: "#fff",
              fontSize: 13, fontWeight: 600, textDecoration: "none",
            }}>{tQueue("find")}</Link>
          </div>
        )}

        {grouped.map(({ date, items: group }) => (
          <div key={date}>
            <div style={{
              fontSize: 11, fontWeight: 600, color: "var(--color-fg-3)",
              textTransform: "uppercase", letterSpacing: 0.6,
              fontFamily: "var(--font-mono)", marginBottom: 8,
            }}>
              {date}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {group.map((item) => {
                if (item.kind === "ticket") {
                  const tk = item.data;
                  const cfg = TICKET_STATUS_COLOR[tk.status] ?? TICKET_STATUS_COLOR.cancelled!;
                  const isActive = ["waiting", "called", "serving"].includes(tk.status);
                  return (
                    <Link key={`t-${tk.id}`} href={`/ticket/${tk.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                      <div style={{
                        background: "var(--color-surface)", border: "1px solid var(--color-border)",
                        borderRadius: 12, padding: "12px 14px",
                        display: "flex", alignItems: "center", gap: 12,
                      }}>
                        <div style={{
                          width: 48, height: 48, borderRadius: 10, flex: "none",
                          background: "var(--color-surface-2)",
                          display: "grid", placeItems: "center",
                          fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700,
                          color: "var(--color-fg)",
                        }}>
                          {tk.number}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-fg)",
                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {tk.branchName ?? ""}
                          </div>
                          <div style={{ fontSize: 11.5, color: "var(--color-fg-3)", marginTop: 2, fontFamily: "var(--font-mono)" }}>
                            {tk.serviceName && <span style={{ marginRight: 4 }}>{tk.serviceName} ·</span>}
                            {tk.source === "kiosk" ? t("source_kiosk") : t("source_remote")} · {fmtClock(tk.joinedAt)}
                            {tk.servedAt && ` → ${fmtClock(tk.servedAt)}`}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{
                            fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 999,
                            background: cfg.bg, color: cfg.color,
                            display: "flex", alignItems: "center", gap: 4,
                          }}>
                            {isActive && <span style={{ width: 5, height: 5, borderRadius: "50%", background: cfg.color, flex: "none" }}/>}
                            {t(`status.${tk.status}` as any)}
                          </span>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--color-fg-4)" strokeWidth="2">
                            <path d="m9 18 6-6-6-6"/>
                          </svg>
                        </div>
                      </div>
                    </Link>
                  );
                } else {
                  const a = item.data;
                  const cfg = APPT_STATUS_COLOR[a.status] ?? APPT_STATUS_COLOR.cancelled!;
                  const apptTime = new Date(a.scheduledAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
                  return (
                    <Link key={`a-${a.id}`} href={`/appointment/${a.id}` as any} style={{ textDecoration: "none", color: "inherit" }}>
                      <div style={{
                        background: "var(--color-surface)", border: "1px solid var(--color-border)",
                        borderRadius: 12, padding: "12px 14px",
                        display: "flex", alignItems: "center", gap: 12,
                      }}>
                        <div style={{
                          width: 48, height: 48, borderRadius: 10, flex: "none",
                          background: "var(--color-primary-soft)",
                          display: "grid", placeItems: "center",
                          color: "var(--color-primary)",
                        }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <rect x="3" y="4" width="18" height="18" rx="2"/>
                            <line x1="16" y1="2" x2="16" y2="6"/>
                            <line x1="8" y1="2" x2="8" y2="6"/>
                            <line x1="3" y1="10" x2="21" y2="10"/>
                          </svg>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-fg)",
                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {a.branchName ?? ""}
                          </div>
                          <div style={{ fontSize: 11.5, color: "var(--color-fg-3)", marginTop: 2, fontFamily: "var(--font-mono)" }}>
                            {a.serviceName && <span style={{ marginRight: 4 }}>{a.serviceName} ·</span>}
                            {apptTime}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{
                            fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 999,
                            background: cfg.bg, color: cfg.color,
                          }}>
                            {tAppt(`status.${a.status}` as any)}
                          </span>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--color-fg-4)" strokeWidth="2">
                            <path d="m9 18 6-6-6-6"/>
                          </svg>
                        </div>
                      </div>
                    </Link>
                  );
                }
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
