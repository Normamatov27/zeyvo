"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { BranchDetail, Service, estimateWaitMin } from "@/lib/types";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        requestContact: () => void;
        onEvent: (event: string, callback: (data?: unknown) => void) => void;
        offEvent: (event: string, callback: (data?: unknown) => void) => void;
      };
    };
  }
}

export default function TgBranchPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [branch, setBranch] = useState<BranchDetail | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [hasTgWebApp, setHasTgWebApp] = useState(false);
  const [phoneShared, setPhoneShared] = useState(false);

  useEffect(() => {
    apiFetch<BranchDetail>(`/api/v1/branches/${id}`).then((b) => {
      setBranch(b);
      if (b.services[0]) setSelected(b.services[0]!.id);
    }).catch(() => {});
  }, [id]);

  useEffect(() => {
    // Check if Telegram WebApp is available
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      setHasTgWebApp(true);

      const handleContactShared = () => {
        setPhoneShared(true);
      };

      window.Telegram.WebApp.onEvent("contactRequested", handleContactShared);
      return () => {
        window.Telegram?.WebApp?.offEvent("contactRequested", handleContactShared);
      };
    }
  }, []);

  function sharePhone() {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.requestContact();
    }
  }

  async function joinQueue() {
    if (!branch || !selected || joining) return;
    setJoining(true);
    const svc = branch.services.find((s) => s.id === selected)!;
    try {
      const t = await apiFetch<{ id: string }>("/api/v1/tickets", {
        method: "POST",
        body: JSON.stringify({
          branchId: branch.id, serviceId: selected,
          serviceCode: svc.code, source: "telegram", branchCapacity: branch.capacity,
        }),
      });
      router.push(`/tg/ticket/${t.id}`);
    } catch { setJoining(false); }
  }

  if (!branch) return (
    <div style={{ padding: 40, textAlign: "center", color: "var(--color-fg-3)" }}>Loading…</div>
  );

  const openW = branch.windows.filter((w) => w.status === "open").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100svh" }}>
      <div style={{
        padding: "16px", background: "var(--color-surface)",
        borderBottom: "1px solid var(--color-hairline)",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <button onClick={() => router.back()} style={{
          width: 34, height: 34, borderRadius: 10, flex: "none",
          background: "var(--color-surface-2)", border: "1px solid var(--color-border)",
          display: "grid", placeItems: "center", cursor: "pointer", color: "var(--color-fg)",
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m15 18-6-6 6-6"/>
          </svg>
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{branch.name}</div>
          <div style={{ fontSize: 11, color: "var(--color-fg-3)" }}>{branch.address}</div>
        </div>
      </div>

      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-fg-3)" }}>
          {openW} windows open · {branch.activeTickets} in queue
        </div>

        {branch.services.filter((s) => s.active).map((svc) => {
          const sel = svc.id === selected;
          const wait = estimateWaitMin(branch.activeTickets, svc.avgDurationS, openW);
          return (
            <div key={svc.id} onClick={() => setSelected(svc.id)} style={{
              padding: 14, borderRadius: 12,
              border: `1.5px solid ${sel ? "var(--color-primary)" : "var(--color-border)"}`,
              background: sel ? "var(--color-primary-soft)" : "var(--color-surface)",
              cursor: "pointer",
            }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{svc.name}</div>
              <div style={{ fontSize: 12, color: "var(--color-fg-3)", marginTop: 3 }}>
                ~{wait} min wait
              </div>
            </div>
          );
        })}

        {/* Telegram phone share — only shown inside Telegram WebApp */}
        {hasTgWebApp && (
          <div>
            {phoneShared ? (
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "10px 14px", borderRadius: 10,
                background: "var(--color-success-soft)",
                color: "var(--color-success)",
                fontSize: 13, fontWeight: 500,
              }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Notifications enabled
              </div>
            ) : (
              <button
                type="button"
                onClick={sharePhone}
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: 10,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface-2)",
                  color: "var(--color-fg-2)", fontSize: 13, fontWeight: 500,
                  cursor: "pointer", textAlign: "left",
                  display: "flex", alignItems: "center", gap: 8,
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6.09 6.09l.92-.92a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
                Share phone number to get updates
              </button>
            )}
          </div>
        )}

        <button onClick={joinQueue} disabled={!selected || joining} style={{
          marginTop: "auto", padding: "14px 0", borderRadius: 14, border: "none",
          background: joining ? "var(--color-fg-4)" : "var(--color-primary)",
          color: "#fff", fontSize: 15, fontWeight: 600, cursor: joining ? "not-allowed" : "pointer",
        }}>
          {joining ? "Joining…" : "Take ticket"}
        </button>
      </div>
    </div>
  );
}
