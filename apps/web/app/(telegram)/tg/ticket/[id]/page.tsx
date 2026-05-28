"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Bell } from "lucide-react";
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
} from "@/components/ui";
import { cn } from "@/lib/utils";

const ACTIVE = new Set(["waiting", "called", "serving"]);
const GRACE_SECONDS = 120;

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

function CalledCard({ ticket, confirming, onConfirm, t }: {
  ticket: Ticket; confirming: boolean; onConfirm: () => void;
  t: ReturnType<typeof useTranslations<"tg">>;
}) {
  const graceRemaining = useGraceCountdown(ticket.calledAt);
  return (
    <div className="rounded-4 border-2 border-warning bg-warning-soft p-5 flex flex-col gap-4">
      <div className="flex items-start gap-4">
        <CountdownRing total={GRACE_SECONDS} remaining={graceRemaining} size={72} strokeWidth={5} />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Bell size={16} className="text-warning flex-shrink-0" aria-hidden />
            <p className="text-base font-bold text-warning">{t("called_heading")}</p>
          </div>
          {ticket.windowNumber != null && (
            <p className="text-sm text-fg-2">
              {t("go_to_window", { window: ticket.windowNumber })}
              {ticket.windowLabel && <span className="text-fg-3"> · {ticket.windowLabel}</span>}
            </p>
          )}
        </div>
      </div>
      <Button variant="success" size="touch" className="w-full" onClick={onConfirm} loading={confirming}>
        {t("im_here")}
      </Button>
    </div>
  );
}

export default function TgTicketPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const t = useTranslations("tg");

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [connState, setConnState] = useState<ConnectionState>("reconnecting");
  const [updatedAt, setUpdatedAt] = useState<number>(Date.now());
  const [confirming, setConfirming] = useState(false);

  const fetchTicket = useCallback(async (initial = false) => {
    try {
      const data = await apiFetch<Ticket>(`/api/v1/tickets/${id}`);
      setTicket(data);
      setUpdatedAt(Date.now());
      setError(null);
    } catch (e) {
      if (!initial) return;
      const msg =
        e instanceof ApiError
          ? (e.status === 404 ? "Ticket not found"
          : e.status === 401 || e.status === 403 ? "Please sign in to view this ticket"
          : "Couldn't load this ticket")
          : "Couldn't load this ticket";
      setError(msg);
    } finally {
      if (initial) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTicket(true);
    const iv = setInterval(() => fetchTicket(), 10_000);
    return () => clearInterval(iv);
  }, [fetchTicket]);

  useEffect(() => {
    return subscribeTicket(id, () => fetchTicket());
  }, [id, fetchTicket]);

  useEffect(() => {
    return onConnectionStateChange(setConnState);
  }, []);

  async function confirmPresence() {
    if (confirming) return;
    setConfirming(true);
    try {
      await apiFetch(`/api/v1/tickets/${id}/confirm-presence`, { method: "POST" });
      await fetchTicket();
    } catch {}
    setConfirming(false);
  }

  if (loading) return <FullPageLoader variant="dark" label={t("loading_ticket")} hint="· · ·" />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70svh] gap-4 p-6 text-center">
        <div className="w-11 h-11 rounded-[14px] bg-danger-soft text-danger grid place-items-center text-xl font-bold">!</div>
        <p className="text-sm font-medium text-fg">{error}</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setError(null); setLoading(true); fetchTicket(true); }}>
            {t("try_again")}
          </Button>
          <Button onClick={() => router.push("/tg" as any)}>{t("back_home")}</Button>
        </div>
      </div>
    );
  }

  if (!ticket) return null;

  const isCalled  = ticket.status === "called";
  const isServing = ticket.status === "serving";
  const isActive  = ACTIVE.has(ticket.status);
  const isDone    = !isActive;
  const ahead     = ticket.queuePosition ?? 0;

  const heroBg =
    isDone ? "from-fg-3 to-fg-4"
    : isCalled || isServing ? "from-success to-accent-2"
    : "from-primary to-violet";

  return (
    <div className="p-4 flex flex-col gap-3">

      {/* Hero */}
      <div className={cn("relative rounded-4 overflow-hidden bg-gradient-to-br text-white p-5", heroBg)}>
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.5),transparent_50%)]" />
        <div className="relative flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[11px] uppercase tracking-wider opacity-70">
              {isDone ? ticket.status.replace("_", " ") : isCalled || isServing ? t("now_serving") : t("your_ticket")}
            </span>
            <StatusPill status={ticket.status} className="border-white/20 bg-white/15 text-white" />
          </div>

          <TicketNumber number={ticket.number} size="xl" className="text-white" />

          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/20">
            <div>
              <p className="text-[10px] opacity-70 font-mono uppercase">{t("status")}</p>
              <p className="text-sm font-semibold mt-0.5 tabular-nums">{ticket.status.replace("_", " ")}</p>
            </div>
            <div>
              <p className="text-[10px] opacity-70 font-mono uppercase">{t("position")}</p>
              <p className="text-sm font-semibold mt-0.5 tabular-nums">
                {isServing ? (ticket.windowNumber != null ? `W${ticket.windowNumber}` : "—")
                  : isDone ? "✓"
                  : ticket.queuePosition != null ? ticket.queuePosition : "—"}
              </p>
            </div>
            <div>
              <p className="text-[10px] opacity-70 font-mono uppercase">{t("joined")}</p>
              <p className="text-sm font-semibold mt-0.5 tabular-nums">{fmtClock(ticket.joinedAt)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Connection liveness */}
      <div className="flex items-center justify-between px-1">
        <ConnectionBadge state={connState} updatedAt={updatedAt} />
        {connState === "reconnecting" && (
          <span className="text-xs text-fg-4">{new Date(updatedAt).toLocaleTimeString()}</span>
        )}
      </div>

      {/* Called state */}
      {isCalled && (
        <CalledCard ticket={ticket} confirming={confirming} onConfirm={confirmPresence} t={t} />
      )}

      {/* Waiting: position */}
      {ticket.status === "waiting" && (
        <div className="bg-surface border border-border rounded-4 p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-fg-4 uppercase tracking-wide">{t("position")}</p>
            <span className="text-xs font-mono text-fg-3 tabular-nums">
              {ticket.etaMinutes != null ? `~${ticket.etaMinutes} min` : "—"}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span
              aria-live="polite"
              className={cn("text-5xl font-bold tabular-nums leading-none", ahead === 0 ? "text-success" : "text-fg")}
            >
              {ticket.queuePosition != null ? ticket.queuePosition : "—"}
            </span>
            <span className="text-sm text-fg-3">ahead</span>
          </div>
          <div className="h-1.5 rounded-pill bg-surface-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent rounded-pill transition-all duration-700"
              style={{ width: `${ahead === 0 ? 100 : Math.max(4, 100 - (ahead / Math.max(1, ahead + 3)) * 90)}%` }}
            />
          </div>
        </div>
      )}

      {isDone && (
        <Button size="lg" className="w-full" onClick={() => router.push("/tg" as any)}>
          {t("back_home")}
        </Button>
      )}
    </div>
  );
}
