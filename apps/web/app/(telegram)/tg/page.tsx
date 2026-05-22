"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { apiFetch } from "@/lib/api";
import { Branch, Org, branchLoadLevel, estimateWaitMin } from "@/lib/types";

const BuildingChar = ({ name }: { name: string }) => (
  <div style={{
    width: 44, height: 44, borderRadius: 10, flex: "none",
    background: "var(--color-primary-soft)", color: "var(--color-primary)",
    display: "grid", placeItems: "center",
    fontSize: 18, fontWeight: 700,
  }}>
    {name.charAt(0).toUpperCase()}
  </div>
);

export default function TgHomePage() {
  const t = useTranslations("tg");
  const [step, setStep] = useState<"orgs" | "branches">("orgs");
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Org | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [branchesLoading, setBranchesLoading] = useState(false);

  useEffect(() => {
    apiFetch<Org[]>("/api/v1/orgs")
      .then(setOrgs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function selectOrg(org: Org) {
    setSelectedOrg(org);
    setStep("branches");
    setBranchesLoading(true);
    apiFetch<Branch[]>(`/api/v1/orgs/${org.id}/branches`)
      .then(setBranches)
      .catch(() => setBranches([]))
      .finally(() => setBranchesLoading(false));
  }

  function goBack() {
    setStep("orgs");
    setSelectedOrg(null);
    setBranches([]);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100svh" }}>
      {/* Header */}
      <div style={{
        padding: "16px 16px 12px",
        background: "var(--color-surface)",
        borderBottom: "1px solid var(--color-hairline)",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        {step === "branches" && (
          <button onClick={goBack} style={{
            width: 32, height: 32, borderRadius: 8, flex: "none",
            background: "var(--color-surface-2)", border: "1px solid var(--color-border)",
            display: "grid", placeItems: "center", color: "var(--color-fg-2)", cursor: "pointer",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.4, color: "var(--color-primary)" }}>
            {step === "orgs" ? "zeyvo" : selectedOrg?.name}
          </div>
          <div style={{ fontSize: 12, color: "var(--color-fg-3)", marginTop: 2 }}>
            {step === "orgs" ? t("choose_location") : `${branches.length} branches`}
          </div>
        </div>
      </div>

      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
        {/* Orgs step */}
        {step === "orgs" && (
          loading ? (
            [1, 2, 3].map((i) => (
              <div key={i} style={{
                height: 72, borderRadius: 12,
                background: "var(--color-surface)",
                animation: "pulse 1.5s ease-in-out infinite",
              }}/>
            ))
          ) : orgs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--color-fg-3)" }}>
              <div style={{ fontSize: 14 }}>{t("no_branches")}</div>
            </div>
          ) : (
            orgs.map((org) => (
              <button key={org.id} onClick={() => selectOrg(org)} style={{
                width: "100%", textAlign: "left", cursor: "pointer",
                background: "var(--color-surface)", border: "1px solid var(--color-border)",
                borderRadius: 14, padding: 14,
                display: "flex", alignItems: "center", gap: 14,
              }}>
                <BuildingChar name={org.name}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: -0.2 }}>{org.name}</div>
                  <div style={{ fontSize: 11.5, color: "var(--color-fg-3)", marginTop: 2 }}>
                    {org.branchCount} {org.branchCount === 1 ? "branch" : "branches"}
                  </div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="var(--color-fg-3)" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>
            ))
          )
        )}

        {/* Branches step */}
        {step === "branches" && (
          branchesLoading ? (
            [1, 2, 3].map((i) => (
              <div key={i} style={{
                height: 80, borderRadius: 12,
                background: "var(--color-surface)",
                animation: "pulse 1.5s ease-in-out infinite",
              }}/>
            ))
          ) : branches.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--color-fg-3)" }}>
              <div style={{ fontSize: 14 }}>{t("no_branches")}</div>
            </div>
          ) : (
            branches.map((b) => {
              const load = branchLoadLevel(b.activeTickets, b.openWindows);
              const waitMin = estimateWaitMin(b.activeTickets, b.avgServiceS, b.openWindows);
              const loadColor = load === "low"
                ? "var(--color-success)"
                : load === "high"
                ? "var(--color-danger)"
                : "var(--color-warning)";
              return (
                <Link key={b.id} href={`/tg/branch/${b.id}`}
                  style={{ textDecoration: "none", color: "inherit" }}>
                  <div style={{
                    background: "var(--color-surface)", border: "1px solid var(--color-border)",
                    borderRadius: 14, padding: 14,
                    display: "flex", alignItems: "center", gap: 14,
                    cursor: "pointer",
                  }}>
                    <BuildingChar name={b.shortName ?? b.name}/>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: -0.2 }}>
                        {b.shortName ?? b.name}
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--color-fg-3)", marginTop: 2 }}>
                        {b.address ?? "Tashkent"}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flex: "none" }}>
                      <div style={{ fontSize: 15, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                        ~{waitMin}m
                      </div>
                      <div style={{ fontSize: 11, color: loadColor, fontWeight: 500, marginTop: 2 }}>
                        {b.activeTickets} {t("in_queue")}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })
          )
        )}
      </div>
    </div>
  );
}
