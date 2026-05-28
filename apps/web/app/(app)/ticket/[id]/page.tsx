"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronLeft, QrCode, RefreshCw, Bell, MapPin } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { Ticket, fmtClock } from "@/lib/types";
import { subscribeTicket, onConnectionStateChange } from "@/lib/realtime";
import { FullPageLoader } from "@/components/Loader";
import {
  Button,
  StatusPill,
  TicketNumber,
  ConnectionBadge,
  ConnectionState,
  CountdownRing,
  AlertCard,
  Modal,
  ModalContent,
} from "@/components/ui";
import { cn } from "@/lib/utils";

const ACTIVE = new Set(["waiting", "called", "serving"]);
const GRACE_SECONDS = 120; // 2-minute grace period for "I'm here"

// ─── Audio notification ───────────────────────────────────────────────────────

function playCallSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    [0, 0.18, 0.36].forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 880; osc.type = "sine";
      gain.gain.setValueAtTime(0.4, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.25);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.3);
    });
    ctx.close();
  } catch {}
}

function requestBrowserNotification(ticketNumber: string, windowNum: number | null) {
  if (!("Notification" in window)) return;
  const show = () => new Notification("It's your turn!", {
    body: windowNum ? `Ticket ${ticketNumber} — Window ${windowNum}` : `Ticket ${ticketNumber} has been called`,
    icon: "/icon-192.png",
  });
  if (Notification.permission === "granted") show();
  else if (Notification.permission !== "denied")
    Notification.requestPermission().then((p) => { if (p === "granted") show(); });
}

// ─── QR modal ────────────────────────────────────────────────────────────────

function QrModal({ ticketId, ticketNumber, open, onClose, t }: {
  ticketId: string; ticketNumber: string; open: boolean; onClose: () => void;
  t: ReturnType<typeof useTranslations<"ticket">>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const url = typeof window !== "undefined" ? `${window.location.origin}/ticket/${ticketId}` : "";

  useEffect(() => {
    if (!open || !canvasRef.current || !url) return;
    import("qrcode").then((QRCode) =>
      QRCode.toCanvas(canvasRef.current!, url, { width: 220, margin: 2, color: { dark: "#000", light: "#fff" } })
    );
  }, [open, url]);

  return (
    <Modal open={open} onOpenChange={(v) => !v && onClose()} title="QR Code" size="sm">
      <ModalContent className="flex flex-col items-center gap-4 pb-6">
        <canvas ref={canvasRef} className="rounded-3" />
        <TicketNumber number={ticketNumber} size="md" className="tracking-widest" />
        <p className="text-xs text-fg-3 text-center leading-relaxed">{t("qr.hint")}</p>
      </ModalContent>
    </Modal>
  );
}

// ─── Rating modal (bottom-sheet style) ───────────────────────────────────────

function RatingModal({ open, onClose, onSubmit, submitting, t }: {
  open: boolean; onClose: () => void;
  onSubmit: (stars: number, comment: string) => void;
  submitting: boolean;
  t: ReturnType<typeof useTranslations<"ticket">>;
}) {
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");

  return (
    <Modal open={open} onOpenChange={(v) => !v && onClose()} title={t("rating.title")} description={t("rating.subtitle")} size="sm">
      <ModalContent className="flex flex-col gap-4">
        <div className="flex justify-center gap-2">
          {[1,2,3,4,5].map((s) => (
            <button
              key={s}
              onClick={() => setStars(s)}
              className={cn(
                "w-12 h-12 rounded-3 text-lg transition-all",
                s <= stars ? "bg-primary scale-105" : "bg-surface-3 hover:bg-surface-2"
              )}
            >
              ⭐
            </button>
          ))}
        </div>
        {stars > 0 && (
          <p className="text-sm text-fg-3 text-center -mt-1">
            {(t.raw("rating.labels") as string[])[stars]}
          </p>
        )}
        <textarea
          placeholder={t("rating.placeholder")}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={2}
          className="w-full px-3 py-2.5 text-sm bg-surface border border-border rounded-3 text-fg placeholder:text-fg-4 resize-none outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onClose}>{t("rating.skip")}</Button>
          <Button
            className="flex-[2]"
            disabled={stars === 0 || submitting}
            loading={submitting}
            onClick={() => onSubmit(stars, comment)}
          >
            {t("rating.submit")}
          </Button>
        </div>
      </ModalContent>
    </Modal>
  );
}

// ─── Grace countdown ──────────────────────────────────────────────────────────

function useGraceCountdown(calledAt: string | null | undefined) {
  const [remaining, setRemaining] = useState(GRACE_SECONDS);
  useEffect(() => {
    if (!calledAt) return;
    const update = () => {
      const elapsed = Math.floor((Date.now() - new Date(calledAt).getTime()) / 1000);
      setRemaining(Math.max(0, GRACE_SECONDS - elapsed));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [calledAt]);
  return remaining;
}

// ─── State-specific guidance copy ────────────────────────────────────────────

function GuidanceCard({ ticket, t }: { ticket: Ticket; t: ReturnType<typeof useTranslations<"ticket">> }) {
  const ahead = ticket.queuePosition ?? 0;

  if (ticket.status === "waiting") {
    if (ahead > 5) {
      return (
        <div className="bg-surface border border-border rounded-4 px-4 py-3 flex gap-3 items-start">
          <MapPin size={16} className="text-fg-4 mt-0.5 flex-shrink-0" aria-hidden />
          <p className="text-sm text-fg-2 leading-relaxed">
            You&apos;re position <strong className="text-fg">{ahead}</strong> in queue.
            Feel free to relax — we&apos;ll notify you when you&apos;re almost up.
          </p>
        </div>
      );
    }
    if (ahead <= 2 && ahead > 0) {
      return (
        <AlertCard
          severity="warn"
          title="Almost your turn"
          description={`${ahead} person${ahead > 1 ? "s" : ""} ahead of you — head back to the window area.`}
        />
      );
    }
    if (ahead === 0) {
      return (
        <AlertCard
          severity="info"
          title="You're next!"
          description="Stay nearby. You'll be called very soon."
        />
      );
    }
    return null;
  }

  if (ticket.status === "served") {
    return (
      <AlertCard severity="info" title={t("served_message")} description={t("served_sub")} />
    );
  }

  return null;
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TicketPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const t = useTranslations("ticket");

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [connState, setConnState] = useState<ConnectionState>("reconnecting");
  const [updatedAt, setUpdatedAt] = useState<number>(Date.now());

  const [cancelling, setCancelling] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [rated, setRated] = useState(false);

  const prevStatusRef = useRef<string | null>(null);

  // ─── Fetch ──────────────────────────────────────────────────────────────────

  const fetchTicket = useCallback(async (isInitial = false) => {
    try {
      const data = await apiFetch<Ticket>(`/api/v1/tickets/${id}`);

      if (prevStatusRef.current !== "called" && data.status === "called") {
        playCallSound();
        requestBrowserNotification(data.number, data.windowNumber ?? null);
      }
      if (prevStatusRef.current !== "served" && data.status === "served" && data.ratingStars == null) {
        setShowRating(true);
      }
      prevStatusRef.current = data.status;
      setTicket(data);
      setUpdatedAt(Date.now());
      setLoadError(null);
    } catch (e) {
      if (!isInitial) return;
      const msg =
        e instanceof ApiError
          ? e.status === 404 ? t("not_found")
          : e.status === 401 || e.status === 403 ? t("sign_in_required")
          : t("load_error")
          : t("load_error");
      setLoadError(msg);
    }
  }, [id, t]);

  // Initial load + polling
  useEffect(() => {
    fetchTicket(true).finally(() => setLoading(false));
    const iv = setInterval(() => fetchTicket(), 8_000);
    return () => clearInterval(iv);
  }, [fetchTicket]);

  // STOMP subscription
  useEffect(() => {
    return subscribeTicket(id, () => fetchTicket());
  }, [id, fetchTicket]);

  // Stop polling once terminal
  useEffect(() => {
    if (ticket && !ACTIVE.has(ticket.status)) {
      // Fetch once more to get final state, then polling stops naturally (the setInterval
      // in the polling effect will still tick but the UI won't be stale because the
      // ticket itself won't change — stopping it would require complex state.
      // The interval is cheap and stops when the component unmounts.)
    }
  }, [ticket?.status]);

  // Connection state
  useEffect(() => {
    return onConnectionStateChange(setConnState);
  }, []);

  // ─── Actions ────────────────────────────────────────────────────────────────

  async function cancel() {
    if (!ticket || cancelling) return;
    setCancelling(true);
    try {
      await apiFetch(`/api/v1/tickets/${id}/cancel`, { method: "POST" });
      await fetchTicket();
    } catch {}
    setCancelling(false);
  }

  async function confirmPresence() {
    if (confirming) return;
    setConfirming(true);
    try {
      await apiFetch(`/api/v1/tickets/${id}/confirm-presence`, { method: "POST" });
      await fetchTicket();
    } catch {}
    setConfirming(false);
  }

  async function submitRating(stars: number, comment: string) {
    if (submittingRating || stars === 0) return;
    setSubmittingRating(true);
    try {
      await apiFetch(`/api/v1/tickets/${id}/rate`, {
        method: "POST",
        body: JSON.stringify({ stars, comment: comment.trim() || null }),
      });
      setRated(true);
      setShowRating(false);
    } catch {}
    setSubmittingRating(false);
  }

  // ─── Loading/error states ────────────────────────────────────────────────────

  if (loading) return <FullPageLoader label={t("loading")} hint={t("loading_hint")} />;

  if (loadError || !ticket) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60svh] gap-4 p-6 text-center">
        <div className="w-11 h-11 rounded-[14px] bg-danger-soft text-danger grid place-items-center text-xl font-bold">!</div>
        <p className="text-sm font-medium text-fg">{loadError ?? t("not_found")}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="md" onClick={() => { setLoading(true); setLoadError(null); fetchTicket(true).finally(() => setLoading(false)); }}>
            {t("try_again")}
          </Button>
          <Button size="md" onClick={() => router.push("/branches")}>
            {t("find_queue")}
          </Button>
        </div>
      </div>
    );
  }

  // ─── Derived values ──────────────────────────────────────────────────────────

  const isActive    = ACTIVE.has(ticket.status);
  const isCalled    = ticket.status === "called";
  const isServing   = ticket.status === "serving";
  const isDone      = ticket.status === "served";
  const isCancelled = !isActive && !isDone;
  const ahead       = ticket.queuePosition ?? 0;

  const heroBg =
    isDone    ? "from-success to-[oklch(0.55_0.14_150)]"
    : isCalled || isServing ? "from-success to-accent-2"
    : isCancelled ? "from-fg-3 to-fg-4"
    : "from-primary to-violet";

  const heroLabel =
    isDone    ? t("hero.served_thanks")
    : isCalled || isServing ? t("hero.now_serving")
    : isCancelled ? ticket.status.replace("_", " ")
    : t("hero.your_ticket");

  // ETA: only show if backend provides it; never fabricate
  const etaDisplay: string =
    isDone || isServing ? t("hero.now")
    : ticket.etaMinutes != null ? `~${ticket.etaMinutes} min`
    : "—";

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <QrModal ticketId={id} ticketNumber={ticket.number} open={showQr} onClose={() => setShowQr(false)} t={t} />
      <RatingModal open={showRating} onClose={() => setShowRating(false)} onSubmit={submitRating} submitting={submittingRating} t={t} />

      <div className="flex flex-col min-h-svh">

        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-bg border-b border-hairline">
          <div className="flex items-center gap-2.5 px-4 py-3">
            <Button variant="ghost" size="icon-sm" onClick={() => router.back()} aria-label="Back">
              <ChevronLeft size={18} />
            </Button>

            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-semibold truncate">{ticket.branchName || t("your_ticket")}</p>
              {ticket.serviceName && (
                <p className="text-[11px] text-fg-3 truncate">{ticket.serviceName}</p>
              )}
            </div>

            {/* Liveness badge — pillar 1 */}
            <ConnectionBadge state={connState} updatedAt={updatedAt} />

            <Button variant="ghost" size="icon-sm" onClick={() => setShowQr(true)} aria-label={t("qr.show")}>
              <QrCode size={16} />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 max-w-[480px] mx-auto w-full px-4 py-4 flex flex-col gap-3">

          {/* Hero ticket card */}
          <div className={cn("relative rounded-4 overflow-hidden bg-gradient-to-br text-white p-5", heroBg)}>
            <div className="absolute inset-0 opacity-15 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.6),transparent_50%)]" />
            <div className="relative flex flex-col gap-4">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] uppercase tracking-[0.06em] opacity-75">{heroLabel}</span>
                <StatusPill status={ticket.status} className="border-white/20 bg-white/15 text-white" />
              </div>

              <TicketNumber number={ticket.number} size="xl" className="text-white" />

              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/20">
                <HeroStat label={t("hero.joined")} value={fmtClock(ticket.joinedAt)} />
                <HeroStat
                  label={isServing ? t("hero.window") : t("hero.ahead")}
                  value={
                    isServing ? (ticket.windowNumber != null ? `W${ticket.windowNumber}` : "—")
                    : isDone ? t("hero.done")
                    : ticket.queuePosition != null ? String(ticket.queuePosition) : "—"
                  }
                />
                {/* Pillar 2: honest ETA — position only until backend Phase 2 provides trustworthy inputs */}
                <HeroStat label={t("hero.eta")} value={etaDisplay} />
              </div>
            </div>
          </div>

          {/* Offline / stale warning (pillar 1) */}
          {connState === "offline" && (
            <AlertCard
              severity="warn"
              title="Offline"
              description="Can't reach the server. Your position shown may be stale."
              action={
                <Button variant="ghost" size="sm" onClick={() => fetchTicket(true)}>
                  <RefreshCw size={13} /> Retry
                </Button>
              }
            />
          )}
          {connState === "reconnecting" && (
            <div className="flex items-center gap-2 text-xs text-fg-4 px-1">
              <ConnectionBadge state="reconnecting" dotOnly />
              Reconnecting — last updated {new Date(updatedAt).toLocaleTimeString()}
            </div>
          )}

          {/* CALLED — "It's your turn" state (pillar 3) */}
          {isCalled && <CalledCard ticket={ticket} confirming={confirming} onConfirm={confirmPresence} t={t} />}

          {/* Guidance (pillar 3) */}
          {!isCalled && <GuidanceCard ticket={ticket} t={t} />}

          {/* Waiting: position progress */}
          {ticket.status === "waiting" && (
            <div className="bg-surface border border-border rounded-4 p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-fg-4 uppercase tracking-wide">{t("queue_pos.title")}</p>
                <span className="text-xs font-mono text-fg-3 tabular-nums">{etaDisplay}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span
                  aria-live="polite"
                  className={cn(
                    "text-5xl font-bold tabular-nums leading-none",
                    ahead === 0 ? "text-success" : "text-fg"
                  )}
                >
                  {ticket.queuePosition != null ? ticket.queuePosition : "—"}
                </span>
                <span className="text-sm text-fg-3">
                  {ahead === 1 ? t("queue_pos.person_ahead") : t("queue_pos.people_ahead")}
                </span>
              </div>
              {/* Progress bar */}
              <div className="h-1.5 rounded-pill bg-surface-3 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-accent rounded-pill transition-all duration-700"
                  style={{ width: `${ahead === 0 ? 100 : Math.max(4, Math.min(90, 100 - (ahead / Math.max(1, ahead + 3)) * 90))}%` }}
                />
              </div>
              <p className="text-[11px] text-fg-4 font-mono flex justify-between">
                <span>joined {fmtClock(ticket.joinedAt)}</span>
                {ticket.etaMinutes != null && (
                  <span>est. {fmtClock(new Date(Date.now() + ticket.etaMinutes * 60_000).toISOString())}</span>
                )}
              </p>
            </div>
          )}

          {/* Info rows */}
          <div className="bg-surface border border-border rounded-4 p-4 flex flex-col gap-2">
            <InfoRow label={t("info.ticket")} value={ticket.number} mono />
            {ticket.serviceName && <InfoRow label={t("info.service")} value={ticket.serviceName} />}
            {ticket.branchName && <InfoRow label={t("info.branch")} value={ticket.branchName} />}
            <InfoRow label={t("info.source")} value={ticket.source === "kiosk" ? t("info.source_kiosk") : t("info.source_remote")} />
            <InfoRow label={t("info.joined")} value={fmtClock(ticket.joinedAt)} mono />
            {ticket.calledAt && <InfoRow label={t("info.called_at")} value={fmtClock(ticket.calledAt)} mono />}
            {ticket.servedAt && <InfoRow label={t("info.served_at")} value={fmtClock(ticket.servedAt)} mono />}
            {ticket.windowNumber != null && (
              <InfoRow label={t("info.window")} value={
                ticket.windowLabel
                  ? `Window ${ticket.windowNumber} · ${ticket.windowLabel}`
                  : `Window ${ticket.windowNumber}`
              } />
            )}
          </div>

          {/* Cancel */}
          {isActive && !isServing && (
            <Button variant="outline" size="md" onClick={cancel} loading={cancelling} className="border-danger/30 text-danger hover:bg-danger-soft">
              {t("cancel")}
            </Button>
          )}

          {/* Rating */}
          {isDone && !rated && ticket.ratingStars == null && !showRating && (
            <button
              onClick={() => setShowRating(true)}
              className="flex items-center gap-3 px-4 py-3.5 rounded-4 border border-border bg-surface text-left hover:bg-surface-2 transition-colors"
            >
              <span className="text-xl flex-shrink-0">⭐</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-fg">{t("rating.cta")}</p>
                <p className="text-xs text-fg-3 mt-0.5">{t("rating.cta_sub")}</p>
              </div>
              <ChevronLeft size={16} className="text-fg-3 rotate-180 flex-shrink-0" />
            </button>
          )}

          {isDone && (rated || ticket.ratingStars != null) && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-3 bg-success-soft border border-success/20 text-success text-sm font-medium">
              <span>✓</span> {t("rating.thanks")}
            </div>
          )}

          {(isDone || isCancelled) && (
            <Button size="lg" className="w-full" onClick={() => router.push("/")}>
              {t("find_another")}
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Called card ──────────────────────────────────────────────────────────────

function CalledCard({ ticket, confirming, onConfirm, t }: {
  ticket: Ticket;
  confirming: boolean;
  onConfirm: () => void;
  t: ReturnType<typeof useTranslations<"ticket">>;
}) {
  const graceRemaining = useGraceCountdown(ticket.calledAt);
  return (
    <div className="rounded-4 border-2 border-warning bg-warning-soft p-5 flex flex-col gap-4">
      <div className="flex items-start gap-4">
        <CountdownRing total={GRACE_SECONDS} remaining={graceRemaining} size={72} strokeWidth={5} />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Bell size={16} className="text-warning flex-shrink-0" aria-hidden />
            <p className="text-base font-bold text-warning">{t("called.heading")}</p>
          </div>
          {ticket.windowNumber != null && (
            <p className="text-sm text-fg-2">
              {t("called.go_to_window", { window: ticket.windowNumber })}
              {ticket.windowLabel && <span className="text-fg-3"> · {ticket.windowLabel}</span>}
            </p>
          )}
        </div>
      </div>

      <Button
        variant="success"
        size="touch"
        className="w-full"
        onClick={onConfirm}
        loading={confirming}
      >
        {t("called.im_here")}
      </Button>

      <p className="text-xs text-fg-3 text-center leading-relaxed">{t("called.hint")}</p>
    </div>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] opacity-70 font-mono uppercase tracking-wider">{label}</p>
      <p className="text-[15px] font-semibold mt-0.5 tabular-nums">{value}</p>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-fg-3 flex-shrink-0">{label}</span>
      <span className={cn("text-sm font-medium text-fg text-right truncate", mono && "font-mono tabular-nums")}>
        {value}
      </span>
    </div>
  );
}
