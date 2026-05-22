"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { BranchDetail, Ticket, TicketStatus, fmtClock, fmtEta } from "@/lib/types";
import { getStompClient, subscribeBranchQueue } from "@/lib/realtime";
import { useAuthStore } from "@/stores/auth";

const STATUS_COLOR: Record<string, string> = {
  waiting: "var(--color-primary)",
  called: "var(--color-warning)",
  serving: "var(--color-success)",
};
const STATUS_SOFT: Record<string, string> = {
  waiting: "var(--color-primary-soft)",
  called: "var(--color-warning-soft)",
  serving: "var(--color-success-soft)",
};
const SOURCE_LABEL: Record<string, string> = {
  remote: "Remote",
  kiosk: "Kiosk",
  telegram: "Telegram",
  walk_in: "Walk-in",
  agent: "Agent",
};

function WaitBadge({ joinedAt }: { joinedAt: string }) {
  const [mins, setMins] = useState(() =>
    Math.floor((Date.now() - new Date(joinedAt).getTime()) / 60000)
  );
  useEffect(() => {
    const iv = setInterval(
      () => setMins(Math.floor((Date.now() - new Date(joinedAt).getTime()) / 60000)),
      30000
    );
    return () => clearInterval(iv);
  }, [joinedAt]);
  const color = mins >= 10 ? "var(--color-danger)" : mins >= 5 ? "var(--color-warning)" : "var(--color-fg-3)";
  return (
    <span style={{ fontSize: 11, color, fontFamily: "var(--font-mono)" }}>
      {mins}m wait
    </span>
  );
}

function TicketRow({ ticket, onCall, onTransfer, isFirst }: {
  ticket: Ticket;
  onCall?: () => void;
  onTransfer?: () => void;
  isFirst?: boolean;
}) {
  const color = STATUS_COLOR[ticket.status] ?? "var(--color-fg-3)";
  const soft = STATUS_SOFT[ticket.status] ?? "var(--color-surface-2)";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 12px", borderRadius: 10,
      background: isFirst ? soft : "transparent",
      border: isFirst ? `1px solid ${color}22` : "1px solid transparent",
      marginBottom: 4,
    }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", flex: "none", background: color }}/>
      <div style={{
        fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700,
        width: 60, fontVariantNumeric: "tabular-nums",
      }}>
        {ticket.number}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: "var(--color-fg-2)", fontWeight: 500 }}>
          {ticket.serviceName ?? (SOURCE_LABEL[ticket.source] ?? ticket.source)}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {ticket.serviceName && (
            <span style={{ fontSize: 11, color: "var(--color-fg-4)", fontFamily: "var(--font-mono)" }}>
              {SOURCE_LABEL[ticket.source] ?? ticket.source}
            </span>
          )}
          <WaitBadge joinedAt={ticket.joinedAt}/>
        </div>
      </div>
      <span style={{
        fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999,
        background: soft, color, fontFamily: "var(--font-mono)",
        textTransform: "uppercase",
      }}>
        {ticket.status}
      </span>
      {ticket.status === "waiting" && onTransfer && (
        <button onClick={onTransfer} style={{
          padding: "4px 8px", borderRadius: 6,
          border: "1px solid var(--color-border)",
          background: "transparent", color: "var(--color-fg-3)",
          fontSize: 11, fontWeight: 500, cursor: "pointer", flex: "none",
        }}>
          Transfer
        </button>
      )}
      {ticket.status === "waiting" && onCall && (
        <button onClick={onCall} style={{
          padding: "4px 10px", borderRadius: 6, border: "none",
          background: "var(--color-primary)", color: "#fff",
          fontSize: 11, fontWeight: 600, cursor: "pointer", flex: "none",
        }}>
          Call
        </button>
      )}
    </div>
  );
}

function QueuePanelInner() {
  const params = useSearchParams();
  const branchId = params.get("branchId");
  const { roles } = useAuthStore();
  const isOperator = roles.includes("operator") && !roles.includes("manager") && !roles.includes("org_admin") && !roles.includes("super_admin");

  const [branches, setBranches] = useState<BranchDetail[]>([]);
  const [activeBranch, setActiveBranch] = useState<BranchDetail | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedWindowId, setSelectedWindowId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [calling, setCalling] = useState(false);
  const [marking, setMarking] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [transferTicket, setTransferTicket] = useState<Ticket | null>(null);
  const [transferToWindowId, setTransferToWindowId] = useState("");
  const [transferring, setTransferring] = useState(false);
  const [assignedWindow, setAssignedWindow] = useState<{ id: string; number: number; label?: string } | null>(null);
  const [assignedWindowChecked, setAssignedWindowChecked] = useState(false);
  const subRef = useRef<{ unsubscribe: () => void } | null>(null);
  const activeBranchRef = useRef<BranchDetail | null>(null);
  const selectedWindowRef = useRef<string | null>(null);

  // For operators: fetch their assigned window on mount
  useEffect(() => {
    if (!isOperator) { setAssignedWindowChecked(true); return; }
    apiFetch<{ id: string; number: number; label?: string }>("/api/v1/windows/my")
      .then((w) => {
        setAssignedWindow(w);
        setSelectedWindowId(w.id);
        selectedWindowRef.current = w.id;
      })
      .catch(() => {})
      .finally(() => setAssignedWindowChecked(true));
  }, [isOperator]);

  async function loadBranches(keepWindow = false) {
    try {
      const list = await apiFetch<{ id: string }[]>("/api/v1/admin/branches");
      const details = await Promise.allSettled(
        list.map((b) => apiFetch<BranchDetail>(`/api/v1/branches/${b.id}`))
      );
      const resolved = details
        .filter((r) => r.status === "fulfilled")
        .map((r) => (r as PromiseFulfilledResult<BranchDetail>).value);
      setBranches(resolved);
      const target = branchId ? resolved.find((b) => b.id === branchId) : resolved[0];
      if (target) {
        setActiveBranch(target);
        activeBranchRef.current = target;
        // Auto-select: prefer open window, otherwise take the first available
        if (!keepWindow || !selectedWindowRef.current) {
          const preferred =
            target.windows.find((w) => w.status === "open") ?? target.windows[0];
          if (preferred) {
            setSelectedWindowId(preferred.id);
            selectedWindowRef.current = preferred.id;
          }
        }
      }
    } catch {}
  }

  async function loadTickets(bid: string) {
    try {
      const list = await apiFetch<Ticket[]>(`/api/v1/tickets?branchId=${bid}`);
      setTickets(list);
    } catch {}
  }

  useEffect(() => {
    loadBranches().finally(() => setLoading(false));
  }, [branchId]);

  useEffect(() => {
    if (!activeBranch) return;
    loadTickets(activeBranch.id);

    subRef.current?.unsubscribe();
    const stomp = getStompClient();
    const connect = () => {
      subRef.current = subscribeBranchQueue(stomp, activeBranch.id, () => {
        const bid = activeBranchRef.current?.id;
        if (bid) loadTickets(bid);
      });
    };
    if (stomp.connected) connect();
    else stomp.onConnect = connect;

    const iv = setInterval(() => {
      const bid = activeBranchRef.current?.id;
      if (bid) loadTickets(bid);
    }, 15_000);
    return () => {
      clearInterval(iv);
      subRef.current?.unsubscribe();
    };
  }, [activeBranch?.id]);

  async function callNext() {
    if (!activeBranch || calling) return;
    const wid = selectedWindowRef.current ?? selectedWindowId;
    if (!wid) {
      setActionError("Select a window first.");
      return;
    }
    setCalling(true);
    setActionError(null);

    const selectedWindow = activeBranch.windows.find((w) => w.id === wid);
    const windowNumber = selectedWindow?.number ?? 0;

    try {
      // Ensure the window is open before calling
      if (selectedWindow?.status !== "open") {
        await apiFetch(`/api/v1/windows/${wid}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status: "open" }),
        });
      }

      await apiFetch(
        `/api/v1/windows/${wid}/call-next?branchId=${activeBranch.id}&windowNumber=${windowNumber}`,
        { method: "POST" }
      );

      await Promise.all([loadBranches(true), loadTickets(activeBranch.id)]);
    } catch (e: any) {
      const msg = e instanceof ApiError ? e.message : "Failed to call next";
      setActionError(msg);
    } finally {
      setCalling(false);
    }
  }

  async function markServed() {
    if (!selectedWindowId || !currentlyServing || marking) return;
    setMarking(true);
    setActionError(null);
    try {
      await apiFetch(`/api/v1/windows/${selectedWindowId}/serve?ticketId=${currentlyServing.id}`, {
        method: "POST",
      });
      await loadTickets(activeBranch!.id);
    } catch (e: any) {
      setActionError(e instanceof ApiError ? e.message : "Failed to mark served");
    } finally {
      setMarking(false);
    }
  }

  async function markNoShow() {
    if (!selectedWindowId || !currentlyServing || marking) return;
    setMarking(true);
    setActionError(null);
    try {
      await apiFetch(`/api/v1/windows/${selectedWindowId}/no-show?ticketId=${currentlyServing.id}`, {
        method: "POST",
      });
      await loadTickets(activeBranch!.id);
    } catch (e: any) {
      setActionError(e instanceof ApiError ? e.message : "Failed to mark no-show");
    } finally {
      setMarking(false);
    }
  }

  async function doTransfer() {
    if (!transferTicket || !transferToWindowId || transferring) return;
    setTransferring(true);
    setActionError(null);
    try {
      await apiFetch(`/api/v1/tickets/${transferTicket.id}/transfer`, {
        method: "POST",
        body: JSON.stringify({ toWindowId: transferToWindowId }),
      });
      setTransferTicket(null);
      setTransferToWindowId("");
      await loadTickets(activeBranch!.id);
    } catch (e: any) {
      setActionError(e instanceof ApiError ? e.message : "Transfer failed");
    } finally {
      setTransferring(false);
    }
  }

  async function toggleWindow(wid: string, currentStatus: string) {
    const next = currentStatus === "open" ? "closed" : "open";
    try {
      await apiFetch(`/api/v1/windows/${wid}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      });
      await loadBranches(true);
    } catch (e: any) {
      setActionError(e instanceof ApiError ? e.message : "Failed to update window");
    }
  }

  const waiting = tickets
    .filter((t) => t.status === "waiting")
    .sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime());
  const active = tickets.filter((t) => t.status === "serving" || t.status === "called");
  const currentlyServing =
    active.find((t) => t.windowId === selectedWindowId) ?? active[0] ?? null;

  const windows = activeBranch?.windows ?? [];
  const openCount = windows.filter((w) => w.status === "open").length;

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--color-fg-3)", fontSize: 14 }}>
        Loading queue…
      </div>
    );
  }

  if (!activeBranch) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--color-fg-3)", fontSize: 14 }}>
        No branches found.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Transfer modal */}
      {transferTicket && (
        <div
          onClick={() => { setTransferTicket(null); setTransferToWindowId(""); }}
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            background: "rgba(0,0,0,0.5)", backdropFilter: "blur(3px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--color-surface)", borderRadius: 18, padding: 24,
              width: "100%", maxWidth: 340, display: "flex", flexDirection: "column", gap: 16,
            }}
          >
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.3 }}>
                Transfer {transferTicket.number}
              </div>
              <div style={{ fontSize: 12, color: "var(--color-fg-3)", marginTop: 3 }}>
                Move this ticket to a specific window queue
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--color-fg-3)", fontWeight: 600,
                textTransform: "uppercase", letterSpacing: 0.5, fontFamily: "var(--font-mono)" }}>
                Target window
              </label>
              <select
                value={transferToWindowId}
                onChange={(e) => setTransferToWindowId(e.target.value)}
                style={{
                  marginTop: 6, width: "100%", padding: "9px 12px", borderRadius: 10,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-bg)", color: "var(--color-fg)",
                  fontSize: 14, cursor: "pointer",
                }}
              >
                <option value="">Select window…</option>
                {windows.map((w) => (
                  <option key={w.id} value={w.id}>
                    Window {w.number}{w.label ? ` — ${w.label}` : ""} ({w.status})
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => { setTransferTicket(null); setTransferToWindowId(""); }}
                style={{
                  flex: 1, padding: "10px 0", borderRadius: 10,
                  border: "1px solid var(--color-border)",
                  background: "transparent", color: "var(--color-fg-3)",
                  fontSize: 13, fontWeight: 500, cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={doTransfer}
                disabled={!transferToWindowId || transferring}
                style={{
                  flex: 2, padding: "10px 0", borderRadius: 10, border: "none",
                  background: !transferToWindowId ? "var(--color-surface-3)" : "var(--color-primary)",
                  color: !transferToWindowId ? "var(--color-fg-3)" : "#fff",
                  fontSize: 13, fontWeight: 600,
                  cursor: !transferToWindowId ? "not-allowed" : "pointer",
                }}
              >
                {transferring ? "Transferring…" : "Transfer →"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div style={{
        height: 56, padding: "0 24px",
        display: "flex", alignItems: "center", gap: 12,
        borderBottom: "1px solid var(--color-hairline)",
        background: "var(--color-surface)", flexShrink: 0,
      }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10 }}>
          <div>
            <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: -0.2 }}>Queue</span>
            <span style={{ fontSize: 12, color: "var(--color-fg-3)", marginLeft: 10 }}>
              {waiting.length} waiting · {active.length} serving · {openCount} windows open
            </span>
          </div>
        </div>

        {branches.length > 1 && (
          <select
            value={activeBranch.id}
            onChange={(e) => {
              const b = branches.find((x) => x.id === e.target.value);
              if (b) {
                setActiveBranch(b);
                activeBranchRef.current = b;
                const preferred = b.windows.find((w) => w.status === "open") ?? b.windows[0];
                const wid = preferred?.id ?? null;
                setSelectedWindowId(wid);
                selectedWindowRef.current = wid;
              }
            }}
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

        <button
          onClick={() => loadTickets(activeBranch.id)}
          title="Refresh"
          style={{
            width: 32, height: 32, borderRadius: 8, border: "1px solid var(--color-border)",
            background: "transparent", color: "var(--color-fg-2)", cursor: "pointer",
            display: "grid", placeItems: "center",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M21.5 2v6h-6M2.5 22v-6h6"/><path d="M22 13A10 10 0 0 1 3.5 8.5M2 11a10 10 0 0 1 18.5 4.5"/>
          </svg>
        </button>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Left: operator workspace */}
        <div style={{
          width: 280, flexShrink: 0, borderRight: "1px solid var(--color-hairline)",
          padding: 18, display: "flex", flexDirection: "column", gap: 14, overflow: "auto",
          background: "var(--color-surface)",
        }}>
          {/* Window picker / operator window */}
          <div>
            <div style={{
              fontSize: 10, fontWeight: 600, color: "var(--color-fg-3)",
              textTransform: "uppercase", letterSpacing: 0.6, fontFamily: "var(--font-mono)",
              marginBottom: 8,
            }}>My window</div>
            {isOperator ? (
              !assignedWindowChecked ? (
                <div style={{ fontSize: 12, color: "var(--color-fg-3)" }}>Loading…</div>
              ) : assignedWindow ? (
                <div style={{
                  padding: "8px 12px", borderRadius: 8,
                  border: "1.5px solid var(--color-primary)",
                  background: "var(--color-primary-soft)",
                  color: "var(--color-primary)",
                  fontSize: 13, fontWeight: 600,
                }}>
                  Window {assignedWindow.number}{assignedWindow.label ? ` — ${assignedWindow.label}` : ""}
                </div>
              ) : (
                <div style={{
                  fontSize: 12, color: "var(--color-fg-3)",
                  background: "var(--color-surface-2)", borderRadius: 8,
                  padding: "10px 12px", lineHeight: 1.5,
                  border: "1px dashed var(--color-border)",
                }}>
                  No window assigned.<br/>Ask your manager to assign you to a window.
                </div>
              )
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {windows.map((w) => {
                  const sel = selectedWindowId === w.id;
                  const open = w.status === "open";
                  return (
                    <button
                      key={w.id}
                      onClick={() => {
                        setSelectedWindowId(w.id);
                        selectedWindowRef.current = w.id;
                      }}
                      style={{
                        padding: "6px 11px", borderRadius: 8, cursor: "pointer",
                        border: `1.5px solid ${sel ? "var(--color-primary)" : open ? "var(--color-success)" : "var(--color-border)"}`,
                        background: sel ? "var(--color-primary-soft)" : "transparent",
                        color: sel ? "var(--color-primary)" : open ? "var(--color-success)" : "var(--color-fg-3)",
                        fontSize: 12, fontWeight: 600,
                      }}
                    >
                      W{w.number}
                      {open && !sel && (
                        <span style={{ marginLeft: 4, width: 5, height: 5, borderRadius: "50%",
                          background: "var(--color-success)", display: "inline-block", verticalAlign: "middle" }}/>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Currently serving */}
          {currentlyServing ? (
            <div style={{
              background: "var(--color-success-soft)", borderRadius: 12, padding: 14,
              border: "1px solid var(--color-success)",
            }}>
              <div style={{
                fontSize: 10, fontWeight: 600, color: "var(--color-success)",
                textTransform: "uppercase", letterSpacing: 0.5, fontFamily: "var(--font-mono)",
                marginBottom: 6,
              }}>Now serving</div>
              <div style={{
                fontSize: 40, fontWeight: 700, letterSpacing: -1.5,
                fontVariantNumeric: "tabular-nums", lineHeight: 1,
              }}>
                {currentlyServing.number}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--color-fg-3)", marginTop: 6 }}>
                {currentlyServing.serviceName && (
                  <span style={{ color: "var(--color-fg-2)", fontWeight: 500 }}>
                    {currentlyServing.serviceName}{" · "}
                  </span>
                )}
                {SOURCE_LABEL[currentlyServing.source] ?? currentlyServing.source}
                {" · "}joined {fmtClock(currentlyServing.joinedAt)}
              </div>
              <div style={{
                marginTop: 8, padding: "4px 8px", borderRadius: 6, display: "inline-block",
                fontSize: 11, fontWeight: 600,
                background: currentlyServing.status === "called" ? "var(--color-warning-soft)" : "transparent",
                color: currentlyServing.status === "called" ? "var(--color-warning)" : "transparent",
              }}>
                {currentlyServing.status === "called" ? "Waiting for customer…" : ""}
              </div>
            </div>
          ) : (
            <div style={{
              background: "var(--color-surface-2)", borderRadius: 12, padding: 14,
              textAlign: "center", color: "var(--color-fg-3)", fontSize: 13,
              border: "1px dashed var(--color-border-2)",
            }}>
              Window idle
            </div>
          )}

          {/* Error */}
          {actionError && (
            <div style={{
              fontSize: 12, color: "var(--color-danger)",
              padding: "8px 12px", borderRadius: 8,
              background: "var(--color-danger-soft)",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {actionError}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            <button
              onClick={callNext}
              disabled={calling}
              style={{
                padding: "13px 0", borderRadius: 10, border: "none",
                background: calling ? "var(--color-fg-4)" : "var(--color-primary)",
                color: "#fff", fontSize: 14, fontWeight: 600,
                cursor: calling ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}
            >
              {calling ? (
                <>
                  <span style={{
                    width: 13, height: 13, borderRadius: "50%",
                    border: "2px solid rgba(255,255,255,0.35)", borderTopColor: "#fff",
                    animation: "spin 0.7s linear infinite", flex: "none",
                  }}/>
                  Calling…
                </>
              ) : currentlyServing ? "Call next ↓" : "Call next"}
            </button>

            {currentlyServing && (
              <>
                <button
                  onClick={markServed}
                  disabled={marking}
                  style={{
                    padding: "10px 0", borderRadius: 10,
                    border: "1.5px solid var(--color-success)",
                    background: "transparent", color: "var(--color-success)",
                    fontSize: 13, fontWeight: 600, cursor: marking ? "not-allowed" : "pointer",
                  }}
                >
                  Mark served ✓
                </button>
                <button
                  onClick={markNoShow}
                  disabled={marking}
                  style={{
                    padding: "10px 0", borderRadius: 10,
                    border: "1.5px solid var(--color-border-2)",
                    background: "transparent", color: "var(--color-fg-3)",
                    fontSize: 13, fontWeight: 500, cursor: marking ? "not-allowed" : "pointer",
                  }}
                >
                  No-show
                </button>
              </>
            )}
          </div>

          {/* Window open/close toggle */}
          {selectedWindowId && (
            <div style={{ borderTop: "1px solid var(--color-hairline)", paddingTop: 12, marginTop: 4 }}>
              {(() => {
                const w = windows.find((x) => x.id === selectedWindowId);
                if (!w) return null;
                const isOpen = w.status === "open";
                return (
                  <button
                    onClick={() => toggleWindow(w.id, w.status)}
                    style={{
                      width: "100%", padding: "9px 0", borderRadius: 9,
                      border: `1.5px solid ${isOpen ? "var(--color-border-2)" : "var(--color-success)"}`,
                      background: "transparent",
                      color: isOpen ? "var(--color-fg-3)" : "var(--color-success)",
                      fontSize: 12, fontWeight: 500, cursor: "pointer",
                    }}
                  >
                    {isOpen ? "Close window" : "Open window"}
                  </button>
                );
              })()}
            </div>
          )}
        </div>

        {/* Right: queue list */}
        <div style={{ flex: 1, padding: "18px 20px", overflow: "auto" }}>
          {active.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{
                fontSize: 10, fontWeight: 600, color: "var(--color-success)",
                textTransform: "uppercase", letterSpacing: 0.5, fontFamily: "var(--font-mono)",
                marginBottom: 6, paddingLeft: 12,
              }}>
                Being served ({active.length})
              </div>
              {active.map((t) => <TicketRow key={t.id} ticket={t}/>)}
            </div>
          )}

          <div style={{
            fontSize: 10, fontWeight: 600, color: "var(--color-fg-3)",
            textTransform: "uppercase", letterSpacing: 0.5, fontFamily: "var(--font-mono)",
            marginBottom: 6, paddingLeft: 12,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span>Waiting ({waiting.length})</span>
          </div>

          {waiting.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: "var(--color-fg-3)" }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>✓</div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Queue is empty</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>All caught up</div>
            </div>
          ) : (
            waiting.map((t, i) => (
              <TicketRow
                key={t.id}
                ticket={t}
                isFirst={i === 0}
                onCall={i === 0 ? callNext : undefined}
                onTransfer={() => {
                  setTransferTicket(t);
                  setTransferToWindowId("");
                }}
              />
            ))
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function QueuePage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, color: "var(--color-fg-3)" }}>Loading…</div>}>
      <QueuePanelInner />
    </Suspense>
  );
}
