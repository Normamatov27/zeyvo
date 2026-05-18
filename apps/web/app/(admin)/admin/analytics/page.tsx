"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { BranchDetail } from "@/lib/types";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
} from "recharts";

interface Metrics {
  branchId: string;
  total: number;
  served: number;
  noShows: number;
  cancelled: number;
  avgWaitMinutes: number | null;
  avgServiceSeconds: number | null;
  noShowRate: number;
  remoteShare: number;
  throughputPerHour: number;
  avgRating: number | null;
  ratingCount: number;
}

interface HourlyPoint {
  hour: string;
  joined: number;
  served: number;
  noShows: number;
  avgWaitS: number | null;
}

interface StaffMetric {
  windowId: string;
  windowNumber: number;
  windowLabel: string | null;
  served: number;
  noShows: number;
  avgServiceSeconds: number | null;
  avgRating: number | null;
}

interface ServiceMetric {
  serviceId: string;
  serviceCode: string;
  serviceName: string;
  total: number;
  served: number;
  noShows: number;
  cancelled: number;
  avgWaitMinutes: number | null;
  avgServiceSeconds: number | null;
  serveRate: number;
  noShowRate: number;
}

function KpiCell({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div style={{ background: "var(--color-surface-2)", borderRadius: 10, padding: "12px 14px" }}>
      <div style={{ fontSize: 10, color: "var(--color-fg-4)", fontFamily: "var(--font-mono)",
        textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.5,
        fontVariantNumeric: "tabular-nums", color: accent ?? "var(--color-fg)" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--color-fg-3)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function BranchBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 11, color: "var(--color-fg-3)", width: 60, flex: "none" }}>{label}</span>
      <div style={{ flex: 1, height: 6, borderRadius: 3, background: "var(--color-surface-3)" }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 3, background: color, transition: "width 0.4s" }}/>
      </div>
      <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--color-fg-3)",
        minWidth: 28, textAlign: "right" }}>{pct}%</span>
    </div>
  );
}

function fmtHour(isoStr: string) {
  try {
    const d = new Date(isoStr);
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return isoStr;
  }
}

export default function AnalyticsPage() {
  const [branches, setBranches] = useState<BranchDetail[]>([]);
  const [metrics, setMetrics] = useState<Record<string, Metrics>>({});
  const [hourly, setHourly] = useState<HourlyPoint[]>([]);
  const [staffMetrics, setStaffMetrics] = useState<StaffMetric[]>([]);
  const [serviceMetrics, setServiceMetrics] = useState<ServiceMetric[]>([]);
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "staff" | "services">("overview");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const list = await apiFetch<{ id: string }[]>("/api/v1/branches");
        const details = await Promise.allSettled(
          list.map((b) => apiFetch<BranchDetail>(`/api/v1/branches/${b.id}`))
        );
        const resolved = details
          .filter((r) => r.status === "fulfilled")
          .map((r) => (r as PromiseFulfilledResult<BranchDetail>).value);
        setBranches(resolved);

        if (resolved.length > 0 && !activeBranchId) {
          setActiveBranchId(resolved[0]!.id);
        }

        const metricsResults = await Promise.allSettled(
          resolved.map((b) => apiFetch<Metrics>(`/api/v1/branches/${b.id}/metrics`))
        );
        const map: Record<string, Metrics> = {};
        metricsResults.forEach((r, i) => {
          if (r.status === "fulfilled") map[resolved[i]!.id] = r.value;
        });
        setMetrics(map);
      } catch {}
      setLoading(false);
    }
    load();
    const iv = setInterval(load, 30_000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (!activeBranchId) return;
    apiFetch<HourlyPoint[]>(`/api/v1/branches/${activeBranchId}/metrics/hourly`)
      .then(setHourly)
      .catch(() => {});
    apiFetch<StaffMetric[]>(`/api/v1/branches/${activeBranchId}/metrics/staff`)
      .then(setStaffMetrics)
      .catch(() => {});
    apiFetch<ServiceMetric[]>(`/api/v1/branches/${activeBranchId}/metrics/services`)
      .then(setServiceMetrics)
      .catch(() => {});
  }, [activeBranchId]);

  const allMetrics = Object.values(metrics);
  const totalServed = allMetrics.reduce((s, m) => s + m.served, 0);
  const totalTickets = allMetrics.reduce((s, m) => s + m.total, 0);
  const avgWait = allMetrics.filter((m) => m.avgWaitMinutes != null).length > 0
    ? Math.round(allMetrics.reduce((s, m) => s + (m.avgWaitMinutes ?? 0), 0) /
        allMetrics.filter((m) => m.avgWaitMinutes != null).length)
    : null;
  const avgNoShow = totalTickets > 0
    ? Math.round(allMetrics.reduce((s, m) => s + m.noShows, 0) / totalTickets * 100)
    : 0;

  const maxServed = Math.max(1, ...allMetrics.map((m) => m.served));

  const chartData = hourly.map((h) => ({
    time: fmtHour(h.hour),
    Joined: h.joined,
    Served: h.served,
    "No-show": h.noShows,
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Top bar */}
      <div style={{
        height: 56, padding: "0 24px",
        display: "flex", alignItems: "center", gap: 12,
        borderBottom: "1px solid var(--color-hairline)",
        background: "var(--color-surface)", flexShrink: 0,
      }}>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 11, color: "var(--color-fg-3)", fontFamily: "var(--font-mono)" }}>Analytics / </span>
          <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: -0.3, marginLeft: 4 }}>Last 24h</span>
        </div>
        {branches.length > 1 && (
          <select
            value={activeBranchId ?? ""}
            onChange={(e) => setActiveBranchId(e.target.value)}
            style={{
              fontSize: 12, padding: "4px 8px", borderRadius: 6,
              border: "1px solid var(--color-border)", background: "var(--color-surface)",
              color: "var(--color-fg)", cursor: "pointer",
            }}
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.shortName ?? b.name}</option>
            ))}
          </select>
        )}
        <span style={{ fontSize: 11, color: "var(--color-fg-3)", fontFamily: "var(--font-mono)" }}>
          auto-refresh 30s
        </span>
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex", gap: 0,
        borderBottom: "1px solid var(--color-hairline)",
        background: "var(--color-surface)", padding: "0 24px", flexShrink: 0,
      }}>
        {(["overview", "staff", "services"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: "10px 16px", fontSize: 12, fontWeight: 600,
            background: "none", border: "none", cursor: "pointer",
            color: activeTab === tab ? "var(--color-primary)" : "var(--color-fg-3)",
            borderBottom: activeTab === tab ? "2px solid var(--color-primary)" : "2px solid transparent",
            marginBottom: -1, textTransform: "capitalize",
          }}>{tab}</button>
        ))}
      </div>

      <div style={{ flex: 1, padding: 24, overflow: "auto", display: "flex", flexDirection: "column", gap: 20 }}>
      {activeTab === "services" && (
        <div style={{
          background: "var(--color-surface)", border: "1px solid var(--color-border)",
          borderRadius: 14, overflow: "hidden",
        }}>
          <div style={{
            display: "grid", gridTemplateColumns: "44px 1fr 60px 60px 60px 110px 110px 90px",
            padding: "10px 18px",
            fontSize: 10, fontFamily: "var(--font-mono)", textTransform: "uppercase",
            letterSpacing: 0.5, color: "var(--color-fg-4)", fontWeight: 600,
            borderBottom: "1px solid var(--color-hairline)",
          }}>
            <span>Code</span><span>Service</span><span>Total</span>
            <span>Served</span><span>No-show</span><span>Avg wait</span>
            <span>Avg service</span><span>Serve %</span>
          </div>
          {serviceMetrics.length === 0 ? (
            <div style={{ padding: "32px 18px", textAlign: "center", color: "var(--color-fg-4)", fontSize: 13 }}>
              No service activity in the last 24h
            </div>
          ) : serviceMetrics.map((s, idx) => (
            <div key={s.serviceId} style={{
              display: "grid", gridTemplateColumns: "44px 1fr 60px 60px 60px 110px 110px 90px",
              padding: "11px 18px", alignItems: "center",
              borderBottom: idx < serviceMetrics.length - 1 ? "1px solid var(--color-hairline)" : "none",
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: 6,
                background: "var(--color-primary-soft)", color: "var(--color-primary)",
                display: "grid", placeItems: "center",
                fontSize: 13, fontWeight: 700, fontFamily: "var(--font-mono)",
              }}>{s.serviceCode}</div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{s.serviceName}</div>
              <div style={{ fontSize: 13, fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{s.total}</div>
              <div style={{ fontSize: 13, fontVariantNumeric: "tabular-nums",
                color: "var(--color-success)", fontWeight: 600 }}>{s.served}</div>
              <div style={{ fontSize: 13, fontVariantNumeric: "tabular-nums",
                color: s.noShows > 0 ? "var(--color-warning)" : "var(--color-fg-3)" }}>{s.noShows}</div>
              <div style={{ fontSize: 12, color: "var(--color-fg-2)", fontFamily: "var(--font-mono)" }}>
                {s.avgWaitMinutes != null ? `~${s.avgWaitMinutes.toFixed(1)}m` : "—"}
              </div>
              <div style={{ fontSize: 12, color: "var(--color-fg-2)", fontFamily: "var(--font-mono)" }}>
                {s.avgServiceSeconds != null
                  ? `${Math.floor(s.avgServiceSeconds / 60)}m ${Math.round(s.avgServiceSeconds % 60)}s`
                  : "—"}
              </div>
              <div style={{
                fontSize: 12, fontWeight: 600, fontFamily: "var(--font-mono)",
                color: s.serveRate >= 80 ? "var(--color-success)"
                  : s.serveRate >= 50 ? "var(--color-warning)" : "var(--color-danger)",
              }}>
                {s.serveRate.toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      )}
      {activeTab === "staff" && (
        <div style={{
          background: "var(--color-surface)", border: "1px solid var(--color-border)",
          borderRadius: 14, overflow: "hidden",
        }}>
          <div style={{
            display: "grid", gridTemplateColumns: "60px 1fr 80px 80px 120px 100px",
            padding: "10px 18px",
            fontSize: 10, fontFamily: "var(--font-mono)", textTransform: "uppercase",
            letterSpacing: 0.5, color: "var(--color-fg-4)", fontWeight: 600,
            borderBottom: "1px solid var(--color-hairline)",
          }}>
            <span>Win #</span><span>Operator</span><span>Served</span>
            <span>No-show</span><span>Avg service</span><span>Rating</span>
          </div>
          {staffMetrics.length === 0 ? (
            <div style={{ padding: "32px 18px", textAlign: "center", color: "var(--color-fg-4)", fontSize: 13 }}>
              No window activity in the last 24h
            </div>
          ) : staffMetrics.map((s, idx) => (
            <div key={s.windowId} style={{
              display: "grid", gridTemplateColumns: "60px 1fr 80px 80px 120px 100px",
              padding: "12px 18px", alignItems: "center",
              borderBottom: idx < staffMetrics.length - 1 ? "1px solid var(--color-hairline)" : "none",
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: "var(--color-primary-soft)", color: "var(--color-primary)",
                display: "grid", placeItems: "center",
                fontSize: 13, fontWeight: 700, fontFamily: "var(--font-mono)",
              }}>{s.windowNumber}</div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>
                {s.windowLabel ?? `Window ${s.windowNumber}`}
              </div>
              <div style={{ fontSize: 13, fontVariantNumeric: "tabular-nums",
                color: "var(--color-success)", fontWeight: 600 }}>{s.served}</div>
              <div style={{ fontSize: 13, fontVariantNumeric: "tabular-nums",
                color: s.noShows > 0 ? "var(--color-warning)" : "var(--color-fg-3)" }}>{s.noShows}</div>
              <div style={{ fontSize: 12, color: "var(--color-fg-2)", fontFamily: "var(--font-mono)" }}>
                {s.avgServiceSeconds != null ? `${Math.round(s.avgServiceSeconds / 60)}m ${s.avgServiceSeconds % 60}s` : "—"}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600,
                color: s.avgRating != null && s.avgRating >= 4 ? "var(--color-success)"
                  : s.avgRating != null && s.avgRating < 3 ? "var(--color-danger)" : "var(--color-fg-3)" }}>
                {s.avgRating != null ? `${s.avgRating} ★` : "—"}
              </div>
            </div>
          ))}
        </div>
      )}
      {activeTab === "overview" && <>
        {/* Summary KPIs */}
        {(() => {
          const ratingMetrics = allMetrics.filter((m) => m.avgRating != null);
          const avgRatingAll = ratingMetrics.length > 0
            ? Math.round(ratingMetrics.reduce((s, m) => s + (m.avgRating ?? 0), 0) / ratingMetrics.length * 10) / 10
            : null;
          const totalRatings = allMetrics.reduce((s, m) => s + (m.ratingCount ?? 0), 0);
          const ratingStars = avgRatingAll != null ? "⭐".repeat(Math.round(avgRatingAll)) : "—";
          return (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
              <KpiCell label="Total tickets" value={totalTickets.toString()} sub="last 24h"/>
              <KpiCell label="Served" value={totalServed.toString()}
                sub={`${totalTickets > 0 ? Math.round(totalServed / totalTickets * 100) : 0}% completion`}
                accent="var(--color-success)"/>
              <KpiCell label="Avg wait" value={avgWait != null ? `~${avgWait}m` : "—"} sub="across all branches"/>
              <KpiCell label="No-show rate" value={`${avgNoShow}%`} sub="of tickets called"
                accent={avgNoShow > 20 ? "var(--color-danger)" : "var(--color-fg)"}/>
              <KpiCell label="Satisfaction"
                value={avgRatingAll != null ? `${avgRatingAll} / 5` : "—"}
                sub={totalRatings > 0 ? `${totalRatings} rating${totalRatings === 1 ? "" : "s"}` : "no ratings yet"}
                accent={avgRatingAll != null && avgRatingAll >= 4 ? "var(--color-success)"
                  : avgRatingAll != null && avgRatingAll < 3 ? "var(--color-danger)"
                  : "var(--color-fg)"}/>
            </div>
          );
        })()}

        {/* Hourly chart */}
        <div style={{
          background: "var(--color-surface)", border: "1px solid var(--color-border)",
          borderRadius: 14, padding: 18,
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-fg-3)",
            textTransform: "uppercase", letterSpacing: 0.5, fontFamily: "var(--font-mono)",
            marginBottom: 16 }}>
            Ticket flow — hourly
          </div>
          {chartData.length === 0 ? (
            <div style={{ height: 180, display: "grid", placeItems: "center",
              color: "var(--color-fg-4)", fontSize: 13 }}>
              No data for last 24h — create some tickets first
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gJoined" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gServed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-success)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--color-success)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-hairline)" vertical={false}/>
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: "var(--color-fg-3)" }}
                  tickLine={false} axisLine={false}/>
                <YAxis tick={{ fontSize: 10, fill: "var(--color-fg-3)" }}
                  tickLine={false} axisLine={false} allowDecimals={false}/>
                <Tooltip
                  contentStyle={{
                    background: "var(--color-surface)", border: "1px solid var(--color-border)",
                    borderRadius: 8, fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }}/>
                <Area type="monotone" dataKey="Joined" stroke="var(--color-primary)"
                  strokeWidth={2} fill="url(#gJoined)" dot={false}/>
                <Area type="monotone" dataKey="Served" stroke="var(--color-success)"
                  strokeWidth={2} fill="url(#gServed)" dot={false}/>
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Per-branch breakdown */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ height: 160, borderRadius: 14, background: "var(--color-surface)",
                border: "1px solid var(--color-border)", animation: "pulse 1.5s ease-in-out infinite" }}/>
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {branches.map((b) => {
              const m = metrics[b.id];
              if (!m) return null;
              return (
                <div key={b.id} style={{
                  background: "var(--color-surface)", border: "1px solid var(--color-border)",
                  borderRadius: 14, padding: 18,
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: -0.2 }}>{b.name}</div>
                      <div style={{ fontSize: 11, color: "var(--color-fg-3)", fontFamily: "var(--font-mono)", marginTop: 2 }}>
                        {m.total} tickets · {m.throughputPerHour}/hr throughput
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 999,
                        background: "var(--color-success-soft)", color: "var(--color-success)" }}>
                        {m.served} served
                      </span>
                      {m.noShows > 0 && (
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 999,
                          background: "var(--color-warning-soft)", color: "var(--color-warning)" }}>
                          {m.noShows} no-show
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 14 }}>
                    <KpiCell label="Avg wait" value={m.avgWaitMinutes != null ? `${m.avgWaitMinutes}m` : "—"}/>
                    <KpiCell label="No-show %" value={`${m.noShowRate.toFixed(1)}%`}
                      accent={m.noShowRate > 20 ? "var(--color-danger)" : undefined}/>
                    <KpiCell label="Remote share" value={`${m.remoteShare.toFixed(1)}%`} accent="var(--color-primary)"/>
                    <KpiCell label="Cancelled" value={m.cancelled.toString()}/>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <BranchBar label="Served" value={m.served} max={m.total} color="var(--color-success)"/>
                    <BranchBar label="No-show" value={m.noShows} max={m.total} color="var(--color-warning)"/>
                    <BranchBar label="Cancelled" value={m.cancelled} max={m.total} color="var(--color-danger)"/>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && branches.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--color-fg-3)" }}>
            No branches found.
          </div>
        )}
      </>}
      </div>
    </div>
  );
}
