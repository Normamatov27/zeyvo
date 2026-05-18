"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { BranchDetail, estimateWaitMin } from "@/lib/types";

export default function PredictPage() {
  const [branches, setBranches] = useState<BranchDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const list = await apiFetch<{ id: string }[]>("/api/v1/branches");
        const details = await Promise.allSettled(
          list.map((b) => apiFetch<BranchDetail>(`/api/v1/branches/${b.id}`))
        );
        setBranches(
          details
            .filter((r) => r.status === "fulfilled")
            .map((r) => (r as PromiseFulfilledResult<BranchDetail>).value)
        );
      } catch {}
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{
        height: 56, padding: "0 24px",
        display: "flex", alignItems: "center", gap: 12,
        borderBottom: "1px solid var(--color-hairline)",
        background: "var(--color-surface)",
      }}>
        <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: -0.3, flex: 1 }}>Predictions</span>
        <span style={{
          fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 999,
          background: "var(--color-primary-soft)", color: "var(--color-primary)",
          fontFamily: "var(--font-mono)", textTransform: "uppercase",
        }}>Preview</span>
      </div>

      <div style={{ flex: 1, padding: 24, overflow: "auto", display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Notice banner */}
        <div style={{
          background: "var(--color-primary-soft)", borderRadius: 12, padding: "14px 18px",
          display: "flex", gap: 12, alignItems: "flex-start",
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)"
            strokeWidth="2" style={{ flex: "none", marginTop: 1 }}>
            <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
          </svg>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-primary)", marginBottom: 4 }}>
              Crowd predictions unlock after 30 days of data
            </div>
            <div style={{ fontSize: 12, color: "var(--color-primary)", opacity: 0.8 }}>
              Once you have enough historical ticket data per branch, zeyvo will predict next-2h crowd levels,
              flag likely busy periods, and suggest optimal staffing. Currently showing live heuristic ETAs only.
            </div>
          </div>
        </div>

        {/* Live heuristic ETA per branch — what we can show now */}
        <div style={{
          background: "var(--color-surface)", border: "1px solid var(--color-border)",
          borderRadius: 14, overflow: "hidden",
        }}>
          <div style={{
            padding: "14px 18px", borderBottom: "1px solid var(--color-hairline)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Live ETA estimates (heuristic)</div>
            <span style={{ fontSize: 11, color: "var(--color-fg-3)", fontFamily: "var(--font-mono)" }}>
              tickets × avg_service ÷ open_windows
            </span>
          </div>

          {loading ? (
            <div style={{ padding: 24 }}>
              {[1, 2, 3].map((i) => (
                <div key={i} style={{ height: 48, borderRadius: 8, background: "var(--color-surface-2)",
                  marginBottom: 8 }}/>
              ))}
            </div>
          ) : branches.map((b, idx) => {
            const openW = b.windows.filter((w) => w.status === "open").length;
            const waitMin = estimateWaitMin(b.activeTickets, b.avgServiceS || 300, openW);
            const confidence = b.activeTickets > 0 && openW > 0 ? "high" : "low";
            return (
              <div key={b.id} style={{
                padding: "14px 18px",
                display: "flex", alignItems: "center", gap: 16,
                borderBottom: idx < branches.length - 1 ? "1px solid var(--color-hairline)" : "none",
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{b.name}</div>
                  <div style={{ fontSize: 11, color: "var(--color-fg-3)", marginTop: 1 }}>
                    {b.activeTickets} waiting · {openW} windows
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.5,
                    fontVariantNumeric: "tabular-nums" }}>~{waitMin}m</div>
                  <div style={{ fontSize: 10, color: confidence === "high" ? "var(--color-success)" : "var(--color-fg-4)",
                    fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>
                    {confidence} confidence
                  </div>
                </div>
              </div>
            );
          })}

          {!loading && branches.length === 0 && (
            <div style={{ padding: "32px 18px", textAlign: "center", color: "var(--color-fg-3)", fontSize: 13 }}>
              No branches found.
            </div>
          )}
        </div>

        {/* What's coming */}
        <div style={{
          background: "var(--color-surface)", border: "1px solid var(--color-border)",
          borderRadius: 14, padding: 18,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Coming in Phase 2</div>
          {[
            { title: "Next-2h crowd forecast", desc: "Line chart of predicted vs historical volume, updated hourly." },
            { title: "Peak hour alerts", desc: "\"Tomorrow 10–11am will be ~30% busier than usual — open an extra window?\"" },
            { title: "Leave-home assistant", desc: "Pushes \"leave now\" to waiting customers based on travel time + current ETA." },
            { title: "Staffing recommendations", desc: "Suggests optimal window count per half-hour slot based on forecast." },
          ].map((item) => (
            <div key={item.title} style={{
              display: "flex", gap: 12, marginBottom: 12,
              paddingBottom: 12, borderBottom: "1px solid var(--color-hairline)",
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: "50%", flex: "none",
                background: "var(--color-fg-4)", marginTop: 6,
              }}/>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-fg)", marginBottom: 2 }}>
                  {item.title}
                </div>
                <div style={{ fontSize: 12, color: "var(--color-fg-3)" }}>{item.desc}</div>
              </div>
            </div>
          ))}
          <div style={{ fontSize: 11, color: "var(--color-fg-4)", fontFamily: "var(--font-mono)" }}>
            Unlocks automatically once 30 days of ticket data exists per branch.
          </div>
        </div>
      </div>
    </div>
  );
}
