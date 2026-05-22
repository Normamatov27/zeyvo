"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { Branch, Org, Ticket, LoadLevel, branchLoadLevel, estimateWaitMin } from "@/lib/types";
import { FullPageLoader } from "@/components/Loader";

const ACTIVE = new Set(["waiting", "called", "serving"]);

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

function OrgCard({ org, onClick }: { org: Org; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      width: "100%", textAlign: "left", cursor: "pointer",
      background: "var(--color-surface)", border: "1px solid var(--color-border)",
      borderRadius: 14, padding: 16,
      display: "flex", alignItems: "center", gap: 14,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 11, flex: "none",
        background: "var(--color-primary-soft)", color: "var(--color-primary)",
        display: "grid", placeItems: "center",
      }}>
        <BuildingIcon size={20}/>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: -0.3 }}>{org.name}</div>
        <div style={{ fontSize: 12, color: "var(--color-fg-3)", marginTop: 2 }}>
          {org.branchCount} {org.branchCount === 1 ? "branch" : "branches"}
        </div>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="var(--color-fg-3)" strokeWidth="2.5" strokeLinecap="round">
        <path d="M9 18l6-6-6-6"/>
      </svg>
    </button>
  );
}

function BranchCard({ b }: { b: Branch }) {
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
      }}>
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

        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          paddingTop: 10, borderTop: "1px solid var(--color-hairline)",
        }}>
          <div style={{ display: "flex", gap: 20 }}>
            <div>
              <div style={{ fontSize: 10, color: "var(--color-fg-3)", textTransform: "uppercase",
                letterSpacing: 0.4, fontFamily: "var(--font-mono)" }}>wait</div>
              <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: -0.3, fontVariantNumeric: "tabular-nums" }}>
                ~{waitMin} min
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: "var(--color-fg-3)", textTransform: "uppercase",
                letterSpacing: 0.4, fontFamily: "var(--font-mono)" }}>queue</div>
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
            View
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </div>
        </div>
      </div>
    </Link>
  );
}

function ActiveTicketBanner({ ticket }: { ticket: Ticket }) {
  const t = useTranslations("queue");
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
              fontFamily: "var(--font-mono)", letterSpacing: 0.6 }}>{t("active_ticket")}</span>
            <span style={{
              display: "flex", alignItems: "center", gap: 5,
              fontSize: 10.5, padding: "3px 8px", borderRadius: 999,
              background: "rgba(255,255,255,0.18)", color: "#fff",
            }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#fff",
                animation: "pulse 1.5s ease-in-out infinite" }}/>
              {ticket.status === "serving" ? t("your_turn") : t("ahead", { count: ticket.queuePosition ?? 0 })}
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

export default function BranchesPage() {
  const router = useRouter();
  const t = useTranslations("queue");
  const { userId, _hydrated } = useAuthStore();

  const [step, setStep] = useState<"orgs" | "branches">("orgs");
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Org | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!_hydrated) return;
    if (userId === null) {
      router.replace("/sign-in?redirect=/branches");
      return;
    }
    Promise.all([
      apiFetch<Org[]>("/api/v1/orgs"),
      apiFetch<Ticket[]>("/api/v1/tickets/my").catch(() => [] as Ticket[]),
    ]).then(([orgList, myTickets]) => {
      setOrgs(orgList);
      const active = myTickets.find((tt) => ACTIVE.has(tt.status));
      if (active) setActiveTicket(active);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [_hydrated, userId]);

  function selectOrg(org: Org) {
    setSelectedOrg(org);
    setStep("branches");
    setBranchesLoading(true);
    setSearch("");
    apiFetch<Branch[]>(`/api/v1/orgs/${org.id}/branches`)
      .then(setBranches)
      .catch(() => setBranches([]))
      .finally(() => setBranchesLoading(false));
  }

  function goBack() {
    setStep("orgs");
    setSelectedOrg(null);
    setBranches([]);
    setSearch("");
  }

  if (!_hydrated || userId === null) return <FullPageLoader/>;

  const filteredOrgs = orgs.filter((o) =>
    !search.trim() || o.name.toLowerCase().includes(search.toLowerCase())
  );
  const filteredBranches = branches.filter((b) =>
    !search.trim() || b.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
      {/* Header */}
      <div style={{
        padding: "14px 16px 12px",
        position: "sticky", top: 0, zIndex: 5,
        background: "var(--color-bg)",
        borderBottom: "1px solid var(--color-hairline)",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        {step === "branches" && (
          <button onClick={goBack} style={{
            width: 34, height: 34, borderRadius: 10, flex: "none",
            background: "var(--color-surface)", border: "1px solid var(--color-border)",
            display: "grid", placeItems: "center", color: "var(--color-fg-2)", cursor: "pointer",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: -0.4 }}>
            {step === "orgs" ? t("find") : selectedOrg?.name}
          </div>
          <div style={{ fontSize: 12, color: "var(--color-fg-3)", marginTop: 1 }}>
            {step === "orgs"
              ? `${orgs.length} organisations`
              : `${branches.length} ${branches.length === 1 ? "branch" : "branches"}`
            }
          </div>
        </div>
      </div>

      <div style={{ padding: "12px 16px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Search */}
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
            placeholder={step === "orgs" ? "Search organisations…" : t("search_placeholder")}
            style={{
              flex: 1, border: "none", outline: "none",
              background: "transparent", color: "var(--color-fg)", fontSize: 14,
            }}
          />
        </div>

        {/* Active ticket banner */}
        {!loading && activeTicket && <ActiveTicketBanner ticket={activeTicket}/>}

        {/* Orgs step */}
        {step === "orgs" && (
          loading ? (
            [1, 2, 3].map((i) => (
              <div key={i} style={{
                height: 78, borderRadius: 14,
                background: "var(--color-surface)", border: "1px solid var(--color-border)",
              }}/>
            ))
          ) : filteredOrgs.length === 0 ? (
            <div style={{ textAlign: "center", fontSize: 13, color: "var(--color-fg-3)", padding: 40 }}>
              {t("no_results")}
            </div>
          ) : (
            filteredOrgs.map((org) => (
              <OrgCard key={org.id} org={org} onClick={() => selectOrg(org)}/>
            ))
          )
        )}

        {/* Branches step */}
        {step === "branches" && (
          branchesLoading ? (
            [1, 2, 3].map((i) => (
              <div key={i} style={{
                height: 110, borderRadius: 14,
                background: "var(--color-surface)", border: "1px solid var(--color-border)",
              }}/>
            ))
          ) : filteredBranches.length === 0 ? (
            <div style={{ textAlign: "center", fontSize: 13, color: "var(--color-fg-3)", padding: 40 }}>
              {t("no_results")}
            </div>
          ) : (
            filteredBranches.map((b) => <BranchCard key={b.id} b={b}/>)
          )
        )}
      </div>
    </div>
  );
}
