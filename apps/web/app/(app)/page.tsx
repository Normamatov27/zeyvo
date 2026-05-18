"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth";

// ─── Shared primitives ──────────────────────────────────────────────────────

const LiveDot = () => (
  <span style={{ position: "relative", display: "inline-flex", width: 8, height: 8 }}>
    <span style={{
      position: "absolute", inset: 0, borderRadius: "50%",
      background: "var(--color-success)", opacity: 0.5,
      animation: "ping 1.4s cubic-bezier(0,0,0.2,1) infinite",
    }}/>
    <span style={{ borderRadius: "50%", width: 8, height: 8, background: "var(--color-success)" }}/>
    <style>{`@keyframes ping{75%,100%{transform:scale(2);opacity:0}}`}</style>
  </span>
);

const Sparkline = ({ data, w = 80, h = 28, color = "var(--color-primary)" }: { data: number[]; w?: number; h?: number; color?: string }) => {
  const max = Math.max(...data), min = Math.min(...data);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / (max - min || 1)) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
    </svg>
  );
};

// Simple inline icon set — just the shapes we actually use
const Icon = ({ name, size = 18, style: s }: { name: string; size?: number; style?: React.CSSProperties }) => {
  const icons: Record<string, React.ReactNode> = {
    phone: <><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="2"/></>,
    activity: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>,
    sparkles: <><path d="M12 3l1.88 5.76L20 10l-5.76 1.88L12 18l-1.88-5.76L4 10l5.76-1.88z"/><path d="M5 3l.88 2.76L9 7l-2.76.88L5 11l-.88-2.76L1 7l2.76-.88z" opacity=".5"/></>,
    chart: <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
    users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    flow: <><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></>,
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>,
    lock: <><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>,
    server: <><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></>,
    globe: <><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></>,
    eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
    bell: <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>,
    arrow: <><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></>,
    check: <polyline points="20 6 9 17 4 12"/>,
    plus: <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    minus: <line x1="5" y1="12" x2="19" y2="12"/>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={s}>
      {icons[name]}
    </svg>
  );
};

const Tag = ({ children, dot }: { children: React.ReactNode; dot?: boolean }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 6,
    fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 999,
    background: "var(--color-primary-soft)", color: "var(--color-primary)",
    fontFamily: "var(--font-mono)",
  }}>
    {dot && <LiveDot />}
    {children}
  </span>
);

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <div style={{
    fontSize: 11, fontWeight: 600, color: "var(--color-fg-3)",
    textTransform: "uppercase", letterSpacing: 0.8, fontFamily: "var(--font-mono)",
  }}>{children}</div>
);

const Wordmark = () => (
  <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.5, color: "var(--color-fg)" }}>
    zeyvo
  </span>
);

// ─── TopNav ─────────────────────────────────────────────────────────────────

const TopNav = ({ authed }: { authed: boolean }) => (
  <div style={{
    height: 64, padding: "0 48px",
    display: "flex", alignItems: "center", justifyContent: "space-between",
    borderBottom: "1px solid var(--color-hairline)",
    position: "sticky", top: 0, background: "var(--color-bg)", zIndex: 10,
  }}>
    <Wordmark />
    <nav style={{ display: "flex", gap: 28, fontSize: 13.5, color: "var(--color-fg-2)" }}>
      {["Product", "Analytics", "Integrations", "Pricing"].map((l) => (
        <span key={l} style={{ cursor: "pointer" }}>{l}</span>
      ))}
    </nav>
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      {authed ? (
        <Link href="/branches" style={{
          padding: "8px 18px", borderRadius: 10,
          background: "var(--color-primary)", color: "#fff",
          fontSize: 13, fontWeight: 600, textDecoration: "none",
          display: "flex", alignItems: "center", gap: 6,
        }}>Open app <Icon name="arrow" size={12}/></Link>
      ) : (
        <>
          <Link href="/sign-in" style={{
            padding: "8px 16px", borderRadius: 10,
            background: "transparent", color: "var(--color-fg-2)",
            fontSize: 13, fontWeight: 500, textDecoration: "none",
            border: "1px solid var(--color-border)",
          }}>Sign in</Link>
          <Link href="/sign-in" style={{
            padding: "8px 18px", borderRadius: 10,
            background: "var(--color-fg)", color: "var(--color-bg)",
            fontSize: 13, fontWeight: 600, textDecoration: "none",
            display: "flex", alignItems: "center", gap: 6,
          }}>Get a demo <Icon name="arrow" size={12}/></Link>
        </>
      )}
    </div>
  </div>
);

// ─── Hero ────────────────────────────────────────────────────────────────────

const Hero = () => (
  <div style={{ padding: "72px 48px 48px" }}>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 480px", gap: 64, alignItems: "center", maxWidth: 1184, margin: "0 auto" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <Tag dot>New · AI wait-time predictions, live in Tashkent</Tag>
        <h1 style={{
          fontSize: 76, fontWeight: 500, letterSpacing: -3,
          margin: 0, lineHeight: 0.98, color: "var(--color-fg)",
        }}>
          The operating system<br/>
          for{" "}
          <span style={{
            background: "linear-gradient(90deg, var(--color-primary), var(--color-accent))",
            WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
          }}>real-world queues.</span>
        </h1>
        <p style={{
          fontSize: 18, lineHeight: 1.45, color: "var(--color-fg-2)",
          margin: 0, maxWidth: 520, letterSpacing: -0.2,
        }}>
          Customers join from anywhere — phone, Telegram, web, kiosk —
          and zeyvo predicts when to call them. Staff get the live picture.
          Managers get the data. Lines disappear.
        </p>
        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <Link href="/sign-in" style={{
            padding: "14px 24px", borderRadius: 12,
            background: "var(--color-primary)", color: "#fff",
            fontSize: 15, fontWeight: 600, textDecoration: "none",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            Start free trial <Icon name="arrow" size={14}/>
          </Link>
          <a href="https://t.me/zeyvo_bot" target="_blank" rel="noopener noreferrer" style={{
            padding: "14px 24px", borderRadius: 12,
            background: "transparent", color: "var(--color-fg)",
            fontSize: 15, fontWeight: 600, textDecoration: "none",
            border: "1px solid var(--color-border)",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.088 13.81l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.834.836z"/></svg>
            Open in Telegram
          </a>
        </div>
        <div style={{ display: "flex", gap: 28, marginTop: 28, paddingTop: 24, borderTop: "1px solid var(--color-hairline)" }}>
          {[
            { v: "Web + TG", l: "channels supported" },
            { v: "< 200ms", l: "p95 API latency" },
            { v: "UZ-first", l: "Telegram-native" },
          ].map((s) => (
            <div key={s.l}>
              <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.6, fontVariantNumeric: "tabular-nums" }}>{s.v}</div>
              <div style={{ fontSize: 11, color: "var(--color-fg-3)", marginTop: 2, fontFamily: "var(--font-mono)" }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Phone mockup + floating widgets */}
      <div style={{ position: "relative", height: 540, display: "grid", placeItems: "center" }}>
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(circle at 50% 40%, var(--color-primary-soft), transparent 65%)",
          opacity: 0.7, filter: "blur(20px)",
        }}/>

        {/* Phone frame */}
        <div style={{
          position: "relative", width: 260, height: 520,
          background: "var(--color-surface)", border: "1px solid var(--color-border)",
          borderRadius: 36, padding: 8, boxShadow: "0 32px 80px rgba(0,0,0,0.12)",
        }}>
          <div style={{
            width: "100%", height: "100%", borderRadius: 28,
            background: "var(--color-surface-2)",
            padding: 18, display: "flex", flexDirection: "column", gap: 14, overflow: "hidden",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 10, color: "var(--color-fg-3)", fontFamily: "var(--font-mono)" }}>
              <span>9:41</span><span>●●●●</span>
            </div>
            <div style={{
              background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))",
              borderRadius: 14, padding: 14, color: "#fff",
            }}>
              <div style={{ fontSize: 9, opacity: 0.7, fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>your ticket</div>
              <div style={{ fontSize: 56, fontWeight: 500, letterSpacing: -2, lineHeight: 1, marginTop: 6, fontVariantNumeric: "tabular-nums" }}>A-128</div>
              <div style={{ fontSize: 10, opacity: 0.85, marginTop: 6 }}>3 ahead · ETA 12:48</div>
              <div style={{ marginTop: 12, height: 4, background: "rgba(255,255,255,0.2)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ width: "62%", height: "100%", background: "#fff" }}/>
              </div>
            </div>
            {["A-124 · now serving", "A-125 · next", "A-126", "A-127", "A-128 · you"].map((t, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 8, fontSize: 11,
                color: i === 0 || i === 4 ? "var(--color-fg)" : "var(--color-fg-3)",
                fontWeight: i === 4 ? 600 : 400,
              }}>
                <span style={{
                  width: 5, height: 5, borderRadius: "50%", flex: "none",
                  background: i === 0 ? "var(--color-success)" : i === 4 ? "var(--color-primary)" : "var(--color-border-2)",
                }}/>
                <span style={{ fontFamily: "var(--font-mono)" }}>{t}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Floating live widget */}
        <div style={{
          position: "absolute", right: -10, top: 60,
          background: "var(--color-surface)", border: "1px solid var(--color-border)",
          borderRadius: 12, padding: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
          width: 200, display: "flex", flexDirection: "column", gap: 8,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <LiveDot/>
            <span style={{ fontSize: 11, fontWeight: 500, color: "var(--color-fg-2)" }}>Live customer flow</span>
          </div>
          <Sparkline data={[8, 12, 9, 14, 18, 22, 28, 34, 30, 28, 32]} w={176} h={36}/>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--color-fg-3)", fontFamily: "var(--font-mono)" }}>
            <span>10:00</span><span>14:00</span><span>18:00</span>
          </div>
        </div>

        {/* Floating notification */}
        <div style={{
          position: "absolute", left: -20, bottom: 80,
          background: "var(--color-surface)", border: "1px solid var(--color-border)",
          borderRadius: 12, padding: "10px 12px", boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
          width: 230, display: "flex", alignItems: "flex-start", gap: 10,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: "var(--color-warning-soft)", color: "var(--color-warning)",
            display: "grid", placeItems: "center", flex: "none",
          }}><Icon name="bell" size={14}/></div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11.5, fontWeight: 500 }}>Your turn in 5 minutes</div>
            <div style={{ fontSize: 10.5, color: "var(--color-fg-3)", marginTop: 1 }}>Head to Asaka Bank · Window 3</div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// ─── Features ────────────────────────────────────────────────────────────────

const Features = () => (
  <div style={{ padding: "88px 48px", borderTop: "1px solid var(--color-hairline)" }}>
    <div style={{ maxWidth: 1184, margin: "0 auto" }}>
      <SectionLabel>Built for live operations</SectionLabel>
      <h2 style={{ fontSize: 48, fontWeight: 500, letterSpacing: -1.5, margin: "14px 0 16px", lineHeight: 1.05 }}>
        Everything you need to run a queue, in one product.
      </h2>
      <p style={{ fontSize: 16, color: "var(--color-fg-2)", maxWidth: 540, lineHeight: 1.5, marginBottom: 48, letterSpacing: -0.2 }}>
        Remote join, smart predictions, branch dashboards, kiosks and signage — designed as one system.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {[
          { i: "phone", t: "Remote queue", d: "Take a number from home. We ping when you should leave." },
          { i: "activity", t: "Live monitoring", d: "Real-time view of every branch, window and ticket." },
          { i: "sparkles", t: "AI predictions", d: "ETA models trained on the last 90 days of your traffic." },
          { i: "chart", t: "Customer analytics", d: "Peak hours, abandonment, satisfaction — by branch and service." },
          { i: "users", t: "Staff performance", d: "Handling time, queue efficiency, fair workload." },
          { i: "flow", t: "Physical + remote", d: "Walk-ins, kiosks and remote tickets share one queue." },
        ].map((f) => (
          <div key={f.t} style={{
            background: "var(--color-surface)", border: "1px solid var(--color-border)",
            borderRadius: 16, padding: 28, display: "flex", flexDirection: "column", gap: 14,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: "var(--color-primary-soft)", color: "var(--color-primary)",
              display: "grid", placeItems: "center",
            }}><Icon name={f.i} size={20}/></div>
            <div style={{ fontSize: 19, fontWeight: 600, letterSpacing: -0.4 }}>{f.t}</div>
            <div style={{ fontSize: 14, color: "var(--color-fg-2)", lineHeight: 1.5 }}>{f.d}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ─── Stat card ───────────────────────────────────────────────────────────────

const Stat = ({ label, value, delta, deltaTone, sub, sparkline, valueSize = 28 }: {
  label: string; value: string; delta?: string; deltaTone?: "success"|"warning"|"danger";
  sub?: string; sparkline?: React.ReactNode; valueSize?: number;
}) => (
  <div style={{
    background: "var(--color-surface)", border: "1px solid var(--color-border)",
    borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 4,
  }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ fontSize: 11, color: "var(--color-fg-3)", fontFamily: "var(--font-mono)" }}>{label}</div>
      {sparkline}
    </div>
    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
      <div style={{ fontSize: valueSize, fontWeight: 600, letterSpacing: -0.8, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {delta && (
        <div style={{
          fontSize: 11.5, fontWeight: 500,
          color: deltaTone === "success" ? "var(--color-success)" : deltaTone === "danger" ? "var(--color-danger)" : "var(--color-warning)",
        }}>{delta}</div>
      )}
    </div>
    {sub && <div style={{ fontSize: 11.5, color: "var(--color-fg-3)" }}>{sub}</div>}
  </div>
);

// ─── Live demo ────────────────────────────────────────────────────────────────

const LiveDemo = () => (
  <div style={{ padding: "88px 48px", borderTop: "1px solid var(--color-hairline)" }}>
    <div style={{ maxWidth: 1184, margin: "0 auto" }}>
      <SectionLabel>Live demo</SectionLabel>
      <h2 style={{ fontSize: 48, fontWeight: 500, letterSpacing: -1.5, margin: "14px 0 16px", lineHeight: 1.05 }}>A real customer flow, mid-day.</h2>
      <p style={{ fontSize: 16, color: "var(--color-fg-2)", maxWidth: 540, lineHeight: 1.5, marginBottom: 48, letterSpacing: -0.2 }}>
        This is what your operations team sees in the admin dashboard.
      </p>
      <div style={{
        background: "var(--color-surface)", border: "1px solid var(--color-border)",
        borderRadius: 18, padding: 24, display: "grid", gridTemplateColumns: "1fr 320px", gap: 24,
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <LiveDot/>
              <span style={{ fontSize: 13, fontWeight: 500 }}>Asaka Bank — Mirzo Ulugbek branch</span>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {["1d", "7d", "30d", "90d"].map((p, i) => (
                <span key={p} style={{
                  padding: "4px 10px", borderRadius: 6, fontSize: 11,
                  background: i === 1 ? "var(--color-fg)" : "transparent",
                  color: i === 1 ? "var(--color-bg)" : "var(--color-fg-3)",
                  fontFamily: "var(--font-mono)", fontWeight: 500,
                }}>{p}</span>
              ))}
            </div>
          </div>
          <div style={{ position: "relative", height: 240 }}>
            <svg viewBox="0 0 600 240" style={{ width: "100%", height: "100%" }}>
              <defs>
                <linearGradient id="demoGrad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.25"/>
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0"/>
                </linearGradient>
              </defs>
              {[40, 80, 120, 160, 200].map((y) => (
                <line key={y} x1="0" x2="600" y1={y} y2={y} stroke="var(--color-hairline)"/>
              ))}
              <path d="M0 200 C 60 180, 100 160, 140 150 S 220 130, 260 110 S 360 70, 420 60 S 520 100, 600 80 L 600 240 L 0 240 Z" fill="url(#demoGrad)"/>
              <path d="M0 200 C 60 180, 100 160, 140 150 S 220 130, 260 110 S 360 70, 420 60 S 520 100, 600 80" fill="none" stroke="var(--color-primary)" strokeWidth="2"/>
              <path d="M600 80 C 640 65, 680 75, 720 90" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeDasharray="4 4"/>
              <circle cx="420" cy="60" r="4" fill="var(--color-primary)" stroke="var(--color-surface)" strokeWidth="2"/>
              <text x="430" y="48" fontFamily="var(--font-mono)" fontSize="11" fill="var(--color-fg-2)">peak · 13:40</text>
            </svg>
            <div style={{ position: "absolute", top: 20, left: 0, fontSize: 11, color: "var(--color-fg-3)", fontFamily: "var(--font-mono)" }}>
              arrivals/min
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--color-fg-3)", fontFamily: "var(--font-mono)", marginTop: 8 }}>
            {["9:00", "11:00", "13:00", "15:00", "17:00"].map((t) => <span key={t}>{t}</span>)}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Stat label="In queue now" value="14" delta="+3" deltaTone="warning"
            sparkline={<Sparkline data={[8, 9, 10, 12, 14]} w={60} h={20}/>}/>
          <Stat label="Avg wait" value="6:42" delta="−58s" deltaTone="success"
            sparkline={<Sparkline data={[8, 9, 8, 7, 7, 7, 6]} w={60} h={20} color="var(--color-accent)"/>}/>
          <Stat label="Abandoned (today)" value="1.8%" delta="+0.3" deltaTone="danger" valueSize={22}/>
          <div style={{
            background: "var(--color-primary-soft)", borderRadius: 12, padding: 12,
            display: "flex", gap: 10, alignItems: "flex-start",
          }}>
            <Icon name="sparkles" size={16} style={{ color: "var(--color-primary)", flex: "none", marginTop: 1 }}/>
            <div style={{ fontSize: 11.5, color: "var(--color-primary)", lineHeight: 1.4 }}>
              Staffing tip: 7-day average shows +18% arrivals at 13:40 — consider opening Window 7 before then.
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// ─── How it works ─────────────────────────────────────────────────────────────

const HowItWorks = () => (
  <div style={{ padding: "88px 48px", borderTop: "1px solid var(--color-hairline)" }}>
    <div style={{ maxWidth: 1184, margin: "0 auto" }}>
      <SectionLabel>How it works</SectionLabel>
      <h2 style={{ fontSize: 48, fontWeight: 500, letterSpacing: -1.5, margin: "14px 0 48px", lineHeight: 1.05 }}>
        From your couch to the counter.
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        {[
          { n: "01", t: "Pick a branch", d: "Open the web app or Telegram bot. See live load by branch." },
          { n: "02", t: "Take a ticket", d: "Choose a service. You get an estimated arrival window." },
          { n: "03", t: "Get the ping", d: "When the queue is 5 min from you, we send a push or TG alert." },
          { n: "04", t: "Walk in & scan", d: "Show QR at the kiosk. Your spot is held; nobody jumps it." },
        ].map((s, i) => (
          <div key={i} style={{
            background: "var(--color-surface)", border: "1px solid var(--color-border)",
            borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", gap: 16,
            position: "relative",
          }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-fg-3)", letterSpacing: 0.4 }}>{s.n}</div>
            <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: -0.3 }}>{s.t}</div>
            <div style={{ fontSize: 13, color: "var(--color-fg-2)", lineHeight: 1.5 }}>{s.d}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ─── Analytics ───────────────────────────────────────────────────────────────

// Pre-computed at module level so SSR and client produce identical strings.
// Math.sin floating-point results are formatted consistently via Math.round.
const HEATMAP_GRID: string[][] = Array.from({ length: 7 }, (_, d) =>
  Array.from({ length: 12 }, (_, h) => {
    const v = Math.max(0, Math.min(1,
      0.15 + Math.sin((h - 2) * 0.55) * 0.4 + Math.sin(d * 0.7) * 0.15 +
      ((d === 0 || d === 4) && h > 4 ? 0.35 : 0)
    ));
    const L = Math.round((0.97 - v * 0.55) * 1e4) / 1e4;
    const C = Math.round(v * 0.18 * 1e4) / 1e4;
    return `oklch(${L} ${C} 262)`;
  })
);

const AnalyticsShowcase = () => (
  <div style={{ padding: "88px 48px", borderTop: "1px solid var(--color-hairline)" }}>
    <div style={{ maxWidth: 1184, margin: "0 auto" }}>
      <SectionLabel>Analytics</SectionLabel>
      <h2 style={{ fontSize: 48, fontWeight: 500, letterSpacing: -1.5, margin: "14px 0 16px", lineHeight: 1.05 }}>Read your operations like a chart.</h2>
      <p style={{ fontSize: 16, color: "var(--color-fg-2)", maxWidth: 540, lineHeight: 1.5, marginBottom: 48, letterSpacing: -0.2 }}>
        Heatmaps for staffing decisions. Cohort views for retention. Predictions for tomorrow.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16 }}>
        {/* Heatmap */}
        <div style={{
          background: "var(--color-surface)", border: "1px solid var(--color-border)",
          borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", gap: 16,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <SectionLabel>Weekly heatmap</SectionLabel>
              <div style={{ fontSize: 18, fontWeight: 600, marginTop: 6, letterSpacing: -0.3 }}>Customer arrivals by hour</div>
            </div>
            <Tag dot>Live</Tag>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <div style={{ width: 30, paddingTop: 18, display: "flex", flexDirection: "column", gap: 4, fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--color-fg-3)" }}>
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div key={d} style={{ height: 22, display: "flex", alignItems: "center" }}>{d}</div>
              ))}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 4, fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--color-fg-3)", marginBottom: 4 }}>
                {Array.from({ length: 12 }).map((_, h) => (
                  <div key={h} style={{ flex: 1, textAlign: "center" }}>{(9 + h).toString().padStart(2, "0")}</div>
                ))}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {HEATMAP_GRID.map((row, d) => (
                  <div key={d} style={{ display: "flex", gap: 4 }}>
                    {row.map((bg, h) => (
                      <div key={h} style={{ flex: 1, height: 22, borderRadius: 3, background: bg }}/>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Stats sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[
            { label: "Peak hours", value: "13–15", sub: "Tue–Fri" },
            { label: "Avg wait", value: "6:42", sub: "−58s vs last week", pos: true },
            { label: "Abandonment", value: "3.1%", sub: "−0.6 vs last week", pos: true },
          ].map((s) => (
            <div key={s.label} style={{
              background: "var(--color-surface)", border: "1px solid var(--color-border)",
              borderRadius: 12, padding: "14px 16px",
            }}>
              <div style={{ fontSize: 11, color: "var(--color-fg-3)", fontFamily: "var(--font-mono)" }}>{s.label}</div>
              <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: -0.8, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>{s.value}</div>
              {s.sub && <div style={{ fontSize: 11.5, color: s.pos ? "var(--color-success)" : "var(--color-fg-3)", marginTop: 2 }}>{s.sub}</div>}
            </div>
          ))}
          <div style={{
            background: "var(--color-primary-soft)", borderRadius: 12, padding: 14,
            display: "flex", gap: 10, alignItems: "flex-start",
          }}>
            <Icon name="sparkles" size={16} style={{ color: "var(--color-primary)", flex: "none", marginTop: 1 }}/>
            <div style={{ fontSize: 11.5, color: "var(--color-primary)", lineHeight: 1.4 }}>
              Staffing tip: 7-day average shows +18% arrivals at 13:40 — consider opening Window 7 before then.
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// ─── Early access ─────────────────────────────────────────────────────────────

const Testimonials = () => (
  <div style={{ padding: "88px 48px", borderTop: "1px solid var(--color-hairline)" }}>
    <div style={{ maxWidth: 1184, margin: "0 auto" }}>
      <SectionLabel>Early access</SectionLabel>
      <h2 style={{ fontSize: 48, fontWeight: 500, letterSpacing: -1.5, margin: "14px 0 16px", lineHeight: 1.05 }}>
        Built for Uzbekistan, ready for your branch.
      </h2>
      <p style={{ fontSize: 16, color: "var(--color-fg-2)", maxWidth: 580, lineHeight: 1.5, marginBottom: 48, letterSpacing: -0.2 }}>
        zeyvo is in closed early access. We&apos;re onboarding the first branches now — banks, clinics, and public services in Tashkent.
        If you run a location with a queue, reach out.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {[
          { icon: "building-2", title: "Banks & financial services", body: "Multi-window, multi-branch management. Works alongside existing Innomax kiosks — no rip-and-replace." },
          { icon: "stethoscope", title: "Clinics & polyclinics", body: "Walk-in and appointment queues in one system. Patients get a Telegram notification when it&apos;s their turn." },
          { icon: "landmark", title: "Government & public services", body: "High-volume counters, audit log, exportable reports. Compliant with UZ personal data regulations." },
        ].map((c) => (
          <div key={c.title} style={{
            background: "var(--color-surface)", border: "1px solid var(--color-border)",
            borderRadius: 16, padding: 28, display: "flex", flexDirection: "column", gap: 16,
          }}>
            <Icon name={c.icon} size={24} style={{ color: "var(--color-primary)" }}/>
            <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: -0.3 }}>{c.title}</div>
            <div style={{ fontSize: 13.5, color: "var(--color-fg-2)", lineHeight: 1.5 }}>{c.body}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ─── Integrations ─────────────────────────────────────────────────────────────

const Integrations = () => (
  <div style={{ padding: "88px 48px", borderTop: "1px solid var(--color-hairline)" }}>
    <div style={{ maxWidth: 1184, margin: "0 auto" }}>
      <SectionLabel>Integrations</SectionLabel>
      <h2 style={{ fontSize: 48, fontWeight: 500, letterSpacing: -1.5, margin: "14px 0 16px", lineHeight: 1.05 }}>
        Plays well with the queue you already have.
      </h2>
      <p style={{ fontSize: 16, color: "var(--color-fg-2)", maxWidth: 560, lineHeight: 1.5, marginBottom: 48, letterSpacing: -0.2 }}>
        Drop zeyvo in next to Innomax kiosks, your existing CRM or any SMS gateway. Migrate room by room.
      </p>
      <div style={{
        background: "var(--color-surface)", border: "1px solid var(--color-border)",
        borderRadius: 18, padding: 32,
        display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12,
      }}>
        {["Telegram", "Innomax", "Q-matic", "Twilio", "Eskiz SMS", "1C ERP", "Bitrix24", "Power BI", "Slack", "Google Sheets", "OAuth / SSO", "Webhooks"].map((n) => (
          <div key={n} style={{
            height: 60, borderRadius: 10, background: "var(--color-surface-2)",
            border: "1px solid var(--color-border)",
            display: "grid", placeItems: "center",
            fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--color-fg-2)",
          }}>{n}</div>
        ))}
      </div>
    </div>
  </div>
);

// ─── Enterprise ──────────────────────────────────────────────────────────────

const Enterprise = () => (
  <div style={{ padding: "88px 48px", borderTop: "1px solid var(--color-hairline)" }}>
    <div style={{ maxWidth: 1184, margin: "0 auto" }}>
      <div style={{
        background: "var(--color-fg)", color: "var(--color-bg)",
        borderRadius: 20, padding: 48,
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, alignItems: "center",
      }}>
        <div>
          <div style={{ fontSize: 36, fontWeight: 500, letterSpacing: -1.2, lineHeight: 1.1 }}>
            Enterprise-ready · single-tenant deployments
          </div>
          <p style={{ fontSize: 15, opacity: 0.7, lineHeight: 1.5, marginTop: 18, maxWidth: 420 }}>
            Self-host on your infrastructure or run in the zeyvo cloud. Data residency in UZ, KZ, EU and US.
          </p>
          <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
            <button style={{
              padding: "12px 22px", borderRadius: 10,
              background: "var(--color-bg)", color: "var(--color-fg)",
              fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
            }}>Talk to sales <Icon name="arrow" size={13}/></button>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { i: "shield", t: "Audit log", d: "Every action, exportable" },
            { i: "lock", t: "End-to-end", d: "TLS 1.3 + AES-256" },
            { i: "server", t: "Self-hosted", d: "On-prem ready" },
            { i: "globe", t: "Multi-region", d: "UZ · KZ · EU · US" },
            { i: "eye", t: "Full audit log", d: "Every action, exportable" },
            { i: "users", t: "RBAC", d: "Fine-grained roles" },
          ].map((c) => (
            <div key={c.t} style={{
              padding: 16, borderRadius: 12,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}>
              <Icon name={c.i} size={18} style={{ color: "var(--color-accent)" }}/>
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 10 }}>{c.t}</div>
              <div style={{ fontSize: 11.5, opacity: 0.6, marginTop: 2 }}>{c.d}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// ─── FAQ ─────────────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  { q: "Does zeyvo replace our physical kiosks?", a: "No. zeyvo runs on existing kiosks (Innomax, Q-matic, custom) and adds remote, mobile and analytics surfaces around them. You can also use our touchscreen builds." },
  { q: "What happens when remote and walk-in customers collide?", a: "You set the policy per service: priority remote, priority walk-in, FIFO or hybrid bands. Operators can override per ticket." },
  { q: "Which languages are supported?", a: "English, Russian and Uzbek out of the box — Latin and Cyrillic for Uzbek." },
  { q: "How accurate are the wait-time predictions?", a: "Median absolute error is under 90 seconds after two weeks of training data per branch." },
];

const Faq = () => {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div style={{ padding: "88px 48px", borderTop: "1px solid var(--color-hairline)" }}>
      <div style={{ maxWidth: 1184, margin: "0 auto" }}>
        <SectionLabel>FAQ</SectionLabel>
        <h2 style={{ fontSize: 48, fontWeight: 500, letterSpacing: -1.5, margin: "14px 0 48px", lineHeight: 1.05 }}>
          Questions, mostly answered.
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {FAQ_ITEMS.map((row, i) => (
            <div key={i} style={{
              background: "var(--color-surface)", border: "1px solid var(--color-border)",
              borderRadius: 12, padding: "18px 22px", cursor: "pointer",
            }} onClick={() => setOpen(open === i ? null : i)}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 16, fontWeight: 500, letterSpacing: -0.2 }}>{row.q}</div>
                <Icon name={open === i ? "minus" : "plus"} size={18} style={{ color: "var(--color-fg-3)", flex: "none" }}/>
              </div>
              {open === i && (
                <div style={{ fontSize: 14, color: "var(--color-fg-2)", lineHeight: 1.55, marginTop: 12, maxWidth: 800 }}>{row.a}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── CTA ─────────────────────────────────────────────────────────────────────

const CtaSection = () => (
  <div style={{ padding: "96px 48px", borderTop: "1px solid var(--color-hairline)" }}>
    <div style={{ maxWidth: 1184, margin: "0 auto" }}>
      <div style={{
        borderRadius: 20, padding: 56,
        background: "radial-gradient(circle at 20% 0%, var(--color-primary-soft) 0%, transparent 50%), radial-gradient(circle at 80% 100%, var(--color-accent-soft, var(--color-primary-soft)) 0%, transparent 50%), var(--color-surface)",
        border: "1px solid var(--color-border)",
        textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 20,
      }}>
        <h2 style={{ fontSize: 56, fontWeight: 500, letterSpacing: -2, margin: 0, lineHeight: 1.02, maxWidth: 720 }}>
          Let people live their day. Not your queue.
        </h2>
        <p style={{ fontSize: 17, color: "var(--color-fg-2)", maxWidth: 540, lineHeight: 1.5, margin: 0, letterSpacing: -0.1 }}>
          14-day trial. No card. Migrate one branch first — see the difference, then roll out.
        </p>
        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <Link href="/sign-in" style={{
            padding: "14px 28px", borderRadius: 12,
            background: "var(--color-fg)", color: "var(--color-bg)",
            fontSize: 15, fontWeight: 600, textDecoration: "none",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            Start free trial <Icon name="arrow" size={14}/>
          </Link>
          <button style={{
            padding: "14px 28px", borderRadius: 12,
            background: "transparent", color: "var(--color-fg)",
            fontSize: 15, fontWeight: 600, border: "1px solid var(--color-border)",
            cursor: "pointer",
          }}>Book a demo</button>
        </div>
      </div>
    </div>
  </div>
);

// ─── Footer ──────────────────────────────────────────────────────────────────

const Footer = () => (
  <div style={{
    padding: "48px 48px 36px",
    borderTop: "1px solid var(--color-hairline)",
    background: "var(--color-surface)",
  }}>
    <div style={{ maxWidth: 1184, margin: "0 auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 24 }}>
        <div>
          <Wordmark/>
          <p style={{ fontSize: 12.5, color: "var(--color-fg-3)", maxWidth: 280, lineHeight: 1.5, marginTop: 14 }}>
            A modern operating system for real-world queues and customer flow. Built in Tashkent · used everywhere.
          </p>
        </div>
        {[
          { t: "Product", l: ["Remote queue", "Live monitor", "Analytics", "Kiosks", "Signage"] },
          { t: "For", l: ["Banks", "Clinics", "Government", "Retail", "Telecom"] },
          { t: "Company", l: ["About", "Customers", "Careers", "Blog", "Press"] },
          { t: "Help", l: ["Docs", "API", "Status", "Security", "Contact"] },
        ].map((col) => (
          <div key={col.t}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-fg-3)", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 12 }}>{col.t}</div>
            {col.l.map((l) => (
              <div key={l} style={{ fontSize: 13, color: "var(--color-fg-2)", padding: "4px 0", cursor: "pointer" }}>{l}</div>
            ))}
          </div>
        ))}
      </div>
      <div style={{
        marginTop: 36, paddingTop: 20, borderTop: "1px solid var(--color-hairline)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        fontSize: 12, color: "var(--color-fg-3)", fontFamily: "var(--font-mono)",
      }}>
        <span>© 2026 zeyvo labs · tashkent</span>
        <span>v0.1.0 · all systems operational</span>
      </div>
    </div>
  </div>
);

// ─── Page ────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { userId, _hydrated } = useAuthStore();
  const authed = _hydrated && userId !== null;

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)" }}>
      <TopNav authed={authed}/>
      <Hero/>
      <Features/>
      <LiveDemo/>
      <HowItWorks/>
      <AnalyticsShowcase/>
      <Testimonials/>
      <Integrations/>
      <Enterprise/>
      <Faq/>
      <CtaSection/>
      <Footer/>
    </div>
  );
}
