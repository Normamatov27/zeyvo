"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { apiFetch } from "@/lib/api";
import { BranchDetail, Service, estimateWaitMin } from "@/lib/types";
import { FullPageLoader } from "@/components/Loader";

export default function TgBranchPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const t = useTranslations("tg");
  const tb = useTranslations("branch");
  const [branch, setBranch] = useState<BranchDetail | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    apiFetch<BranchDetail>(`/api/v1/branches/${id}`).then((b) => {
      setBranch(b);
      if (b.services[0]) setSelected(b.services[0]!.id);
    }).catch(() => {});
  }, [id]);

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

  if (!branch) return <FullPageLoader variant="dark"/>;

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
          {tb("people_windows", { people: branch.activeTickets, windows: openW })}
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
                {tb("min_wait", { wait })}
              </div>
            </div>
          );
        })}

        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
          <button onClick={joinQueue} disabled={!selected || joining} style={{
            padding: "14px 0", borderRadius: 14, border: "none",
            background: joining ? "var(--color-fg-4)" : "var(--color-primary)",
            color: "#fff", fontSize: 15, fontWeight: 600, cursor: joining ? "not-allowed" : "pointer",
          }}>
            {joining ? t("joining") : t("take_ticket")}
          </button>
          <button onClick={() => router.push(`/tg/book/${id}` as any)} style={{
            padding: "12px 0", borderRadius: 14,
            border: "1px solid var(--color-border)", background: "var(--color-surface)",
            color: "var(--color-fg-2)", fontSize: 14, fontWeight: 500, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            Book for later
          </button>
        </div>
      </div>
    </div>
  );
}
