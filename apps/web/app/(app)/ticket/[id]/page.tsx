"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { apiFetch, ApiError } from "@/lib/api";
import { Ticket, fmtClock, fmtEta } from "@/lib/types";
import { getStompClient, subscribeTicket } from "@/lib/realtime";
import { FullPageLoader } from "@/components/Loader";

const ACTIVE = new Set(["waiting", "called", "serving"]);

interface QueueTicket {
  id: string;
  number: string;
  status: string;
  joinedAt: string;
  serviceId: string;
}

// Plays a short beep via Web Audio API — no network request needed
function playCallSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    [0, 0.18, 0.36].forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = "sine";
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
  if (Notification.permission === "granted") {
    new Notification("It's your turn! 🔔", {
      body: windowNum
        ? `Ticket ${ticketNumber} — please go to Window ${windowNum}`
        : `Ticket ${ticketNumber} has been called`,
      icon: "/icon-192.png",
    });
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then((perm) => {
      if (perm === "granted") {
        new Notification("It's your turn! 🔔", {
          body: windowNum
            ? `Ticket ${ticketNumber} — please go to Window ${windowNum}`
            : `Ticket ${ticketNumber} has been called`,
        });
      }
    });
  }
}

function StatusBadge({ status, t }: { status: string; t: ReturnType<typeof useTranslations<"ticket">> }) {
  const cfg =
    status === "serving"
      ? { label: t("status_badge.your_turn"), color: "var(--color-success)", bg: "var(--color-success-soft)" }
      : status === "served"
      ? { label: t("status_badge.served"), color: "var(--color-fg-3)", bg: "var(--color-surface-3)" }
      : status === "called"
      ? { label: t("status_badge.called"), color: "var(--color-warning)", bg: "var(--color-warning-soft)" }
      : { label: t("status_badge.live"), color: "var(--color-primary)", bg: "var(--color-primary-soft)" };
  return (
    <span style={{
      display: "flex", alignItems: "center", gap: 5,
      fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 999,
      background: cfg.bg, color: cfg.color,
    }}>
      {status !== "served" && (
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.color, flex: "none",
          animation: status === "waiting" ? "pulse 2s ease-in-out infinite" : undefined }}/>
      )}
      {cfg.label}
    </span>
  );
}

function QrModal({ ticketId, ticketNumber, onClose, t }: { ticketId: string; ticketNumber: string; onClose: () => void; t: ReturnType<typeof useTranslations<"ticket">> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const url = typeof window !== "undefined" ? `${window.location.origin}/ticket/${ticketId}` : "";

  useEffect(() => {
    if (!canvasRef.current || !url) return;
    import("qrcode").then((QRCode) => {
      QRCode.toCanvas(canvasRef.current!, url, {
        width: 220,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      });
    });
  }, [url]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--color-surface)", borderRadius: 20,
          padding: 28, display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
          maxWidth: 300, width: "100%",
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: -0.3 }}>QR Code</div>
        <canvas ref={canvasRef} style={{ borderRadius: 12 }} />
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 700, letterSpacing: 4 }}>
          {ticketNumber}
        </div>
        <div style={{ fontSize: 12, color: "var(--color-fg-3)", textAlign: "center", lineHeight: 1.5 }}>
          {t("qr.hint")}
        </div>
        <button
          onClick={onClose}
          style={{
            width: "100%", padding: "11px 0", borderRadius: 12, border: "none",
            background: "var(--color-surface-3)", color: "var(--color-fg)",
            fontSize: 14, fontWeight: 500, cursor: "pointer",
          }}
        >
          {t("qr.close")}
        </button>
      </div>
    </div>
  );
}

export default function TicketPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const t = useTranslations("ticket");
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [queueAround, setQueueAround] = useState<QueueTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [ratingStars, setRatingStars] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);
  const [rated, setRated] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const subRef = useRef<{ unsubscribe: () => void } | null>(null);
  const prevStatusRef = useRef<string | null>(null);

  const fetchTicket = useCallback((isInitial: boolean = false) => {
    return apiFetch<Ticket>(`/api/v1/tickets/${id}`).then((t) => {
      // Detect transition to "called" — play sound + browser notification
      if (prevStatusRef.current !== "called" && t.status === "called") {
        playCallSound();
        requestBrowserNotification(t.number, t.windowNumber ?? null);
      }
      // Auto-show rating modal when ticket transitions to served and no rating yet
      if (prevStatusRef.current !== "served" && t.status === "served" && t.ratingStars == null) {
        setShowRating(true);
      }
      prevStatusRef.current = t.status;
      setTicket(t);
      setLoadError(null);

      if (ACTIVE.has(t.status) && t.branchId) {
        apiFetch<QueueTicket[]>(`/api/v1/tickets?branchId=${t.branchId}`)
          .then((queue) => {
            const sorted = queue.sort(
              (a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()
            );
            const myIdx = sorted.findIndex((q) => q.id === id);
            if (myIdx >= 0) {
              const start = Math.max(0, myIdx - 3);
              const end = Math.min(sorted.length, myIdx + 2);
              setQueueAround(sorted.slice(start, end));
            }
          })
          .catch(() => {});
      }
    }).catch((e: unknown) => {
      // Silent on polls; surface on the initial fetch so the page can show an error
      if (!isInitial) return;
      const msg = e instanceof ApiError
        ? (e.status === 404 ? "Ticket not found"
          : e.status === 401 || e.status === 403 ? "Please sign in to view this ticket"
          : "Couldn't load this ticket")
        : "Couldn't load this ticket";
      setLoadError(msg);
    });
  }, [id]);

  useEffect(() => {
    fetchTicket(true).finally(() => setLoading(false));
    pollRef.current = setInterval(() => fetchTicket(false), 8_000);

    const stomp = getStompClient();
    const connect = () => {
      subRef.current = subscribeTicket(stomp, id, () => fetchTicket());
    };
    if (stomp.connected) connect();
    else stomp.onConnect = connect;

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      subRef.current?.unsubscribe();
    };
  }, [id, fetchTicket]);

  useEffect(() => {
    if (ticket && !ACTIVE.has(ticket.status)) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      subRef.current?.unsubscribe();
      subRef.current = null;
    }
  }, [ticket?.status]);

  async function cancel() {
    if (!ticket || cancelling) return;
    setCancelling(true);
    try {
      await apiFetch(`/api/v1/tickets/${id}/cancel`, { method: "POST" });
      await fetchTicket();
    } catch {
      setCancelling(false);
    }
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

  if (loading) {
    return <FullPageLoader label={t("loading")} hint={t("loading_hint")}/>;
  }

  if (loadError || !ticket) {
    return (
      <div style={{
        padding: "60px 24px", textAlign: "center",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 14,
          background: "var(--color-danger-soft)", color: "var(--color-danger)",
          display: "grid", placeItems: "center", fontSize: 20, fontWeight: 700,
        }}>!</div>
        <div style={{ fontSize: 14, fontWeight: 500, color: "var(--color-fg)" }}>
          {loadError ?? t("not_found")}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button onClick={() => { setLoading(true); setLoadError(null); fetchTicket(true).finally(() => setLoading(false)); }} style={{
            padding: "10px 18px", borderRadius: 10, border: "1px solid var(--color-border)",
            background: "var(--color-surface)", color: "var(--color-fg)",
            fontSize: 13, fontWeight: 500, cursor: "pointer",
          }}>{t("try_again")}</button>
          <button onClick={() => router.push("/branches")} style={{
            padding: "10px 18px", borderRadius: 10, border: "none",
            background: "var(--color-primary)", color: "#fff",
            fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>{t("find_queue")}</button>
        </div>
      </div>
    );
  }

  const isServing = ticket.status === "serving" || ticket.status === "called";
  const isDone = ticket.status === "served";
  const isCancelled = !ACTIVE.has(ticket.status) && ticket.status !== "served";

  const heroBg = isDone
    ? "linear-gradient(135deg, var(--color-success) 0%, oklch(0.55 0.14 150) 100%)"
    : isServing
    ? "linear-gradient(135deg, var(--color-success) 0%, var(--color-accent) 100%)"
    : isCancelled
    ? "linear-gradient(135deg, var(--color-fg-3) 0%, var(--color-fg-4) 100%)"
    : "linear-gradient(135deg, var(--color-primary) 0%, var(--color-violet) 100%)";

  const heroLabel = isDone
    ? t("hero.served_thanks")
    : isServing
    ? t("hero.now_serving")
    : isCancelled
    ? ticket.status.replace("_", " ")
    : t("hero.your_ticket");

  const etaTs = ticket.etaMinutes != null
    ? new Date(Date.now() + ticket.etaMinutes * 60_000).toISOString()
    : null;

  const ahead = ticket.queuePosition ?? 0;
  const progressPct = isServing ? 100 : isDone ? 100
    : ticket.etaMinutes != null ? Math.min(85, Math.max(5, 100 - (ahead / Math.max(1, ahead + 1)) * 80))
    : 8;

  return (
    <>
      {showQr && (
        <QrModal ticketId={id} ticketNumber={ticket.number} onClose={() => setShowQr(false)} t={t} />
      )}

      {showRating && (
        <div
          onClick={() => { setShowRating(false); }}
          style={{
            position: "fixed", inset: 0, zIndex: 100,
            background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "flex-end", justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--color-surface)", borderRadius: 24,
              padding: 28, width: "100%", maxWidth: 440,
              display: "flex", flexDirection: "column", gap: 18,
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
              <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.4 }}>
                {t("rating.title")}
              </div>
              <div style={{ fontSize: 13, color: "var(--color-fg-3)", marginTop: 4 }}>
                {t("rating.subtitle")}
              </div>
            </div>

            {/* Stars */}
            <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRatingStars(star)}
                  style={{
                    width: 52, height: 52, borderRadius: 14, border: "none",
                    background: star <= ratingStars ? "var(--color-primary)" : "var(--color-surface-3)",
                    fontSize: 22, cursor: "pointer",
                    transition: "background 0.15s, transform 0.1s",
                    transform: star <= ratingStars ? "scale(1.08)" : "scale(1)",
                  }}
                >
                  ⭐
                </button>
              ))}
            </div>

            {ratingStars > 0 && (
              <div style={{ fontSize: 13, color: "var(--color-fg-3)", textAlign: "center", marginTop: -8 }}>
                {(t.raw("rating.labels") as string[])[ratingStars]}
              </div>
            )}

            {/* Comment */}
            <textarea
              placeholder={t("rating.placeholder")}
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              rows={2}
              style={{
                resize: "none", width: "100%", padding: "10px 14px",
                borderRadius: 12, border: "1px solid var(--color-border)",
                background: "var(--color-bg)", color: "var(--color-fg)",
                fontSize: 14, fontFamily: "var(--font-sans)",
                boxSizing: "border-box",
                outline: "none",
              }}
            />

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setShowRating(false)}
                style={{
                  flex: 1, padding: "12px 0", borderRadius: 12,
                  border: "1px solid var(--color-border)",
                  background: "transparent", color: "var(--color-fg-3)",
                  fontSize: 14, fontWeight: 500, cursor: "pointer",
                }}
              >
                {t("rating.skip")}
              </button>
              <button
                onClick={() => submitRating(ratingStars, ratingComment)}
                disabled={ratingStars === 0 || submittingRating}
                style={{
                  flex: 2, padding: "12px 0", borderRadius: 12, border: "none",
                  background: ratingStars === 0 ? "var(--color-surface-3)" : "var(--color-primary)",
                  color: ratingStars === 0 ? "var(--color-fg-3)" : "#fff",
                  fontSize: 14, fontWeight: 600,
                  cursor: ratingStars === 0 ? "not-allowed" : "pointer",
                }}
              >
                {submittingRating ? t("rating.submitting") : t("rating.submit")}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
        {/* Header */}
        <div style={{
          padding: "12px 16px 14px",
          borderBottom: "1px solid var(--color-hairline)",
          background: "var(--color-bg)",
          position: "sticky", top: 0, zIndex: 5,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <button onClick={() => router.back()} style={{
            width: 34, height: 34, borderRadius: 10,
            background: "var(--color-surface)", border: "1px solid var(--color-border)",
            display: "grid", placeItems: "center", color: "var(--color-fg)", cursor: "pointer", flex: "none",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: -0.3, whiteSpace: "nowrap",
              overflow: "hidden", textOverflow: "ellipsis" }}>
              {ticket?.branchName || t("your_ticket")}
            </div>
            {ticket?.serviceName && (
              <div style={{ fontSize: 11, color: "var(--color-fg-3)", marginTop: 1,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {ticket.serviceName}
              </div>
            )}
          </div>
          <button
            onClick={() => setShowQr(true)}
            title="Show QR code"
            style={{
              width: 34, height: 34, borderRadius: 10,
              background: "var(--color-surface)", border: "1px solid var(--color-border)",
              display: "grid", placeItems: "center", color: "var(--color-fg)", cursor: "pointer", flex: "none",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="3" height="3" rx="0.5"/>
              <rect x="19" y="14" width="2" height="2" rx="0.5"/><rect x="14" y="19" width="2" height="2" rx="0.5"/>
              <rect x="18" y="18" width="3" height="3" rx="0.5"/>
            </svg>
          </button>
          <StatusBadge status={ticket.status} t={t} />
        </div>

        <div style={{ maxWidth: 480, margin: "0 auto", width: "100%" }}>
        <div style={{ padding: "16px 16px 24px", display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>

          {/* Hero ticket card */}
          <div style={{
            position: "relative", background: heroBg,
            borderRadius: 20, padding: 22, color: "#fff", overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", inset: 0, opacity: 0.18,
              background: "radial-gradient(circle at 80% 20%, rgba(255,255,255,0.6), transparent 50%)",
            }}/>
            <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{
                  fontFamily: "var(--font-mono)", fontSize: 11,
                  letterSpacing: 0.6, opacity: 0.75, textTransform: "uppercase",
                }}>
                  {heroLabel}
                </div>
                <span style={{
                  display: "flex", alignItems: "center", gap: 5,
                  fontSize: 11, padding: "4px 8px", borderRadius: 999,
                  background: "rgba(255,255,255,0.18)",
                }}>
                  {ticket.source === "kiosk" ? t("source_kiosk") : t("source_remote")}
                </span>
              </div>

              <div style={{
                fontSize: 80, fontWeight: 500, letterSpacing: -3.5,
                lineHeight: 0.9, fontVariantNumeric: "tabular-nums",
              }}>
                {ticket.number}
              </div>

              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8,
                padding: "12px 0 0", borderTop: "1px solid rgba(255,255,255,0.2)",
              }}>
                <div>
                  <div style={{ fontSize: 10, opacity: 0.7, fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>{t("hero.joined")}</div>
                  <div style={{ fontSize: 15, fontWeight: 600, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>
                    {fmtClock(ticket.joinedAt)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, opacity: 0.7, fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>
                    {isServing ? t("hero.window") : t("hero.ahead")}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>
                    {isServing
                      ? (ticket.windowNumber != null ? `W${ticket.windowNumber}` : "—")
                      : isDone ? t("hero.done")
                      : ticket.queuePosition != null ? ticket.queuePosition : "—"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, opacity: 0.7, fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>{t("hero.eta")}</div>
                  <div style={{ fontSize: 15, fontWeight: 600, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>
                    {isDone ? t("hero.done") : isServing ? t("hero.now") : etaTs ? fmtClock(etaTs) : fmtEta(ticket.etaMinutes)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Queue position card (waiting only) */}
          {ticket.status === "waiting" && (
            <div style={{
              background: "var(--color-surface)", border: "1px solid var(--color-border)",
              borderRadius: 14, padding: 16, display: "flex", flexDirection: "column", gap: 10,
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-fg-3)",
                  textTransform: "uppercase", letterSpacing: 0.6, fontFamily: "var(--font-mono)" }}>
                  {t("queue_pos.title")}
                </div>
                <span style={{ fontSize: 12, color: "var(--color-fg-3)", fontFamily: "var(--font-mono)" }}>
                  {ticket.etaMinutes != null ? `~${ticket.etaMinutes} min` : t("queue_pos.estimating")}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{
                  fontSize: 42, fontWeight: 700, letterSpacing: -2,
                  fontVariantNumeric: "tabular-nums",
                  color: ahead === 0 ? "var(--color-success)" : "var(--color-fg)",
                }}>
                  {ticket.queuePosition != null ? ticket.queuePosition : "—"}
                </span>
                <span style={{ fontSize: 14, color: "var(--color-fg-3)" }}>
                  {ahead === 1 ? t("queue_pos.person_ahead") : t("queue_pos.people_ahead")}
                </span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: "var(--color-surface-3)", overflow: "hidden" }}>
                <div style={{
                  height: "100%", width: `${progressPct}%`,
                  background: "linear-gradient(90deg, var(--color-primary), var(--color-accent))",
                  borderRadius: 3, transition: "width 0.8s ease",
                }}/>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between",
                fontSize: 10.5, color: "var(--color-fg-3)", fontFamily: "var(--font-mono)" }}>
                <span>joined {fmtClock(ticket.joinedAt)}</span>
                {etaTs && <span>est. {fmtClock(etaTs)}</span>}
              </div>
            </div>
          )}

          {/* Queue timeline */}
          {ticket.status === "waiting" && queueAround.length > 1 && (
            <div style={{
              background: "var(--color-surface)", border: "1px solid var(--color-border)",
              borderRadius: 14, padding: "14px 14px 6px",
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-fg-3)",
                textTransform: "uppercase", letterSpacing: 0.6, fontFamily: "var(--font-mono)",
                marginBottom: 10 }}>
                {t("timeline.title")}
              </div>
              {queueAround.map((row, i) => {
                const isMe = row.id === id;
                const rowServing = row.status === "serving" || row.status === "called";
                return (
                  <div key={row.id} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "8px 0",
                    borderBottom: i < queueAround.length - 1 ? "1px solid var(--color-hairline)" : "none",
                  }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: "50%", flex: "none",
                      background: rowServing ? "var(--color-success)" : isMe ? "var(--color-primary)" : "var(--color-border-2)",
                      animation: (rowServing || isMe) ? "pulse 2s ease-in-out infinite" : undefined,
                    }}/>
                    <span style={{
                      fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600,
                      width: 56, fontVariantNumeric: "tabular-nums",
                      color: isMe ? "var(--color-primary)" : "var(--color-fg)",
                    }}>
                      {row.number}
                    </span>
                    <span style={{ flex: 1, fontSize: 12.5, color: "var(--color-fg-2)" }}>
                      {isMe ? t("timeline.your_ticket") : rowServing ? t("timeline.now_serving") : t("timeline.waiting")}
                    </span>
                    {rowServing && (
                      <span style={{ fontSize: 11, color: "var(--color-success)", fontFamily: "var(--font-mono)" }}>
                        {t("timeline.serving")}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Called card — "I'm here" button */}
          {ticket.status === "called" && (
            <div style={{
              background: "var(--color-warning-soft)", border: "1.5px solid var(--color-warning)",
              borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 14,
            }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 6 }}>🔔</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: "var(--color-warning)", letterSpacing: -0.3 }}>
                  {t("called.heading")}
                </div>
                {ticket.windowNumber != null && (
                  <div style={{ fontSize: 13, color: "var(--color-fg-2)", marginTop: 4 }}>
                    {t("called.go_to_window", { window: ticket.windowNumber })}
                    {ticket.windowLabel && (
                      <span style={{ color: "var(--color-fg-3)" }}> · {ticket.windowLabel}</span>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={confirmPresence}
                disabled={confirming}
                style={{
                  padding: "13px 0", borderRadius: 12, border: "none",
                  background: confirming ? "var(--color-fg-4)" : "var(--color-warning)",
                  color: "#fff", fontSize: 15, fontWeight: 700,
                  cursor: confirming ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >
                {confirming ? (
                  <>
                    <span style={{ width: 14, height: 14, borderRadius: "50%",
                      border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff",
                      animation: "spin 0.7s linear infinite", flex: "none" }}/>
                    {t("called.confirming")}
                  </>
                ) : t("called.im_here")}
              </button>
              <div style={{ fontSize: 11, color: "var(--color-fg-3)", textAlign: "center" }}>
                {t("called.hint")}
              </div>
            </div>
          )}

          {/* Info rows */}
          <div style={{
            background: "var(--color-surface)", border: "1px solid var(--color-border)",
            borderRadius: 14, padding: 14, display: "flex", flexDirection: "column", gap: 8,
          }}>
            <Row label={t("info.ticket")} value={ticket.number} mono />
            {ticket.serviceName && <Row label={t("info.service")} value={ticket.serviceName} />}
            {ticket.branchName && <Row label={t("info.branch")} value={ticket.branchName} />}
            <Row label={t("info.source")} value={ticket.source === "kiosk" ? t("info.source_kiosk") : t("info.source_remote")} />
            <Row label={t("info.joined")} value={fmtClock(ticket.joinedAt)} mono />
            {ticket.calledAt && <Row label={t("info.called_at")} value={fmtClock(ticket.calledAt)} mono />}
            {ticket.servedAt && <Row label={t("info.served_at")} value={fmtClock(ticket.servedAt)} mono />}
            {ticket.windowNumber != null && (
              <Row label={t("info.window")} value={ticket.windowLabel
                ? `${t("info.window")} ${ticket.windowNumber} · ${ticket.windowLabel}`
                : `${t("info.window")} ${ticket.windowNumber}`} />
            )}
          </div>

          {/* Cancel */}
          {ACTIVE.has(ticket.status) && ticket.status !== "serving" && (
            <button
              onClick={cancel}
              disabled={cancelling}
              style={{
                padding: "12px 0", borderRadius: 12, border: "1.5px solid var(--color-border-2)",
                background: "transparent", color: cancelling ? "var(--color-fg-3)" : "var(--color-danger)",
                fontSize: 14, fontWeight: 500, cursor: cancelling ? "not-allowed" : "pointer",
              }}
            >
              {cancelling ? t("cancelling") : t("cancel")}
            </button>
          )}

          {/* Rating prompt for served tickets */}
          {isDone && !rated && ticket.ratingStars == null && !showRating && (
            <button
              onClick={() => setShowRating(true)}
              style={{
                padding: "14px 16px", borderRadius: 14,
                border: "1px solid var(--color-border)",
                background: "var(--color-surface)",
                display: "flex", alignItems: "center", gap: 10,
                cursor: "pointer", textAlign: "left",
              }}
            >
              <span style={{ fontSize: 22, flex: "none" }}>⭐</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-fg)" }}>
                  {t("rating.cta")}
                </div>
                <div style={{ fontSize: 12, color: "var(--color-fg-3)", marginTop: 2 }}>
                  {t("rating.cta_sub")}
                </div>
              </div>
              <svg style={{ marginLeft: "auto", flex: "none", color: "var(--color-fg-3)" }}
                width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m9 18 6-6-6-6"/>
              </svg>
            </button>
          )}

          {isDone && (rated || ticket.ratingStars != null) && (
            <div style={{
              padding: "12px 16px", borderRadius: 14,
              background: "var(--color-success-soft)",
              border: "1px solid var(--color-success)",
              fontSize: 13, color: "var(--color-success)",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <span>✓</span> {t("rating.thanks")}
            </div>
          )}

          {(isDone || isCancelled) && (
            <button
              onClick={() => router.push("/")}
              style={{
                padding: "14px 0", borderRadius: 14, border: "none",
                background: "var(--color-primary)", color: "#fff",
                fontSize: 15, fontWeight: 600, cursor: "pointer",
              }}
            >
              {t("find_another")}
            </button>
          )}
        </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span style={{ fontSize: 12, color: "var(--color-fg-3)" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 500, fontFamily: mono ? "var(--font-mono)" : undefined }}>{value}</span>
    </div>
  );
}
