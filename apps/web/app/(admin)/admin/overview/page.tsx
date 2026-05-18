"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { BranchDetail, branchLoadLevel, estimateWaitMin } from "@/lib/types";
import Link from "next/link";

const LOAD_COLORS = {
  low: "var(--color-success)",
  medium: "var(--color-warning)",
  high: "var(--color-danger)",
};

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{
      background: "var(--color-surface)", border: "1px solid var(--color-border)",
      borderRadius: 12, padding: "14px 16px",
    }}>
      <div style={{ fontSize: 11, color: "var(--color-fg-3)", fontFamily: "var(--font-mono)",
        textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: -0.8,
        fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--color-fg-3)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

interface BranchMetrics {
  avgWaitMinutes: number | null;
  served: number;
  noShowRate: number;
}

export default function OverviewPage() {
  const [branches, setBranches] = useState<BranchDetail[]>([]);
  const [metrics, setMetrics] = useState<BranchMetrics>({ avgWaitMinutes: null, served: 0, noShowRate: 0 });
  const [loading, setLoading] = useState(true);
  const [clockStr, setClockStr] = useState(() =>
    new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  );

  useEffect(() => {
    const iv = setInterval(() =>
      setClockStr(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })),
      1_000
    );
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const list = await apiFetch<{ id: string }[]>("/api/v1/branches");
        const details = await Promise.allSettled(
          list.map((b) => apiFetch<BranchDetail>(`/api/v1/branches/${b.id}`))
        );
        const resolved: BranchDetail[] = details
          .filter((r) => r.status === "fulfilled")
          .map((r) => (r as PromiseFulfilledResult<BranchDetail>).value);
        setBranches(resolved);

        // Fetch metrics for all branches in parallel
        const metricsResults = await Promise.allSettled(
          resolved.map((b) => apiFetch<BranchMetrics & { total: number }>(`/api/v1/branches/${b.id}/metrics`))
        );
        const allMetrics = metricsResults
          .filter((r) => r.status === "fulfilled")
          .map((r) => (r as PromiseFulfilledResult<BranchMetrics & { total: number }>).value);

        if (allMetrics.length > 0) {
          const totalServed = allMetrics.reduce((s, m) => s + m.served, 0);
          const avgWaits = allMetrics.filter((m) => m.avgWaitMinutes != null);
          const avgWait = avgWaits.length > 0
            ? Math.round(avgWaits.reduce((s, m) => s + (m.avgWaitMinutes ?? 0), 0) / avgWaits.length)
            : null;
          const avgNoShow = allMetrics.reduce((s, m) => s + m.noShowRate, 0) / allMetrics.length;
          setMetrics({ avgWaitMinutes: avgWait, served: totalServed, noShowRate: avgNoShow });
        }
      } catch {}
      setLoading(false);
    }
    load();
    const iv = setInterval(load, 15_000);
    return () => clearInterval(iv);
  }, []);

  const totalActive = branches.reduce((a, b) => a + b.activeTickets, 0);
  const totalWindows = branches.reduce(
    (a, b) => a + b.windows.filter((w) => w.status === "open").length, 0
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Top bar */}
      <div style={{
        height: 56, padding: "0 24px",
        display: "flex", alignItems: "center", gap: 12,
        borderBottom: "1px solid var(--color-hairline)",
        background: "var(--color-surface)",
      }}>
        <div style={{ flex: 1 }}>
          {branches.length > 0 && (
            <span style={{ fontSize: 11, color: "var(--color-fg-3)", fontFamily: "var(--font-mono)" }}>
              {branches[0]?.name} /
            </span>
          )}
          <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: -0.3, marginLeft: 4 }}>
            Live overview
          </span>
        </div>
        <span style={{ fontSize: 11, color: "var(--color-fg-3)", fontFamily: "var(--font-mono)" }}>
          {clockStr}
        </span>
        <span style={{
          display: "flex", alignItems: "center", gap: 4,
          fontSize: 11, fontWeight: 600,
          color: "var(--color-success)", background: "var(--color-success-soft)",
          padding: "3px 8px", borderRadius: 999,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-success)" }}/>
          live
        </span>
      </div>

      <div style={{ flex: 1, padding: 24, overflow: "auto", display: "flex", flexDirection: "column", gap: 20 }}>
        {/* KPI row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          <Stat label="In queue now" value={totalActive.toString()} sub="across all branches"/>
          <Stat label="Open windows" value={totalWindows.toString()} sub="serving customers"/>
          <Stat label="Served today" value={metrics.served.toString()} sub="last 24h"/>
          <Stat
            label="Avg wait"
            value={metrics.avgWaitMinutes != null ? `~${metrics.avgWaitMinutes}m` : "—"}
            sub={metrics.avgWaitMinutes != null ? "last 24h" : "no data yet"}
          />
        </div>

        {/* Branch health alerts */}
        {(() => {
          const alerts: { level: "danger" | "warning"; msg: string }[] = [];
          branches.forEach((b) => {
            const openW = b.windows.filter((w) => w.status === "open").length;
            const name = b.shortName ?? b.name;
            if (b.activeTickets > 0 && openW === 0)
              alerts.push({ level: "danger", msg: `${name}: ${b.activeTickets} customers waiting but no windows are open.` });
            if (b.services.length === 0)
              alerts.push({ level: "warning", msg: `${name}: no services configured — customers can't join.` });
            if (b.capacity && b.activeTickets >= b.capacity * 0.9)
              alerts.push({ level: "warning", msg: `${name}: at ${b.activeTickets}/${b.capacity} capacity (${Math.round(b.activeTickets / b.capacity * 100)}%).` });
          });
          if (alerts.length === 0) return null;
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {alerts.map((a, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 14px", borderRadius: 10,
                  background: a.level === "danger" ? "var(--color-danger-soft)" : "var(--color-warning-soft)",
                  border: `1px solid ${a.level === "danger" ? "var(--color-danger)" : "var(--color-warning)"}`,
                  fontSize: 12, fontWeight: 500,
                  color: a.level === "danger" ? "var(--color-danger)" : "var(--color-warning)",
                }}>
                  <span style={{ fontSize: 14, flex: "none" }}>{a.level === "danger" ? "⚠" : "ℹ"}</span>
                  {a.msg}
                </div>
              ))}
            </div>
          );
        })()}

        {/* Branch tiles */}
        <div style={{
          background: "var(--color-surface)", border: "1px solid var(--color-border)",
          borderRadius: 14, padding: 16,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-fg-3)",
              textTransform: "uppercase", letterSpacing: 0.6, fontFamily: "var(--font-mono)" }}>
              Branches · live
            </div>
            <span style={{
              display: "flex", alignItems: "center", gap: 4,
              fontSize: 11, color: "var(--color-success)",
              background: "var(--color-success-soft)",
              padding: "2px 8px", borderRadius: 999, fontWeight: 600,
            }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--color-success)" }}/>
              auto-refresh 15s
            </span>
          </div>

          {loading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {[1, 2, 3].map((i) => (
                <div key={i} style={{ height: 130, borderRadius: 12,
                  background: "var(--color-surface-2)" }}/>
              ))}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {branches.map((b) => {
                const openW = b.windows.filter((w) => w.status === "open").length;
                const load = branchLoadLevel(b.activeTickets, openW);
                const waitMin = estimateWaitMin(b.activeTickets, b.avgServiceS || 300, openW);
                return (
                  <div key={b.id} style={{
                    background: "var(--color-surface-2)", border: "1px solid var(--color-border)",
                    borderRadius: 12, padding: 14,
                    display: "flex", flexDirection: "column", gap: 10,
                  }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: -0.2 }}>
                          {b.shortName ?? b.name}
                        </div>
                        <div style={{ fontSize: 10, color: "var(--color-fg-3)",
                          fontFamily: "var(--font-mono)" }}>{openW} windows open</div>
                      </div>
                      <span style={{
                        display: "flex", alignItems: "center", gap: 3,
                        fontSize: 11, fontWeight: 600, padding: "3px 7px", borderRadius: 999,
                        background: `${LOAD_COLORS[load]}20`, color: LOAD_COLORS[load],
                      }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%",
                          background: LOAD_COLORS[load], flex: "none" }}/>
                        {load}
                      </span>
                    </div>

                    {/* Window bar */}
                    <div style={{ display: "flex", gap: 3 }}>
                      {b.windows.slice(0, 8).map((w) => (
                        <div key={w.id} style={{
                          flex: 1, height: 28, borderRadius: 4,
                          background: w.status !== "open"
                            ? "var(--color-surface-3)"
                            : w.servingTicket
                            ? "var(--color-success)"
                            : "var(--color-success-soft)",
                          display: "grid", placeItems: "center",
                          fontSize: 9, fontFamily: "var(--font-mono)", fontWeight: 600,
                          color: w.servingTicket ? "#fff"
                            : w.status === "open" ? "var(--color-success)"
                            : "var(--color-fg-4)",
                        }}>W{w.number}</div>
                      ))}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", gap: 14 }}>
                        <div>
                          <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: -0.4,
                            fontVariantNumeric: "tabular-nums" }}>{b.activeTickets}</div>
                          <div style={{ fontSize: 10, color: "var(--color-fg-3)",
                            fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>queue</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: -0.4,
                            fontVariantNumeric: "tabular-nums" }}>~{waitMin}m</div>
                          <div style={{ fontSize: 10, color: "var(--color-fg-3)",
                            fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>wait</div>
                        </div>
                      </div>
                      <Link href={`/admin/queue?branchId=${b.id}`} style={{
                        padding: "5px 10px", borderRadius: 6,
                        background: "var(--color-surface)", border: "1px solid var(--color-border)",
                        fontSize: 11, color: "var(--color-fg-2)", cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 4, textDecoration: "none",
                      }}>
                        Open
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="2.5">
                          <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                      </Link>
                    </div>
                  </div>
                );
              })}
              {branches.length === 0 && (
                <div style={{ gridColumn: "1/-1", textAlign: "center",
                  padding: "40px 0", color: "var(--color-fg-3)", fontSize: 13 }}>
                  No branches found. Run{" "}
                  <code style={{ fontFamily: "var(--font-mono)", fontSize: 12,
                    background: "var(--color-surface-3)", padding: "2px 6px", borderRadius: 4 }}>
                    POST /api/v1/dev/seed
                  </code>{" "}
                  to seed demo data.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
