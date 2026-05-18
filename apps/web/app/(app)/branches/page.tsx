"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { Branch, Ticket, LoadLevel, branchLoadLevel, estimateWaitMin } from "@/lib/types";

type BranchWithLoad = Branch & { distance?: number };

const CATEGORIES = ["Nearby", "Banks", "Clinics", "Telecom", "Government"];

const TYPE_COLOR: Record<string, string> = {
  bank: "var(--color-primary)",
  clinic: "var(--color-success)",
  telecom: "var(--color-accent)",
  government: "var(--color-warning)",
};
const TYPE_SOFT: Record<string, string> = {
  bank: "var(--color-primary-soft)",
  clinic: "var(--color-success-soft)",
  telecom: "var(--color-accent-soft)",
  government: "var(--color-warning-soft)",
};

const LOAD_COLOR: Record<LoadLevel, string> = {
  low: "var(--color-success)",
  medium: "var(--color-warning)",
  high: "var(--color-danger)",
};
const LOAD_SOFT: Record<LoadLevel, string> = {
  low: "var(--color-success-soft)",
  medium: "var(--color-warning-soft)",
  high: "var(--color-danger-soft)",
};

const BuildingIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="2" width="16" height="20" rx="1"/>
    <path d="M9 22V12h6v10M9 7h1M14 7h1M9 11h1M14 11h1"/>
  </svg>
);

function BranchCard({ b }: { b: BranchWithLoad }) {
  const load = branchLoadLevel(b.activeTickets ?? 0, b.openWindows ?? 0);
  const waitMin = estimateWaitMin(b.activeTickets ?? 0, b.avgServiceS ?? 300, b.openWindows ?? 0);
  const type = b.type ?? "bank";
  const color = TYPE_COLOR[type] ?? "var(--color-primary)";
  const soft = TYPE_SOFT[type] ?? "var(--color-primary-soft)";

  return (
    <Link href={`/branch/${b.id}`} style={{ textDecoration: "none", color: "inherit" }}>
      <div style={{
        background: "var(--color-surface)", border: "1px solid var(--color-border)",
        borderRadius: 14, padding: 14, display: "flex", flexDirection: "column", gap: 10,
        cursor: "pointer",
        transition: "border-color 0.15s",
      }}>
        {/* Top row — icon + name + load badge */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 10, flex: "none",
            background: soft, color,
            display: "grid", placeItems: "center",
          }}>
            <BuildingIcon size={20}/>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: -0.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {b.name}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--color-fg-3)", marginTop: 2 }}>
              {b.address ?? "Tashkent"}
              {b.distance != null ? ` · ${b.distance} km` : ""}
            </div>
          </div>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            fontSize: 10.5, fontWeight: 600, padding: "3px 8px", borderRadius: 999,
            background: LOAD_SOFT[load], color: LOAD_COLOR[load],
            fontFamily: "var(--font-mono)", textTransform: "uppercase", flex: "none",
          }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: LOAD_COLOR[load] }}/>
            {load}
          </span>
        </div>

        {/* Bottom row — stats + CTA */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          paddingTop: 10, borderTop: "1px solid var(--color-hairline)",
        }}>
          <div style={{ display: "flex", gap: 20 }}>
            <div>
              <div style={{
                fontSize: 10, color: "var(--color-fg-3)", textTransform: "uppercase",
                letterSpacing: 0.4, fontFamily: "var(--font-mono)",
              }}>wait</div>
              <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: -0.3, fontVariantNumeric: "tabular-nums" }}>
                ~{waitMin} min
              </div>
            </div>
            <div>
              <div style={{
                fontSize: 10, color: "var(--color-fg-3)", textTransform: "uppercase",
                letterSpacing: 0.4, fontFamily: "var(--font-mono)",
              }}>queue</div>
              <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: -0.3, fontVariantNumeric: "tabular-nums" }}>
                {b.activeTickets} ppl
              </div>
            </div>
          </div>
          <div style={{
            padding: "8px 16px", borderRadius: 10,
            background: "var(--color-primary)", color: "#fff",
            fontSize: 13, fontWeight: 600,
            display: "flex", alignItems: "center", gap: 6,
          }}>
            Take ticket
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </div>
        </div>
      </div>
    </Link>
  );
}

const ACTIVE = new Set(["waiting", "called", "serving"]);

const STATUS_LABEL: Record<string, string> = {
  waiting: "Waiting",
  called: "Called",
  serving: "Being served",
};

function ActiveTicketBanner({ ticket }: { ticket: Ticket }) {
  const statusLabel = STATUS_LABEL[ticket.status] ?? ticket.status;
  return (
    <Link href={`/ticket/${ticket.id}`} style={{ textDecoration: "none", color: "inherit" }}>
      <div style={{
        background: "linear-gradient(135deg, var(--color-primary) 0%, oklch(0.52 0.22 280) 100%)",
        borderRadius: 14, padding: 16,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        boxShadow: "0 4px 20px var(--color-primary-soft)",
        cursor: "pointer",
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 10.5, opacity: 0.7, textTransform: "uppercase",
              fontFamily: "var(--font-mono)", letterSpacing: 0.6 }}>Active ticket</span>
            <span style={{
              display: "flex", alignItems: "center", gap: 5,
              fontSize: 10.5, padding: "3px 8px", borderRadius: 999,
              background: "rgba(255,255,255,0.18)", color: "#fff",
            }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#fff",
                animation: "pulse 1.5s ease-in-out infinite" }}/>
              {ticket.status === "serving" ? "Your turn!" : `${ticket.queuePosition ?? "?"} ahead`}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 8 }}>
            <div style={{ fontSize: 44, fontWeight: 500, letterSpacing: -1.5,
              lineHeight: 1, fontVariantNumeric: "tabular-nums", color: "#fff" }}>
              {ticket.number}
            </div>
            {ticket.etaMinutes != null && (
              <div style={{ fontSize: 12, opacity: 0.85, color: "#fff" }}>
                ~{ticket.etaMinutes} min
              </div>
            )}
          </div>
          <div style={{ marginTop: 12, fontSize: 11, opacity: 0.85, color: "#fff",
            display: "flex", alignItems: "center", gap: 5 }}>
            Tap to track
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </div>
        </div>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: "rgba(255,255,255,0.2)",
          display: "grid", placeItems: "center",
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </div>
      </div>
    </Link>
  );
}

const CATEGORY_TYPE: Record<string, string | null> = {
  Nearby: null,
  Banks: "bank",
  Clinics: "clinic",
  Telecom: "telecom",
  Government: "government",
};

export default function BranchesPage() {
  const router = useRouter();
  const { userId, _hydrated } = useAuthStore();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Nearby");

  function loadBranches() {
    return apiFetch<Branch[]>("/api/v1/branches").then(setBranches).catch(() => {});
  }

  useEffect(() => {
    if (!_hydrated) return;
    if (userId === null) {
      router.replace("/sign-in?redirect=/branches");
      return;
    }
    Promise.all([
      apiFetch<Branch[]>("/api/v1/branches"),
      apiFetch<Ticket[]>("/api/v1/tickets/my").catch(() => [] as Ticket[]),
    ]).then(([list, myTickets]) => {
      setBranches(list);
      const active = myTickets.find((t) => ACTIVE.has(t.status));
      if (active) setActiveTicket(active);
    }).catch(console.error)
      .finally(() => setLoading(false));

    // Refresh queue counts every 30s to keep wait times live
    const iv = setInterval(loadBranches, 30_000);
    return () => clearInterval(iv);
  }, [_hydrated, userId]);

  if (!_hydrated || userId === null) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100%", padding: 40 }}>
        <span style={{
          width: 28, height: 28, borderRadius: "50%",
          border: "3px solid var(--color-border)", borderTopColor: "var(--color-primary)",
          animation: "spin 0.8s linear infinite", display: "block",
        }}/>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const typeFilter = CATEGORY_TYPE[category] ?? null;
  const filtered = (branches as BranchWithLoad[]).filter((b) => {
    if (search.trim()) return b.name.toLowerCase().includes(search.toLowerCase());
    if (typeFilter) return b.type === typeFilter;
    return true;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
      {/* Header */}
      <div style={{
        padding: "14px 16px 12px",
        position: "sticky", top: 0, zIndex: 5,
        background: "var(--color-bg)",
        borderBottom: "1px solid var(--color-hairline)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: -0.4 }}>Find a queue</div>
          <div style={{ fontSize: 12, color: "var(--color-fg-3)", marginTop: 1 }}>
            {branches.length} branches near you
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button style={{
            width: 34, height: 34, borderRadius: 10,
            background: "var(--color-surface)", border: "1px solid var(--color-border)",
            display: "grid", placeItems: "center", color: "var(--color-fg-2)", cursor: "pointer",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </button>
        </div>
      </div>

      <div style={{ padding: "12px 16px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Search bar */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          height: 42, padding: "0 14px", borderRadius: 12,
          background: "var(--color-surface)", border: "1px solid var(--color-border-2)",
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-fg-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clinics, banks, offices…"
            style={{
              flex: 1, border: "none", outline: "none",
              background: "transparent", color: "var(--color-fg)", fontSize: 14,
            }}
          />
        </div>

        {/* Category pills */}
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              style={{
                padding: "6px 12px", borderRadius: 999, fontSize: 12.5, fontWeight: 500,
                whiteSpace: "nowrap", cursor: "pointer", border: "none",
                background: category === c ? "var(--color-fg)" : "var(--color-surface)",
                color: category === c ? "var(--color-bg)" : "var(--color-fg-2)",
                outline: category !== c ? "1px solid var(--color-border)" : "none",
              }}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Active ticket banner */}
        {!loading && activeTicket && <ActiveTicketBanner ticket={activeTicket}/>}

        {/* Section label */}
        <div style={{
          fontSize: 11, fontWeight: 600, color: "var(--color-fg-3)",
          textTransform: "uppercase", letterSpacing: 0.8, fontFamily: "var(--font-mono)",
        }}>
          Closest to you · {loading ? "…" : filtered.length}
        </div>

        {/* Branch list */}
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} style={{
              height: 110, borderRadius: 14,
              background: "var(--color-surface)", border: "1px solid var(--color-border)",
            }}/>
          ))
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", fontSize: 13, color: "var(--color-fg-3)", padding: 40 }}>
            No branches found
          </div>
        ) : (
          filtered.map((b) => <BranchCard key={b.id} b={b}/>)
        )}
      </div>
    </div>
  );
}
