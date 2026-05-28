"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown, RefreshCw, Plus, ArrowRightLeft, Timer, CheckCircle2, UserX } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { BranchDetail, Ticket, fmtClock, WindowDesk } from "@/lib/types";
import { subscribeBranchQueue, onConnectionStateChange } from "@/lib/realtime";
import { useAuthStore } from "@/stores/auth";
import {
  Button,
  StatusPill,
  TicketNumber,
  ConnectionBadge,
  ConnectionState,
  AlertCard,
  Badge,
  Modal,
  ModalContent,
  ModalFooter,
  Sheet,
  SheetContent,
  SheetFooter,
  Field,
  Select,
  toast,
} from "@/components/ui";
import { cn } from "@/lib/utils";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SOURCE_LABEL: Record<string, string> = {
  remote: "Remote", kiosk: "Kiosk", telegram: "TG",
  walk_in: "Walk-in", agent: "Agent",
};

function useElapsedTimer(startIso: string | null | undefined) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!startIso) { setElapsed(0); return; }
    const update = () => setElapsed(Math.floor((Date.now() - new Date(startIso).getTime()) / 1000));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [startIso]);
  const m = Math.floor(elapsed / 60).toString().padStart(2, "0");
  const s = (elapsed % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function useWaitMins(joinedAt: string) {
  const [mins, setMins] = useState(() =>
    Math.floor((Date.now() - new Date(joinedAt).getTime()) / 60000)
  );
  useEffect(() => {
    const id = setInterval(
      () => setMins(Math.floor((Date.now() - new Date(joinedAt).getTime()) / 60000)),
      30_000
    );
    return () => clearInterval(id);
  }, [joinedAt]);
  return mins;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function WaitMins({ joinedAt }: { joinedAt: string }) {
  const mins = useWaitMins(joinedAt);
  return (
    <span className={cn(
      "text-xs font-mono tabular-nums",
      mins >= 10 ? "text-danger" : mins >= 5 ? "text-warning" : "text-fg-4"
    )}>
      {mins}m
    </span>
  );
}

function QueueRow({ ticket, onCall, onTransfer, highlight }: {
  ticket: Ticket;
  onCall?: () => void;
  onTransfer?: () => void;
  highlight?: boolean;
}) {
  return (
    <div className={cn(
      "flex items-center gap-2.5 px-3 py-2.5 rounded-3 border transition-colors",
      highlight
        ? "bg-primary-soft border-primary/20"
        : "bg-transparent border-transparent hover:bg-surface-2"
    )}>
      <StatusPill status={ticket.status} dot />
      <span className="font-mono text-sm font-bold w-16 tabular-nums text-fg">{ticket.number}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-fg-2 font-medium truncate">
          {ticket.serviceName ?? SOURCE_LABEL[ticket.source] ?? ticket.source}
        </p>
        <div className="flex items-center gap-2">
          {ticket.serviceName && (
            <span className="text-xs text-fg-4">{SOURCE_LABEL[ticket.source] ?? ticket.source}</span>
          )}
          <WaitMins joinedAt={ticket.joinedAt} />
        </div>
      </div>
      {onTransfer && (
        <Button variant="ghost" size="sm" onClick={onTransfer} title="Transfer ticket">
          <ArrowRightLeft size={13} />
        </Button>
      )}
      {onCall && (
        <Button variant="primary" size="sm" onClick={onCall}>
          Call
        </Button>
      )}
    </div>
  );
}

// ─── Walk-in sheet ────────────────────────────────────────────────────────────

function WalkInSheet({ open, onOpenChange, services, branchId, onCreated }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  services: BranchDetail["services"];
  branchId: string;
  onCreated: () => void;
}) {
  const [serviceId, setServiceId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    if (!serviceId) return;
    setLoading(true); setError(null);
    try {
      await apiFetch("/api/v1/tickets", {
        method: "POST",
        body: JSON.stringify({ branchId, serviceId, source: "walk_in" }),
      });
      toast.success("Walk-in ticket created");
      setServiceId("");
      onOpenChange(false);
      onCreated();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to create ticket");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Add walk-in" side="bottom">
      <SheetContent className="flex flex-col gap-4">
        {error && <AlertCard severity="warn" title={error} />}
        <Field label="Service" required>
          <Select value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
            <option value="">Select service…</option>
            {services.filter((s) => s.active).map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
        </Field>
      </SheetContent>
      <SheetFooter className="flex gap-2">
        <Button variant="ghost" className="flex-1" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button className="flex-[2]" disabled={!serviceId || loading} loading={loading} onClick={create}>
          Issue ticket
        </Button>
      </SheetFooter>
    </Sheet>
  );
}

// ─── Transfer modal ───────────────────────────────────────────────────────────

function TransferModal({ ticket, windows, open, onOpenChange, onDone }: {
  ticket: Ticket | null;
  windows: WindowDesk[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}) {
  const [toWindowId, setToWindowId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function doTransfer() {
    if (!ticket || !toWindowId) return;
    setLoading(true); setError(null);
    try {
      await apiFetch(`/api/v1/tickets/${ticket.id}/transfer`, {
        method: "POST",
        body: JSON.stringify({ toWindowId }),
      });
      toast.success(`${ticket.number} transferred`);
      setToWindowId(""); onOpenChange(false); onDone();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Transfer failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={(v) => { if (!v) { setToWindowId(""); setError(null); } onOpenChange(v); }}
      title={`Transfer ${ticket?.number ?? ""}`}
      description="Move this ticket to a specific window queue"
    >
      <ModalContent className="flex flex-col gap-4">
        {error && <AlertCard severity="warn" title={error} />}
        <Field label="Target window" required>
          <Select value={toWindowId} onChange={(e) => setToWindowId(e.target.value)}>
            <option value="">Select window…</option>
            {windows.map((w) => (
              <option key={w.id} value={w.id}>
                Window {w.number}{w.label ? ` — ${w.label}` : ""} ({w.status})
              </option>
            ))}
          </Select>
        </Field>
      </ModalContent>
      <ModalFooter>
        <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button disabled={!toWindowId || loading} loading={loading} onClick={doTransfer}>
          Transfer →
        </Button>
      </ModalFooter>
    </Modal>
  );
}

// ─── Now Serving card ─────────────────────────────────────────────────────────

function NowServingCard({ ticket, onFinish, onNoShow, finishing, noShowing }: {
  ticket: Ticket;
  onFinish: () => void;
  onNoShow: () => void;
  finishing: boolean;
  noShowing: boolean;
}) {
  const timer = useElapsedTimer(ticket.servingAt ?? ticket.calledAt);
  const isCalled  = ticket.status === "called";
  const isServing = ticket.status === "serving";

  return (
    <div className={cn(
      "rounded-4 border p-5 flex flex-col gap-4",
      isServing ? "bg-success-soft border-success/30" : "bg-primary-soft border-primary/30"
    )}>
      <div className="flex items-center justify-between gap-2">
        <span className={cn(
          "text-xs font-semibold uppercase tracking-wide",
          isServing ? "text-success" : "text-primary"
        )}>
          {isCalled ? "Called — awaiting arrival" : "Now serving"}
        </span>
        <span className={cn(
          "inline-flex items-center gap-1 text-sm font-mono tabular-nums font-medium",
          isServing ? "text-success" : "text-primary"
        )}>
          <Timer size={14} aria-hidden />
          {timer}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <TicketNumber
          number={ticket.number}
          status={ticket.status}
          size="lg"
          live={isCalled}
        />
        <div className="flex-1 min-w-0">
          {ticket.serviceName && (
            <p className="text-base font-semibold text-fg leading-snug truncate">{ticket.serviceName}</p>
          )}
          <p className="text-sm text-fg-3">
            {SOURCE_LABEL[ticket.source] ?? ticket.source}
            {ticket.windowNumber != null && ` · Window ${ticket.windowNumber}`}
            {" · "}joined {fmtClock(ticket.joinedAt)}
          </p>
        </div>
      </div>

      {/* State-driven action buttons — ≥56px touch targets */}
      <div className="flex gap-3">
        <Button
          variant="success"
          size="touch"
          className="flex-1"
          onClick={onFinish}
          loading={finishing}
          disabled={noShowing}
        >
          <CheckCircle2 size={20} />
          Finish
        </Button>
        <Button
          variant="ghost"
          size="touch"
          className="flex-1 border border-border"
          onClick={onNoShow}
          loading={noShowing}
          disabled={finishing}
        >
          <UserX size={20} />
          No-show
        </Button>
      </div>
    </div>
  );
}

// ─── Main console ─────────────────────────────────────────────────────────────

function OperatorConsoleInner() {
  const params = useSearchParams();
  const branchIdParam = params.get("branchId");
  const { roles } = useAuthStore();
  const isPureOperator = roles.includes("operator") &&
    !roles.includes("manager") && !roles.includes("org_admin") && !roles.includes("super_admin");

  // Data
  const [branches, setBranches] = useState<BranchDetail[]>([]);
  const [activeBranch, setActiveBranch] = useState<BranchDetail | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedWindowId, setSelectedWindowId] = useState<string | null>(null);
  const [assignedWindow, setAssignedWindow] = useState<{ id: string; number: number; label?: string } | null>(null);

  // Loading
  const [pageLoading, setPageLoading] = useState(true);
  const [operatorWindowLoading, setOperatorWindowLoading] = useState(false);
  const [calling, setCalling] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [noShowing, setNoShowing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Connection
  const [connState, setConnState] = useState<ConnectionState>("reconnecting");
  const [updatedAt, setUpdatedAt] = useState<number>(Date.now());

  // UI modals
  const [transferTicket, setTransferTicket] = useState<Ticket | null>(null);
  const [walkInOpen, setWalkInOpen] = useState(false);

  const activeBranchRef = useRef<BranchDetail | null>(null);
  const selectedWindowRef = useRef<string | null>(null);


  // ─── Data fetching ──────────────────────────────────────────────────────────

  const loadTickets = useCallback(async (bid: string) => {
    try {
      const list = await apiFetch<Ticket[]>(`/api/v1/tickets?branchId=${bid}`);
      setTickets(list);
      setUpdatedAt(Date.now());
    } catch {}
  }, []);

  const loadBranches = useCallback(async (keepWindow = false) => {
    try {
      const list = await apiFetch<{ id: string }[]>("/api/v1/admin/branches");
      const details = await Promise.allSettled(
        list.map((b) => apiFetch<BranchDetail>(`/api/v1/branches/${b.id}`))
      );
      const resolved = details
        .filter((r) => r.status === "fulfilled")
        .map((r) => (r as PromiseFulfilledResult<BranchDetail>).value);
      setBranches(resolved);
      const target = branchIdParam
        ? resolved.find((b) => b.id === branchIdParam)
        : resolved[0];
      if (target) {
        setActiveBranch(target);
        activeBranchRef.current = target;
        if (!keepWindow || !selectedWindowRef.current) {
          const preferred = target.windows.find((w) => w.status === "open") ?? target.windows[0];
          if (preferred) {
            setSelectedWindowId(preferred.id);
            selectedWindowRef.current = preferred.id;
          }
        }
      }
    } catch {}
  }, [branchIdParam]);

  // Operator: fetch assigned window
  useEffect(() => {
    if (!isPureOperator) return;
    setOperatorWindowLoading(true);
    apiFetch<{ id: string; number: number; label?: string }>("/api/v1/windows/my")
      .then((w) => {
        setAssignedWindow(w);
        setSelectedWindowId(w.id);
        selectedWindowRef.current = w.id;
      })
      .catch(() => {})
      .finally(() => setOperatorWindowLoading(false));
  }, [isPureOperator]);

  // Initial load
  useEffect(() => {
    loadBranches().finally(() => setPageLoading(false));
  }, [loadBranches]);

  // Connection state
  useEffect(() => {
    return onConnectionStateChange(setConnState);
  }, []);

  // STOMP subscription + poll fallback
  useEffect(() => {
    if (!activeBranch) return;
    loadTickets(activeBranch.id);

    const unsub = subscribeBranchQueue(activeBranch.id, () => {
      const bid = activeBranchRef.current?.id;
      if (bid) loadTickets(bid);
    });

    const iv = setInterval(() => {
      const bid = activeBranchRef.current?.id;
      if (bid) loadTickets(bid);
    }, 15_000);

    return () => {
      clearInterval(iv);
      unsub();
    };
  }, [activeBranch?.id, loadTickets]);

  // ─── Actions ────────────────────────────────────────────────────────────────

  async function callNext() {
    if (!activeBranch || calling) return;
    const wid = selectedWindowRef.current ?? selectedWindowId;
    if (!wid) { setActionError("Select a window first."); return; }

    const selectedWindow = activeBranch.windows.find((w) => w.id === wid);
    const windowNumber = selectedWindow?.number ?? 0;

    setCalling(true); setActionError(null);
    try {
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
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : "Failed to call next");
    } finally {
      setCalling(false);
    }
  }

  async function finish() {
    if (!selectedWindowId || !currentTicket || finishing) return;
    setFinishing(true); setActionError(null);
    try {
      await apiFetch(`/api/v1/windows/${selectedWindowId}/serve?ticketId=${currentTicket.id}`, {
        method: "POST",
      });
      toast.success(`${currentTicket.number} served ✓`);
      await loadTickets(activeBranch!.id);
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : "Failed to finish");
    } finally {
      setFinishing(false);
    }
  }

  async function noShow() {
    if (!selectedWindowId || !currentTicket || noShowing) return;
    setNoShowing(true); setActionError(null);
    try {
      await apiFetch(`/api/v1/windows/${selectedWindowId}/no-show?ticketId=${currentTicket.id}`, {
        method: "POST",
      });
      toast.warning(`${currentTicket.number} marked no-show`);
      await loadTickets(activeBranch!.id);
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : "Failed to mark no-show");
    } finally {
      setNoShowing(false);
    }
  }

  async function toggleWindow(wid: string, status: string) {
    const next = status === "open" ? "closed" : "open";
    try {
      await apiFetch(`/api/v1/windows/${wid}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      });
      await loadBranches(true);
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : "Failed to update window");
    }
  }

  // ─── Derived state ───────────────────────────────────────────────────────────

  const waiting = tickets
    .filter((t) => t.status === "waiting")
    .sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime());

  const activeTickets = tickets.filter((t) => t.status === "serving" || t.status === "called");

  const currentTicket =
    activeTickets.find((t) => t.windowId === selectedWindowId) ?? activeTickets[0] ?? null;

  const consoleState: "idle" | "called" | "serving" =
    !currentTicket ? "idle"
    : currentTicket.status === "called" ? "called"
    : "serving";

  const windows = activeBranch?.windows ?? [];
  const openCount = windows.filter((w) => w.status === "open").length;
  const selectedWindow = windows.find((w) => w.id === selectedWindowId);

  // ─── Render ──────────────────────────────────────────────────────────────────

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-fg-3 text-sm">
        Loading queue…
      </div>
    );
  }

  if (!activeBranch) {
    return (
      <div className="flex items-center justify-center h-64 text-fg-3 text-sm">
        No branches found.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">

      {/* ── Modals ── */}
      <TransferModal
        ticket={transferTicket}
        windows={windows}
        open={!!transferTicket}
        onOpenChange={(v) => { if (!v) setTransferTicket(null); }}
        onDone={() => loadTickets(activeBranch.id)}
      />
      <WalkInSheet
        open={walkInOpen}
        onOpenChange={setWalkInOpen}
        services={activeBranch.services}
        branchId={activeBranch.id}
        onCreated={() => loadTickets(activeBranch.id)}
      />

      {/* ── Status bar ── */}
      <div className="h-14 px-4 flex items-center gap-3 border-b border-hairline bg-surface flex-shrink-0">
        <div className="flex-1 flex items-center gap-3 min-w-0">
          {selectedWindow ? (
            <span className="text-sm font-semibold text-fg truncate">
              Window {selectedWindow.number}
              {selectedWindow.label ? ` · ${selectedWindow.label}` : ""}
            </span>
          ) : null}
          <Badge variant={openCount > 0 ? "success" : "muted"} size="sm">
            {openCount} open
          </Badge>
          <span className="text-xs text-fg-4 hidden sm:block">
            {waiting.length} waiting
          </span>
        </div>

        {/* Branch selector */}
        {branches.length > 1 && (
          <div className="relative flex-shrink-0">
            <select
              value={activeBranch.id}
              onChange={(e) => {
                const b = branches.find((x) => x.id === e.target.value);
                if (!b) return;
                setActiveBranch(b);
                activeBranchRef.current = b;
                const preferred = b.windows.find((w) => w.status === "open") ?? b.windows[0];
                const wid = preferred?.id ?? null;
                setSelectedWindowId(wid);
                selectedWindowRef.current = wid;
              }}
              className="appearance-none bg-surface-2 border border-border rounded-2 text-xs font-medium text-fg px-2.5 pr-6 py-1.5 cursor-pointer outline-none focus:border-primary"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.shortName ?? b.name}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-fg-4 pointer-events-none" />
          </div>
        )}

        <ConnectionBadge state={connState} updatedAt={updatedAt} dotOnly />

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => loadTickets(activeBranch.id)}
          title="Refresh"
        >
          <RefreshCw size={14} />
        </Button>
      </div>

      {/* ── Main content: tablet-first single-column console ── */}
      <div className="flex-1 overflow-auto">
        {/* Desktop: sidebar + list; tablet/mobile: stacked card console */}
        <div className="flex h-full">

          {/* ── CONSOLE PANEL ── */}
          <div className="w-full lg:w-80 xl:w-96 flex-shrink-0 flex flex-col gap-4 p-4 overflow-auto lg:border-r lg:border-hairline bg-surface">

            {/* Window picker (managers/admins only) */}
            {!isPureOperator && (
              <div>
                <p className="text-xs font-semibold text-fg-4 uppercase tracking-wide mb-2">Window</p>
                <div className="flex flex-wrap gap-2">
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
                        className={cn(
                          "px-3 py-1.5 rounded-2 text-xs font-semibold border transition-colors",
                          sel
                            ? "bg-primary-soft border-primary text-primary"
                            : open
                            ? "border-success text-success hover:bg-success-soft"
                            : "border-border text-fg-3 hover:bg-surface-2"
                        )}
                      >
                        W{w.number}
                        {open && !sel && (
                          <span className="ml-1 w-1.5 h-1.5 rounded-full bg-success inline-block align-middle" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Operator assigned window indicator */}
            {isPureOperator && (
              operatorWindowLoading ? (
                <div className="text-sm text-fg-3">Loading window…</div>
              ) : assignedWindow ? (
                <div className="px-3 py-2.5 rounded-3 bg-primary-soft border border-primary/20 text-primary text-sm font-semibold">
                  Window {assignedWindow.number}
                  {assignedWindow.label ? ` — ${assignedWindow.label}` : ""}
                </div>
              ) : (
                <AlertCard
                  severity="warn"
                  title="No window assigned"
                  description="Ask your manager to assign you to a window."
                />
              )
            )}

            {/* Error banner */}
            {actionError && (
              <AlertCard
                severity="warn"
                title={actionError}
                onDismiss={() => setActionError(null)}
              />
            )}

            {/* NOW SERVING — state-driven card */}
            {currentTicket ? (
              <NowServingCard
                ticket={currentTicket}
                onFinish={finish}
                onNoShow={noShow}
                finishing={finishing}
                noShowing={noShowing}
              />
            ) : (
              <div className="rounded-4 border border-dashed border-border-2 bg-surface-2 p-6 text-center">
                <p className="text-sm text-fg-3">Window idle</p>
                <p className="text-xs text-fg-4 mt-0.5">No active ticket</p>
              </div>
            )}

            {/* CALL NEXT — dominant CTA when idle */}
            {consoleState === "idle" && (
              <Button
                size="touch"
                className="w-full text-base"
                onClick={callNext}
                loading={calling}
                disabled={!selectedWindowId}
              >
                Call next
              </Button>
            )}

            {/* Secondary actions row */}
            <div className="flex gap-2">
              <Button
                variant="muted"
                size="md"
                className="flex-1"
                onClick={() => setWalkInOpen(true)}
              >
                <Plus size={15} />
                Walk-in
              </Button>

              {selectedWindow && (
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => toggleWindow(selectedWindow.id, selectedWindow.status)}
                >
                  {selectedWindow.status === "open" ? "Close window" : "Open window"}
                </Button>
              )}
            </div>

            {/* NEXT UP — when window has active ticket, show who's next */}
            {consoleState !== "idle" && waiting.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-fg-4 uppercase tracking-wide mb-2">
                  Next up
                </p>
                {waiting.slice(0, 2).map((t, i) => (
                  <QueueRow
                    key={t.id}
                    ticket={t}
                    highlight={i === 0}
                    onCall={i === 0 ? callNext : undefined}
                    onTransfer={() => setTransferTicket(t)}
                  />
                ))}
                {waiting.length > 2 && (
                  <p className="text-xs text-fg-4 px-3 py-1">
                    +{waiting.length - 2} more waiting
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ── QUEUE LIST (desktop side panel) ── */}
          <div className="hidden lg:flex flex-col flex-1 overflow-auto p-4 gap-1">
            {activeTickets.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-success uppercase tracking-wide mb-1.5 px-3">
                  Active ({activeTickets.length})
                </p>
                {activeTickets.map((t) => (
                  <QueueRow key={t.id} ticket={t} />
                ))}
              </div>
            )}

            <p className="text-xs font-semibold text-fg-4 uppercase tracking-wide mb-1.5 px-3">
              Waiting ({waiting.length})
            </p>

            {waiting.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-fg-3 gap-2">
                <span className="text-3xl">✓</span>
                <p className="text-sm font-medium">Queue is empty</p>
                <p className="text-xs text-fg-4">All caught up</p>
              </div>
            ) : (
              waiting.map((t, i) => (
                <QueueRow
                  key={t.id}
                  ticket={t}
                  highlight={i === 0}
                  onCall={i === 0 && consoleState === "idle" ? callNext : undefined}
                  onTransfer={() => setTransferTicket(t)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function QueuePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64 text-fg-3 text-sm">
        Loading…
      </div>
    }>
      <OperatorConsoleInner />
    </Suspense>
  );
}
