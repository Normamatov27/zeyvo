"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useAuthStore } from "@/stores/auth";

// ─── Inline SVG icons ────────────────────────────────────────────────────────
type IconName =
  | "arrow" | "phone" | "calendar" | "activity" | "bell" | "chart" | "flow"
  | "heart" | "eye" | "sparkles" | "user" | "settings" | "building" | "users"
  | "shield" | "lock" | "globe";

const Icon = ({ name, size = 18, stroke = 1.7, style }: { name: IconName; size?: number; stroke?: number; style?: React.CSSProperties }) => {
  const paths: Record<IconName, React.ReactNode> = {
    arrow: <><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></>,
    phone: <><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="2"/></>,
    calendar: <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
    activity: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>,
    bell: <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>,
    chart: <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
    flow: <><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></>,
    heart: <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>,
    eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
    sparkles: <><path d="M12 3l1.88 5.76L20 10l-5.76 1.88L12 18l-1.88-5.76L4 10l5.76-1.88z"/><path d="M5 3l.88 2.76L9 7l-2.76.88L5 11l-.88-2.76L1 7l2.76-.88z" opacity=".5"/></>,
    user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
    building: <><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></>,
    users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>,
    lock: <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>,
    globe: <><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></>,
  };
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round"
      style={{ display: "inline-block", verticalAlign: "middle", ...style }}
    >
      {paths[name]}
    </svg>
  );
};

const Logo = ({ size = 20, stroke = 1.8, color = "currentColor" }: { size?: number; stroke?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9"/>
    <path d="M8 9h8l-8 6h8"/>
  </svg>
);

// ─── Language switcher styled for dark background ─────────────────────────────
const LangSwitch = () => {
  const router = useRouter();
  const active = useLocale();
  const [pending, startTransition] = useTransition();

  function change(code: "en" | "uz" | "ru") {
    if (code === (active as string)) return;
    document.cookie = `NEXT_LOCALE=${code}; path=/; max-age=31536000; SameSite=Lax`;
    startTransition(() => router.refresh());
  }

  return (
    <div style={{
      display: "flex", gap: 2, padding: 3, borderRadius: 8,
      background: "rgba(255,255,255,0.06)",
    }}>
      {(["en", "uz", "ru"] as const).map((code) => {
        const isActive = (active as string) === code;
        return (
          <button
            key={code}
            onClick={() => change(code)}
            disabled={pending}
            style={{
              padding: "4px 9px", borderRadius: 6, border: "none",
              background: isActive ? "rgba(255,255,255,0.12)" : "transparent",
              color: isActive ? "#fff" : "rgba(255,255,255,0.5)",
              fontSize: 11, fontWeight: isActive ? 700 : 400,
              cursor: pending ? "wait" : "pointer",
              fontFamily: "var(--font-mono)",
              letterSpacing: 0.5,
              transition: "background 0.15s, color 0.15s",
            }}
          >
            {code.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
};

// ─── Cinematic animated background ───────────────────────────────────────────
const HeroBackdrop = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      const w = canvas.offsetWidth, h = canvas.offsetHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const handleResize = () => resize();
    window.addEventListener("resize", handleResize);

    const lanes = 6;
    type Dot = { lane: number; x: number; speed: number; size: number; opacity: number; hue: number };
    const dots: Dot[] = [];
    for (let i = 0; i < 36; i++) {
      dots.push({
        lane: Math.floor(Math.random() * lanes),
        x: Math.random() * canvas.offsetWidth,
        speed: 0.3 + Math.random() * 0.5,
        size: 1.5 + Math.random() * 1.8,
        opacity: 0.25 + Math.random() * 0.5,
        hue: 220 + Math.random() * 20,
      });
    }

    let raf = 0;
    const draw = () => {
      const w = canvas.offsetWidth, h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      ctx.strokeStyle = "rgba(160, 200, 255, 0.04)";
      ctx.lineWidth = 1;
      for (let i = 1; i < lanes; i++) {
        const y = (h / lanes) * i;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      dots.forEach((d) => {
        d.x += d.speed;
        if (d.x > w + 20) d.x = -20;
        const y = (h / lanes) * d.lane + (h / lanes) / 2;
        const grad = ctx.createRadialGradient(d.x, y, 0, d.x, y, 16);
        grad.addColorStop(0, `oklch(0.78 0.14 ${d.hue} / ${d.opacity * 0.4})`);
        grad.addColorStop(1, `oklch(0.78 0.14 ${d.hue} / 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(d.x, y, 16, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `oklch(0.85 0.14 ${d.hue} / ${d.opacity})`;
        ctx.beginPath(); ctx.arc(d.x, y, d.size, 0, Math.PI * 2); ctx.fill();
      });

      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute", inset: 0, width: "100%", height: "100%",
        pointerEvents: "none", opacity: 0.85,
      }}
    />
  );
};

// ─── Live mini queue widget for hero ─────────────────────────────────────────
const HeroLiveWidget = () => {
  const [serving, setServing] = useState(124);
  const [clock, setClock] = useState("");
  useEffect(() => {
    setClock(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
    const id = setInterval(() => setServing((s) => s + 1), 2400);
    const tid = setInterval(() => setClock(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })), 30_000);
    return () => { clearInterval(id); clearInterval(tid); };
  }, []);
  const services = ["Open account", "Currency exchange", "Card replacement", "Consultation"];
  return (
    <div className="lp-hero-widget" style={{
      width: 360, maxWidth: "100%", position: "relative",
      borderRadius: 20, padding: 4,
      background: "linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04))",
      backdropFilter: "blur(20px)",
    }}>
      <div style={{
        background: "linear-gradient(180deg, rgba(20, 28, 42, 0.92), rgba(10, 14, 21, 0.92))",
        borderRadius: 18, padding: 20, color: "#fff",
        border: "1px solid rgba(255,255,255,0.05)",
        display: "flex", flexDirection: "column", gap: 14,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="z-live" style={{
              width: 6, height: 6, borderRadius: "50%",
              background: "oklch(0.78 0.14 220)", color: "oklch(0.78 0.14 220)",
              position: "relative",
            }}/>
            <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: 0.4, textTransform: "uppercase", opacity: 0.7 }}>
              Live · Mirzo Ulugbek
            </span>
          </div>
          <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", opacity: 0.5, fontVariantNumeric: "tabular-nums" }}>{clock}</span>
        </div>

        <div>
          <div style={{ fontSize: 10, opacity: 0.5, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: 0.6 }}>now serving</div>
          <div style={{
            fontSize: 56, fontWeight: 500, letterSpacing: -2.4, lineHeight: 1, marginTop: 4,
            fontVariantNumeric: "tabular-nums",
            background: "linear-gradient(135deg, #fff 0%, oklch(0.78 0.14 220) 100%)",
            WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
          }}>A-{serving}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {[1, 2, 3, 4].map((d, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 10,
              fontSize: 11.5, color: i === 0 ? "#fff" : "rgba(255,255,255,0.5)",
              fontFamily: "var(--font-mono)",
              opacity: 1 - i * 0.18,
            }}>
              <span style={{
                width: 5, height: 5, borderRadius: "50%",
                background: i === 0 ? "oklch(0.78 0.14 220)" : "rgba(255,255,255,0.3)",
              }}/>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>A-{serving + d}</span>
              <span style={{ flex: 1, color: "rgba(255,255,255,0.4)" }}>{services[i]}</span>
              <span style={{ opacity: 0.5 }}>~{(i + 1) * 3}m</span>
            </div>
          ))}
        </div>

        <div style={{
          paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)",
          display: "flex", justifyContent: "space-between",
          fontSize: 11, fontFamily: "var(--font-mono)",
        }}>
          <div>
            <div style={{ opacity: 0.45, fontSize: 9, textTransform: "uppercase", letterSpacing: 0.6 }}>wait</div>
            <div style={{ marginTop: 2, fontVariantNumeric: "tabular-nums" }}>4:12</div>
          </div>
          <div>
            <div style={{ opacity: 0.45, fontSize: 9, textTransform: "uppercase", letterSpacing: 0.6 }}>load</div>
            <div style={{ marginTop: 2, color: "oklch(0.78 0.14 220)" }}>medium</div>
          </div>
          <div>
            <div style={{ opacity: 0.45, fontSize: 9, textTransform: "uppercase", letterSpacing: 0.6 }}>remote</div>
            <div style={{ marginTop: 2, fontVariantNumeric: "tabular-nums" }}>42%</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Section wrapper ─────────────────────────────────────────────────────────
const Section = ({ id, eyebrow, title, sub, children, scrollMarginTop = 64 }: {
  id?: string; eyebrow?: string; title?: string; sub?: string;
  children: React.ReactNode; scrollMarginTop?: number;
}) => (
  <div id={id} className="lp-section" style={{
    padding: "88px 48px",
    borderTop: "1px solid rgba(255,255,255,0.04)",
    scrollMarginTop,
  }}>
    <div style={{ maxWidth: 1280, margin: "0 auto" }}>
      <div style={{ maxWidth: 720 }}>
        {eyebrow && <div style={{
          fontFamily: "var(--font-mono)", fontSize: 11, color: "oklch(0.78 0.14 220)",
          textTransform: "uppercase", letterSpacing: 1, fontWeight: 500,
        }}>{eyebrow}</div>}
        {title && (
          <h2 style={{
            fontSize: 44, fontWeight: 500, letterSpacing: -1.5,
            margin: "14px 0 0", lineHeight: 1.05,
            background: "linear-gradient(180deg, #fff 0%, rgba(255,255,255,0.75) 100%)",
            WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
          }}>{title}</h2>
        )}
        {sub && <p style={{
          fontSize: 16, color: "rgba(255,255,255,0.55)", maxWidth: 560,
          lineHeight: 1.55, marginTop: 16, letterSpacing: -0.1,
        }}>{sub}</p>}
      </div>
      {children}
    </div>
  </div>
);

// ─── Embedded dashboard preview ──────────────────────────────────────────────
const DashboardPreview = () => (
  <div style={{ height: 480, display: "flex", color: "#0e1320" }}>
    <div style={{
      width: 200, padding: "14px 10px",
      background: "oklch(0.97 0.004 250)", borderRight: "1px solid oklch(0.92 0.006 250)",
      display: "flex", flexDirection: "column", gap: 4,
    }}>
      <div style={{ padding: "8px 10px", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
        <Logo size={16} stroke={1.8}/>
        <span style={{ fontWeight: 600, fontSize: 14 }}>zeyvo</span>
      </div>
      {[
        { l: "Overview", i: "activity" as const, active: true },
        { l: "Queues", i: "flow" as const },
        { l: "Appointments", i: "calendar" as const },
        { l: "Analytics", i: "chart" as const },
        { l: "Branches", i: "building" as const },
        { l: "Staff", i: "users" as const },
      ].map((n) => (
        <div key={n.l} style={{
          padding: "7px 10px", borderRadius: 6, fontSize: 12.5,
          background: n.active ? "oklch(0.96 0.04 262)" : "transparent",
          color: n.active ? "oklch(0.5 0.18 262)" : "oklch(0.36 0.015 260)",
          display: "flex", alignItems: "center", gap: 8, fontWeight: n.active ? 500 : 400,
        }}>
          <Icon name={n.i} size={14}/> {n.l}
        </div>
      ))}
    </div>
    <div style={{ flex: 1, padding: 18, display: "flex", flexDirection: "column", gap: 14, background: "oklch(0.985 0.003 250)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
        {[
          { l: "Waiting now", v: "318", d: "+24" },
          { l: "Avg wait", v: "6:42", d: "−58s" },
          { l: "Served", v: "2,184", d: "+12%" },
          { l: "CSAT", v: "4.7", d: "+0.1" },
        ].map((stat) => (
          <div key={stat.l} style={{
            padding: 12, background: "#fff",
            border: "1px solid oklch(0.92 0.006 250)", borderRadius: 10,
          }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, color: "oklch(0.55 0.012 260)", textTransform: "uppercase", letterSpacing: 0.6 }}>{stat.l}</div>
            <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.5, marginTop: 6, fontVariantNumeric: "tabular-nums" }}>{stat.v}</div>
            <div style={{ fontSize: 10, color: "oklch(0.62 0.14 150)", marginTop: 4, fontFamily: "var(--font-mono)" }}>{stat.d}</div>
          </div>
        ))}
      </div>
      <div style={{ flex: 1, background: "#fff", border: "1px solid oklch(0.92 0.006 250)", borderRadius: 12, padding: 14 }}>
        <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "oklch(0.55 0.012 260)", textTransform: "uppercase", letterSpacing: 0.5 }}>Live customer flow</div>
        <svg viewBox="0 0 600 180" style={{ width: "100%", height: 180, marginTop: 6 }}>
          <defs>
            <linearGradient id="dpg" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.5 0.18 262)" stopOpacity="0.2"/>
              <stop offset="100%" stopColor="oklch(0.5 0.18 262)" stopOpacity="0"/>
            </linearGradient>
          </defs>
          <path d="M0 130 C 80 110, 140 90, 200 80 S 320 60, 380 50 S 480 75, 540 60 L 600 65 L 600 180 L 0 180 Z" fill="url(#dpg)"/>
          <path d="M0 130 C 80 110, 140 90, 200 80 S 320 60, 380 50 S 480 75, 540 60 L 600 65" fill="none" stroke="oklch(0.5 0.18 262)" strokeWidth="2"/>
        </svg>
      </div>
    </div>
  </div>
);

// ─── Top nav (auth-aware) ────────────────────────────────────────────────────
const TopNav = ({ authed, t }: { authed: boolean; t: ReturnType<typeof useTranslations<"landing">> }) => (
  <div className="lp-topnav" style={{
    height: 64, padding: "0 40px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    position: "sticky", top: 0, zIndex: 30,
    background: "rgba(10, 14, 21, 0.6)", backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
  }}>
    <div style={{
      maxWidth: 1280, margin: "0 auto", height: "100%",
      display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
        <a href="#top" style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          fontWeight: 600, fontSize: 17, letterSpacing: -0.4,
          color: "#fff", textDecoration: "none",
        }}>
          <Logo size={20} color="#fff" stroke={1.8}/>
          <span style={{ marginLeft: -2 }}>zeyvo</span>
        </a>
        <nav className="lp-nav" style={{ display: "flex", gap: 28, fontSize: 13.5 }}>
          {[
            { label: t("nav.product"),     href: "#features" },
            { label: t("nav.industries"),  href: "#industries" },
            { label: t("nav.console"),     href: "#console" },
            { label: t("nav.earlyAccess"), href: "#early-access" },
          ].map((n) => (
            <a key={n.href} href={n.href} style={{
              color: "rgba(255,255,255,0.65)", textDecoration: "none",
              transition: "color 0.15s",
            }}>{n.label}</a>
          ))}
        </nav>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <LangSwitch/>
        {authed ? (
          <Link href="/branches" style={{
            padding: "8px 14px", borderRadius: 8,
            background: "#fff", color: "#0a0e15",
            fontSize: 13, fontWeight: 600, textDecoration: "none",
            display: "inline-flex", alignItems: "center", gap: 6,
          }}>
            {t("nav.openApp")} <Icon name="arrow" size={13}/>
          </Link>
        ) : (
          <>
            <Link href="/sign-in" style={{
              padding: "8px 14px", borderRadius: 8,
              background: "transparent", border: "1px solid rgba(255,255,255,0.18)",
              color: "#fff", fontSize: 13, fontWeight: 500, textDecoration: "none",
            }}>{t("nav.signIn")}</Link>
            <a href="mailto:uzgamer.uz27@gmail.com?subject=zeyvo%20%E2%80%94%20Request%20demo" style={{
              padding: "8px 14px", borderRadius: 8,
              background: "#fff", color: "#0a0e15",
              fontSize: 13, fontWeight: 600, textDecoration: "none",
              display: "inline-flex", alignItems: "center", gap: 6,
            }}>{t("nav.requestDemo")} <Icon name="arrow" size={13}/></a>
          </>
        )}
      </div>
    </div>
  </div>
);

// ─── Hero ────────────────────────────────────────────────────────────────────
const Hero = ({ t }: { t: ReturnType<typeof useTranslations<"landing">> }) => (
  <div style={{ position: "relative", overflow: "hidden" }}>
    <HeroBackdrop/>
    <div className="lp-hero-grid" style={{
      position: "relative", padding: "96px 48px 80px", maxWidth: 1280, margin: "0 auto",
      display: "grid", gridTemplateColumns: "1fr 400px", gap: 64, alignItems: "center",
    }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "6px 12px", borderRadius: 999,
          background: "rgba(160, 200, 255, 0.08)",
          border: "1px solid rgba(160, 200, 255, 0.15)",
          fontSize: 11.5, color: "oklch(0.78 0.14 220)",
          fontFamily: "var(--font-mono)", letterSpacing: 0.4, alignSelf: "flex-start",
        }}>
          <span className="z-live" style={{
            width: 5, height: 5, borderRadius: "50%",
            background: "oklch(0.78 0.14 220)", color: "oklch(0.78 0.14 220)",
            position: "relative",
          }}/>
          {t("hero.badge")}
        </span>

        <h1 style={{
          fontSize: 80, fontWeight: 500, letterSpacing: -3.2, margin: 0, lineHeight: 0.98,
          background: "linear-gradient(180deg, #fff 0%, rgba(255,255,255,0.7) 100%)",
          WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
        }}>
          {t("hero.line1")}<br/>
          <span style={{
            background: "linear-gradient(90deg, oklch(0.78 0.14 220), oklch(0.65 0.18 262))",
            WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
          }}>{t("hero.line2")}</span>
        </h1>

        <p style={{
          fontSize: 18, lineHeight: 1.5, color: "rgba(255,255,255,0.65)",
          margin: 0, maxWidth: 540, letterSpacing: -0.2,
        }}>
          {t("hero.desc")}
        </p>

        <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
          <Link href="/onboarding" style={{
            padding: "14px 22px", borderRadius: 10,
            background: "#fff", color: "#0a0e15",
            fontSize: 14, fontWeight: 600, textDecoration: "none",
            display: "inline-flex", alignItems: "center", gap: 8,
          }}>
            {t("hero.startTrial")} <Icon name="arrow" size={15}/>
          </Link>
          <a
            href="https://t.me/zeyvo_app"
            target="_blank" rel="noopener noreferrer"
            style={{
              padding: "14px 22px", borderRadius: 10,
              background: "transparent", border: "1px solid rgba(255,255,255,0.18)",
              color: "#fff", fontSize: 14, fontWeight: 500, textDecoration: "none",
              display: "inline-flex", alignItems: "center", gap: 8,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.088 13.81l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.834.836z"/>
            </svg>
            {t("hero.openTelegram")}
          </a>
        </div>

        <div style={{
          display: "flex", gap: 36, marginTop: 36, paddingTop: 28,
          borderTop: "1px solid rgba(255,255,255,0.06)",
          flexWrap: "wrap",
        }}>
          {[
            { v: "Web + TG", l: t("hero.statChannels") },
            { v: "< 200ms", l: t("hero.statLatency") },
            { v: "UZ-first", l: t("hero.statNative") },
          ].map((s) => (
            <div key={s.l}>
              <div style={{ fontSize: 26, fontWeight: 500, letterSpacing: -0.8, fontVariantNumeric: "tabular-nums", color: "#fff" }}>{s.v}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 4, fontFamily: "var(--font-mono)", letterSpacing: 0.4, textTransform: "uppercase" }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center" }}>
        <HeroLiveWidget/>
      </div>
    </div>
  </div>
);

// ─── Problem section ─────────────────────────────────────────────────────────
const Problem = ({ t }: { t: ReturnType<typeof useTranslations<"landing">> }) => (
  <Section
    eyebrow={t("problem.eyebrow")}
    title={t("problem.title")}
    sub={t("problem.sub")}
  >
    <div className="lp-grid-stats" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 40, maxWidth: 1280 }}>
      {[
        { v: "47m", l: t("problem.s1") },
        { v: "23%", l: t("problem.s2") },
        { v: "$1.4k/d", l: t("problem.s3") },
        { v: "3.8 hr", l: t("problem.s4") },
      ].map((p) => (
        <div key={p.v} style={{
          padding: 22, borderRadius: 14,
          background: "rgba(255,255,255,0.025)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div style={{
            fontSize: 36, fontWeight: 500, letterSpacing: -1, lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
            color: "oklch(0.78 0.14 220)",
          }}>{p.v}</div>
          <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.55)", marginTop: 10, lineHeight: 1.4 }}>{p.l}</div>
        </div>
      ))}
    </div>
  </Section>
);

// ─── Solution / features ─────────────────────────────────────────────────────
const Solution = ({ t }: { t: ReturnType<typeof useTranslations<"landing">> }) => (
  <Section id="features" eyebrow={t("solution.eyebrow")} title={t("solution.title")}>
    <div className="lp-grid-features" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginTop: 36, maxWidth: 1280 }}>
      {([
        { i: "phone" as const,    tk: "f1t", dk: "f1d" },
        { i: "calendar" as const, tk: "f2t", dk: "f2d" },
        { i: "activity" as const, tk: "f3t", dk: "f3d" },
        { i: "bell" as const,     tk: "f4t", dk: "f4d" },
        { i: "chart" as const,    tk: "f5t", dk: "f5d" },
        { i: "flow" as const,     tk: "f6t", dk: "f6d" },
      ] as const).map((f) => (
        <div key={f.tk} style={{
          padding: 24, borderRadius: 16,
          background: "rgba(255,255,255,0.025)",
          border: "1px solid rgba(255,255,255,0.06)",
          display: "flex", flexDirection: "column", gap: 12,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: "linear-gradient(135deg, oklch(0.4 0.12 220), oklch(0.3 0.12 262))",
            color: "#fff", display: "grid", placeItems: "center",
          }}>
            <Icon name={f.i} size={20} stroke={1.6}/>
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: -0.3, color: "#fff" }}>
            {t(`solution.${f.tk}` as Parameters<typeof t>[0])}
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.55 }}>
            {t(`solution.${f.dk}` as Parameters<typeof t>[0])}
          </div>
        </div>
      ))}
    </div>
  </Section>
);

// ─── Console preview ─────────────────────────────────────────────────────────
const Console = ({ t }: { t: ReturnType<typeof useTranslations<"landing">> }) => (
  <Section
    id="console"
    eyebrow={t("console.eyebrow")}
    title={t("console.title")}
    sub={t("console.sub")}
  >
    <div className="lp-console-wrap" style={{
      marginTop: 40, position: "relative",
      background: "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
      borderRadius: 18, padding: 4,
      border: "1px solid rgba(255,255,255,0.08)",
      maxWidth: 1280,
    }}>
      <div className="lp-console-scroll" style={{ background: "#fff", borderRadius: 14, overflow: "hidden" }}>
        <DashboardPreview/>
      </div>
    </div>
  </Section>
);

// ─── Industries ──────────────────────────────────────────────────────────────
const Industries = ({ t }: { t: ReturnType<typeof useTranslations<"landing">> }) => (
  <Section id="industries" eyebrow={t("industries.eyebrow")} title={t("industries.title")}>
    <div className="lp-grid-industries" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, marginTop: 36, maxWidth: 1280 }}>
      {([
        { i: "heart" as const,    tk: "i1t", dk: "i1d" },
        { i: "eye" as const,      tk: "i2t", dk: "i2d" },
        { i: "sparkles" as const, tk: "i3t", dk: "i3d" },
        { i: "user" as const,     tk: "i4t", dk: "i4d" },
        { i: "settings" as const, tk: "i5t", dk: "i5d" },
      ] as const).map((s) => (
        <div key={s.tk} style={{
          padding: 22, borderRadius: 14,
          background: "rgba(255,255,255,0.025)",
          border: "1px solid rgba(255,255,255,0.06)",
          display: "flex", flexDirection: "column", gap: 14,
        }}>
          <Icon name={s.i} size={22} style={{ color: "oklch(0.78 0.14 220)" }}/>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>
              {t(`industries.${s.tk}` as Parameters<typeof t>[0])}
            </div>
            <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.45)", marginTop: 3 }}>
              {t(`industries.${s.dk}` as Parameters<typeof t>[0])}
            </div>
          </div>
        </div>
      ))}
    </div>
  </Section>
);

// ─── Early access ────────────────────────────────────────────────────────────
const EarlyAccess = ({ t }: { t: ReturnType<typeof useTranslations<"landing">> }) => (
  <Section
    id="early-access"
    eyebrow={t("early.eyebrow")}
    title={t("early.title")}
    sub={t("early.sub")}
  >
    <div className="lp-grid-early" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginTop: 36, maxWidth: 1280 }}>
      {([
        { tk: "c1t", dk: "c1d" },
        { tk: "c2t", dk: "c2d" },
        { tk: "c3t", dk: "c3d" },
      ] as const).map((c) => (
        <div key={c.tk} style={{
          padding: 24, borderRadius: 16,
          background: "rgba(255,255,255,0.025)",
          border: "1px solid rgba(255,255,255,0.06)",
          display: "flex", flexDirection: "column", gap: 12,
        }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#fff", letterSpacing: -0.2 }}>
            {t(`early.${c.tk}` as Parameters<typeof t>[0])}
          </div>
          <div style={{ fontSize: 13.5, color: "rgba(255,255,255,0.55)", lineHeight: 1.55 }}>
            {t(`early.${c.dk}` as Parameters<typeof t>[0])}
          </div>
        </div>
      ))}
    </div>
  </Section>
);

// ─── CTA ─────────────────────────────────────────────────────────────────────
const CtaCard = ({ t }: { t: ReturnType<typeof useTranslations<"landing">> }) => (
  <div className="lp-cta-section" style={{ padding: "80px 48px 60px" }}>
    <div style={{
      maxWidth: 1280, margin: "0 auto",
      borderRadius: 24, padding: "56px 40px", textAlign: "center",
      background: "radial-gradient(ellipse at 50% 0%, oklch(0.4 0.18 262 / 0.4) 0%, transparent 60%), linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
      border: "1px solid rgba(255,255,255,0.08)",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        fontSize: 56, fontWeight: 500, letterSpacing: -2, lineHeight: 1.02, maxWidth: 760, margin: "0 auto",
        background: "linear-gradient(180deg, #fff 0%, rgba(255,255,255,0.7) 100%)",
        WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
      }}>
        {t("cta.title")}
      </div>
      <p style={{ fontSize: 16, color: "rgba(255,255,255,0.6)", maxWidth: 480, margin: "20px auto 0", lineHeight: 1.5 }}>
        {t("cta.sub")}
      </p>
      <div style={{ display: "flex", gap: 10, marginTop: 28, justifyContent: "center", flexWrap: "wrap" }}>
        <a href="mailto:uzgamer.uz27@gmail.com?subject=zeyvo%20%E2%80%94%20Request%20demo" style={{
          padding: "14px 22px", borderRadius: 10,
          background: "#fff", color: "#0a0e15",
          fontSize: 14, fontWeight: 600, textDecoration: "none",
          display: "inline-flex", alignItems: "center", gap: 8,
        }}>{t("cta.requestDemo")} <Icon name="arrow" size={15}/></a>
        <Link href="/branches" style={{
          padding: "14px 22px", borderRadius: 10,
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.15)",
          color: "#fff", fontSize: 14, fontWeight: 500, textDecoration: "none",
        }}>{t("cta.openDemo")}</Link>
      </div>
    </div>
  </div>
);

// ─── Footer ──────────────────────────────────────────────────────────────────
const Footer = ({ t }: { t: ReturnType<typeof useTranslations<"landing">> }) => {
  const footerColumns = [
    {
      title: t("footer.col1"),
      links: [
        { label: t("footer.links.remoteQueue"),   href: "#features" },
        { label: t("footer.links.liveMonitor"),   href: "#features" },
        { label: t("footer.links.analytics"),     href: "#console" },
        { label: t("footer.links.kiosks"),        href: "#features" },
        { label: t("footer.links.telegramBot"),   href: "https://t.me/zeyvo_app", external: true },
      ],
    },
    {
      title: t("footer.col2"),
      links: [
        { label: t("footer.links.clinics"),        href: "#industries" },
        { label: t("footer.links.diagnostics"),    href: "#industries" },
        { label: t("footer.links.salons"),         href: "#industries" },
        { label: t("footer.links.dental"),         href: "#industries" },
        { label: t("footer.links.serviceCenters"), href: "#industries" },
      ],
    },
    {
      title: t("footer.col3"),
      links: [
        { label: t("footer.links.earlyAccess"),   href: "#early-access" },
        { label: t("footer.links.contact"),       href: "mailto:uzgamer.uz27@gmail.com", external: true },
        { label: t("footer.links.instagram"),     href: "https://instagram.com/zeyvo.app", external: true },
        { label: t("footer.links.github"),        href: "https://github.com/Normamatov27/zeyvo", external: true },
        { label: t("footer.links.privacy"),       href: "/privacy" },
        { label: t("footer.links.terms"),         href: "/terms" },
      ],
    },
  ];

  return (
    <div style={{
      padding: "32px 40px",
      borderTop: "1px solid rgba(255,255,255,0.06)",
      background: "rgba(255,255,255,0.02)",
    }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div className="lp-footer-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 24 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 600, color: "#fff" }}>
              <Logo size={18} color="#fff" stroke={1.8}/> zeyvo
            </div>
            <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.45)", maxWidth: 280, lineHeight: 1.55, marginTop: 12 }}>
              {t("footer.desc")}
            </p>
          </div>
          {footerColumns.map((col) => (
            <div key={col.title}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 10 }}>{col.title}</div>
              {col.links.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  {...("external" in l && l.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  style={{
                    fontSize: 12.5, color: "rgba(255,255,255,0.7)",
                    padding: "3px 0", display: "block",
                    textDecoration: "none",
                  }}
                >
                  {l.label}
                </a>
              ))}
            </div>
          ))}
        </div>
        <div style={{
          marginTop: 28, paddingTop: 18, borderTop: "1px solid rgba(255,255,255,0.06)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          fontSize: 11.5, color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-mono)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span>© 2026 zeyvo labs · tashkent</span>
            <a href="/privacy" style={{ color: "rgba(255,255,255,0.4)", textDecoration: "none" }}>{t("footer.links.privacyShort")}</a>
            <a href="/terms" style={{ color: "rgba(255,255,255,0.4)", textDecoration: "none" }}>{t("footer.links.termsShort")}</a>
          </div>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 6, height: 6, background: "oklch(0.62 0.14 150)", borderRadius: "50%" }}/>
            {t("footer.allOperational")}
          </span>
        </div>
      </div>
    </div>
  );
};

// ─── Page ────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { userId, _hydrated } = useAuthStore();
  const authed = _hydrated && userId !== null;
  const t = useTranslations("landing");

  // Track page view
  useEffect(() => {
    fetch("/api/v1/public/pageview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: "/",
        referrer: typeof document !== "undefined" ? document.referrer : "",
      }),
    }).catch(() => {});
  }, []);

  return (
    <div id="top" style={{
      minHeight: "100vh",
      background: "#0a0e15",
      color: "#fff",
      fontFamily: "var(--font-sans)",
    }}>
      <style>{`
        /* Tablet ≤900 */
        @media (max-width: 900px) {
          .lp-hero-grid {
            grid-template-columns: 1fr !important;
            padding: 56px 24px 56px !important;
            gap: 36px !important;
          }
          .lp-hero-widget {
            width: 100% !important; max-width: 420px; margin: 0 auto;
          }
          .lp-hero-grid h1 {
            font-size: clamp(40px, 9vw, 64px) !important;
            letter-spacing: -2 !important;
          }
          .lp-grid-features { grid-template-columns: 1fr 1fr !important; }
          .lp-grid-industries { grid-template-columns: repeat(3, 1fr) !important; }
          .lp-grid-early { grid-template-columns: 1fr !important; }
          .lp-grid-stats { grid-template-columns: 1fr 1fr !important; }
          .lp-footer-grid { grid-template-columns: 1fr 1fr !important; }
          .lp-section { padding: 56px 24px !important; }
          .lp-cta-section { padding: 56px 24px 48px !important; }
          .lp-console-scroll { overflow-x: auto !important; }
          .lp-section h2 { font-size: clamp(28px, 5vw, 40px) !important; letter-spacing: -1 !important; }
        }
        /* Phone ≤640 */
        @media (max-width: 640px) {
          .lp-nav, .lp-lang-hint { display: none !important; }
          .lp-grid-features { grid-template-columns: 1fr !important; }
          .lp-grid-industries { grid-template-columns: 1fr 1fr !important; }
          .lp-grid-stats { grid-template-columns: 1fr 1fr !important; gap: 8px !important; }
          .lp-footer-grid { grid-template-columns: 1fr 1fr !important; gap: 20px !important; }
          .lp-section { padding: 48px 20px !important; }
          .lp-cta-section { padding: 48px 20px 40px !important; }
          .lp-cta-section > div { padding: 36px 24px !important; }
          .lp-cta-section h2, .lp-cta-section [class*="cta"] { font-size: clamp(32px, 8vw, 44px) !important; }
          .lp-hero-grid { padding: 40px 20px 56px !important; }
          .lp-topnav { padding: 0 18px !important; }
        }
      `}</style>
      <TopNav authed={authed} t={t}/>
      <Hero t={t}/>
      <Problem t={t}/>
      <Solution t={t}/>
      <Console t={t}/>
      <Industries t={t}/>
      <EarlyAccess t={t}/>
      <CtaCard t={t}/>
      <Footer t={t}/>
    </div>
  );
}
