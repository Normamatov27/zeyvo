"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { Ticket } from "@/lib/types";

const ACTIVE_STATUSES = new Set(["waiting", "called", "serving"]);

const HomeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const TicketIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/>
    <line x1="9" y1="12" x2="15" y2="12" strokeDasharray="2 2"/>
  </svg>
);

const HistoryIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
);

const SettingsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { userId, _hydrated } = useAuthStore();
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);

  // Poll for active ticket to drive the Tickets tab badge
  useEffect(() => {
    if (!_hydrated || !userId) return;
    let cancelled = false;
    function poll() {
      apiFetch<Ticket[]>("/api/v1/tickets/my")
        .then((tickets) => {
          if (cancelled) return;
          const active = tickets.find((t) => ACTIVE_STATUSES.has(t.status)) ?? null;
          setActiveTicket(active);
        })
        .catch(() => {});
    }
    poll();
    const iv = setInterval(poll, 20_000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [_hydrated, userId]);

  // Landing page (/) renders full-width without the mobile chrome
  if (pathname === "/") {
    return <>{children}</>;
  }

  const onTickets = pathname.startsWith("/ticket");
  const onHome = !onTickets && (pathname === "/branches" || pathname.startsWith("/branch"));
  const onHistory = pathname.startsWith("/history");
  const onSettings = pathname.startsWith("/settings");

  function handleTicketsTab() {
    if (activeTicket) router.push(`/ticket/${activeTicket.id}`);
    else router.push("/history");
  }

  const navItem = (
    active: boolean,
    icon: React.ReactNode,
    label: string,
    href?: string,
    onClick?: () => void,
    badge?: boolean,
  ) => {
    const content = (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", gap: 3, paddingTop: 4,
        color: active ? "var(--color-primary)" : "var(--color-fg-3)",
        position: "relative", width: "100%", height: "100%",
      }}>
        <div style={{ position: "relative" }}>
          {icon}
          {badge && (
            <span style={{
              position: "absolute", top: -1, right: -3,
              width: 7, height: 7, borderRadius: "50%",
              background: "var(--color-success)",
              border: "2px solid var(--color-surface)",
              animation: "pulse 2s ease-in-out infinite",
            }}/>
          )}
        </div>
        <span style={{ fontSize: 10.5, fontWeight: active ? 600 : 400 }}>{label}</span>
      </div>
    );

    if (onClick) {
      return (
        <button key={label} onClick={onClick} style={{
          background: "none", border: "none", cursor: "pointer", padding: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {content}
        </button>
      );
    }
    return (
      <Link key={href} href={href as Route} style={{ textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {content}
      </Link>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100svh", maxWidth: 680, margin: "0 auto" }}>
      <main style={{ flex: 1, overflowY: "auto" }}>{children}</main>
      <nav style={{
        position: "sticky", bottom: 0, height: 64,
        background: "var(--color-surface)",
        borderTop: "1px solid var(--color-hairline)",
        display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
        zIndex: 10,
      }}>
        {navItem(onHome, <HomeIcon/>, "Home", "/branches")}
        {navItem(onTickets, <TicketIcon/>, "Tickets", undefined, handleTicketsTab, !!activeTicket)}
        {navItem(onHistory, <HistoryIcon/>, "History", "/history")}
        {navItem(onSettings, <SettingsIcon/>, "Settings", "/settings")}
      </nav>
    </div>
  );
}
