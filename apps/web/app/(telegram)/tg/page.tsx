"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Branch, branchLoadLevel, estimateWaitMin } from "@/lib/types";

export default function TgHomePage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<Branch[]>("/api/v1/branches")
      .then(setBranches)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100svh" }}>
      {/* Header */}
      <div style={{
        padding: "16px 16px 12px",
        background: "var(--color-surface)",
        borderBottom: "1px solid var(--color-hairline)",
      }}>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.4,
          color: "var(--color-primary)" }}>zeyvo</div>
        <div style={{ fontSize: 12, color: "var(--color-fg-3)", marginTop: 2 }}>
          Choose a location to join its queue
        </div>
      </div>

      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} style={{
              height: 80, borderRadius: 12,
              background: "var(--color-surface)",
              animation: "pulse 1.5s ease-in-out infinite",
            }}/>
          ))
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
                  <div style={{
                    width: 44, height: 44, borderRadius: 10, flex: "none",
                    background: "var(--color-primary-soft)", color: "var(--color-primary)",
                    display: "grid", placeItems: "center",
                    fontSize: 18, fontWeight: 700,
                  }}>
                    {(b.shortName ?? b.name).charAt(0)}
                  </div>
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
                      {b.activeTickets} in queue
                    </div>
                  </div>
                </div>
              </Link>
            );
          })
        )}

        {!loading && branches.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--color-fg-3)" }}>
            <div style={{ fontSize: 14 }}>No branches available</div>
          </div>
        )}
      </div>
    </div>
  );
}
