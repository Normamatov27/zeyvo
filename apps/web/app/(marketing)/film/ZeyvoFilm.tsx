"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  memo,
} from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  AnimatePresence,
} from "framer-motion";

// ─── Timeline (seconds) ───────────────────────────────────────────────────────
const DUR = 52;
const BLUE = "#2D9CDB";

// Clamp t into [s,e] and return 0→1 progress
function p(t: number, s: number, e: number) {
  return Math.max(0, Math.min(1, (t - s) / (e - s)));
}
// Ease-out expo
function eoo(x: number) {
  return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
}
// Fade: linear in over [inS,inE], optional linear out over [outS,outE]
function fade(t: number, inS: number, inE: number, outS?: number, outE?: number) {
  const i = Math.max(0, Math.min(1, (t - inS) / Math.max(0.001, inE - inS)));
  const o =
    outS !== undefined && outE !== undefined
      ? 1 - Math.max(0, Math.min(1, (t - outS) / Math.max(0.001, outE - outS)))
      : 1;
  return Math.min(i, o);
}

// ─── Web Audio Engine ─────────────────────────────────────────────────────────
function createAudioEngine(ctx: AudioContext) {
  const master = ctx.createGain();
  master.gain.value = 0.6;
  master.connect(ctx.destination);

  function sine(freq: number, gainVal: number, startT: number, endT: number) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.frequency.value = freq;
    osc.type = "sine";
    g.gain.setValueAtTime(0, startT);
    g.gain.linearRampToValueAtTime(gainVal, startT + 0.3);
    g.gain.setValueAtTime(gainVal, endT - 0.3);
    g.gain.linearRampToValueAtTime(0, endT);
    osc.connect(g);
    g.connect(master);
    osc.start(startT);
    osc.stop(endT);
  }

  function noise(gainVal: number, startT: number, endT: number, lpFreq = 400) {
    const bufLen = ctx.sampleRate * (endT - startT);
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = lpFreq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, startT);
    g.gain.linearRampToValueAtTime(gainVal, startT + 0.5);
    g.gain.setValueAtTime(gainVal, endT - 0.5);
    g.gain.linearRampToValueAtTime(0, endT);
    src.connect(lp);
    lp.connect(g);
    g.connect(master);
    src.start(startT);
    src.stop(endT);
  }

  function click(startT: number) {
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++)
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.012));
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = 0.5;
    src.connect(g);
    g.connect(master);
    src.start(startT);
  }

  const now = ctx.currentTime;
  // Scene 1: sub-bass drone + noise
  sine(40, 0.18, now, now + 10);
  noise(0.04, now, now + 9.5, 300);
  // Scene 2: 432 Hz tone
  sine(432, 0.08, now + 11, now + 13.5);
  // Scene 3: click on logo lock
  click(now + 16.5);
  // Scene 4-6: ambient pad
  sine(55, 0.12, now + 19, now + 44);
  sine(110, 0.06, now + 22, now + 44);
  sine(220, 0.04, now + 28, now + 44);
  // Scene 7: click + high tone
  click(now + 49);
  sine(3000, 0.04, now + 51.5, now + 53);

  return master;
}

// ─── Logomark SVG ─────────────────────────────────────────────────────────────
const LogoMark = memo(function LogoMark({
  size = 48,
  glow = true,
}: {
  size?: number;
  glow?: boolean;
}) {
  return (
    <svg width={size} height={size} viewBox="-16 -16 32 32" fill="none">
      {glow && (
        <defs>
          <filter id="lglow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      )}
      <g filter={glow ? "url(#lglow)" : undefined}>
        {/* Top stroke */}
        <line x1="-10" y1="-8" x2="10" y2="-8" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
        {/* Diagonal */}
        <line x1="10" y1="-8" x2="-10" y2="8" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
        {/* Bottom stroke */}
        <line x1="-10" y1="8" x2="10" y2="8" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
        {/* Blue accent dot — bottom-right node */}
        <circle cx="10" cy="8" r="2.2" fill={BLUE} />
      </g>
    </svg>
  );
});

// ─── Grain overlay ────────────────────────────────────────────────────────────
const Grain = memo(function Grain() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-50 opacity-[0.04] mix-blend-overlay"
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        backgroundSize: "180px",
      }}
    />
  );
});

// ─── Vignette ─────────────────────────────────────────────────────────────────
const Vignette = memo(function Vignette() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-40"
      style={{
        background:
          "radial-gradient(ellipse 80% 80% at 50% 50%, transparent 40%, rgba(0,0,0,0.55) 100%)",
      }}
    />
  );
});

// ─── Scene 1 ──────────────────────────────────────────────────────────────────
function Scene1({ t }: { t: number }) {
  const vis = fade(t, 0, 0.4, 9.5, 10);

  // Shot timing
  const s1 = fade(t, 0, 0.3, 2.7, 3.2);
  const s2 = fade(t, 3, 3.3, 5.7, 6.2);
  const s3 = fade(t, 6, 6.3, 8.7, 9.2);
  const txt = fade(t, 9, 9.3, 9.8, 10.1);

  // Spinner rotation
  const rot = (t * 180) % 360; // freeze after t=7
  const frozenRot = t < 7 ? rot : 7 * 180 % 360;

  return (
    <div
      className="absolute inset-0"
      style={{ opacity: vis, background: "#030303" }}
    >
      {/* Shot 1.1 — Service counter */}
      <div className="absolute inset-0 flex items-center justify-center" style={{ opacity: s1 }}>
        <div style={{ filter: "blur(0px)" }}>
          <div
            className="relative"
            style={{
              fontFamily: "'Geist Mono', monospace",
              fontSize: "clamp(120px, 25vw, 240px)",
              fontWeight: 400,
              color: "rgba(255,255,255,0.9)",
              letterSpacing: "-0.04em",
              lineHeight: 1,
              textShadow: "0 0 60px rgba(255,255,255,0.08)",
            }}
          >
            247
          </div>
          <div
            className="mt-4 text-center"
            style={{
              fontFamily: "'Geist', sans-serif",
              fontSize: "13px",
              fontWeight: 300,
              color: "rgba(255,255,255,0.28)",
              letterSpacing: "0.25em",
              textTransform: "uppercase",
            }}
          >
            Now serving
          </div>
        </div>
        {/* Blurred crowd silhouette */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 50% 75%, rgba(255,255,255,0.03) 0%, transparent 70%)",
            filter: "blur(8px)",
          }}
        />
      </div>

      {/* Shot 1.2 — Paper ticket */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-6"
        style={{ opacity: s2 }}
      >
        <div
          style={{
            fontFamily: "'Geist Mono', monospace",
            fontSize: "clamp(48px, 10vw, 96px)",
            fontWeight: 400,
            color: "rgba(255,255,255,0.75)",
            letterSpacing: "0.1em",
            filter: "blur(0.2px)",
          }}
        >
          N–312
        </div>
        <div
          style={{
            fontFamily: "'Geist', sans-serif",
            fontSize: "13px",
            fontWeight: 300,
            color: "rgba(255,255,255,0.22)",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
          }}
        >
          Your ticket
        </div>
        <div
          style={{
            marginTop: "8px",
            fontFamily: "'Geist Mono', monospace",
            fontSize: "clamp(14px, 3vw, 18px)",
            fontWeight: 300,
            color: "rgba(255,255,255,0.18)",
            letterSpacing: "0.12em",
          }}
        >
          14:23 — still waiting
        </div>
      </div>

      {/* Shot 1.3 — Spinner fills frame */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ opacity: s3 }}
      >
        <div
          style={{
            width: "clamp(80px, 18vw, 160px)",
            height: "clamp(80px, 18vw, 160px)",
            border: "1.5px solid rgba(255,255,255,0.08)",
            borderTopColor: "rgba(255,255,255,0.55)",
            borderRadius: "50%",
            transform: `rotate(${frozenRot}deg)`,
          }}
        />
      </div>

      {/* Text "People waste years waiting." */}
      <div
        className="absolute inset-0 flex items-center justify-center px-8"
        style={{ opacity: txt }}
      >
        <p
          style={{
            fontFamily: "'Geist', sans-serif",
            fontSize: "clamp(20px, 3.5vw, 48px)",
            fontWeight: 300,
            color: "rgba(255,255,255,0.92)",
            letterSpacing: "0.05em",
            textAlign: "center",
          }}
        >
          People waste years waiting.
        </p>
      </div>
    </div>
  );
}

// ─── Scene 2 ──────────────────────────────────────────────────────────────────
function Scene2({ t }: { t: number }) {
  const vis = fade(t, 10, 10.1, 13.9, 14.1);
  // Blue line: draws right from t=11 to t=11.75, retracts t=13 to t=13.75
  const lineProgress = p(t, 11, 11.75);
  const lineRetract = p(t, 13, 13.75);
  const lineWidth = Math.max(0, lineProgress - lineRetract);

  // Words: "There should be a smarter way."
  const words = ["There", "should", "be", "a", "smarter", "way."];
  const wordFades = words.map((_, i) =>
    fade(t, 11.75 + i * 0.12, 11.75 + i * 0.12 + 0.4, 13.5, 14)
  );

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-8"
      style={{ opacity: vis, background: "#000" }}
    >
      {/* Blue hairline */}
      <div
        className="relative"
        style={{ width: "clamp(200px, 40vw, 480px)", height: "1px" }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            height: "1px",
            width: `${lineWidth * 100}%`,
            background: BLUE,
            boxShadow: `0 0 8px ${BLUE}80`,
            transition: "none",
          }}
        />
      </div>

      {/* Text */}
      <p
        style={{
          fontFamily: "'Geist', sans-serif",
          fontSize: "clamp(16px, 2.8vw, 36px)",
          fontWeight: 200,
          letterSpacing: "0.04em",
          color: "rgba(255,255,255,0.88)",
          display: "flex",
          gap: "0.35em",
          flexWrap: "wrap",
          justifyContent: "center",
          textAlign: "center",
          padding: "0 1rem",
        }}
      >
        {words.map((w, i) => (
          <span
            key={i}
            style={{
              opacity: wordFades[i],
              filter: `blur(${(1 - wordFades[i]) * 4}px)`,
            }}
          >
            {w}
          </span>
        ))}
      </p>
    </div>
  );
}

// ─── Scene 3 ──────────────────────────────────────────────────────────────────
function Scene3({ t }: { t: number }) {
  const vis = fade(t, 14, 14.1, 18.8, 19.1);

  // Glow pulse then resolve to mark: 14→14.5 expand, 14.5→16.5 collapse to mark
  const glowScale = (() => {
    if (t < 14) return 0;
    if (t < 14.5) return eoo(p(t, 14, 14.5)) * 5;
    return 5 - eoo(p(t, 14.5, 16.5)) * 4.8; // settle at ~0.2
  })();
  const glowOpacity = (() => {
    if (t < 14) return 0;
    if (t < 14.5) return eoo(p(t, 14, 14.5));
    return Math.max(0, 1 - eoo(p(t, 14.5, 16.5)) * 0.85);
  })();

  const markOpacity = fade(t, 15.8, 16.5, 18.5, 19);
  const wordmarkOpacity = fade(t, 16.6, 17.3, 18.5, 19);
  const subTagOpacity = fade(t, 17.3, 18, 18.5, 19);

  // Letter stagger for ZEYVO
  const letters = "ZEYVO".split("");
  const letterFades = letters.map((_, i) =>
    fade(t, 16.6 + i * 0.055, 16.6 + i * 0.055 + 0.35)
  );
  const letterY = letters.map((_, i) =>
    (1 - Math.min(1, Math.max(0, (t - 16.6 - i * 0.055) / 0.35))) * 6
  );

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-6"
      style={{ opacity: vis, background: "#000" }}
    >
      {/* Radial glow */}
      <div
        className="absolute"
        style={{
          width: "300px",
          height: "300px",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${BLUE}28 0%, transparent 70%)`,
          transform: `scale(${glowScale})`,
          opacity: glowOpacity,
          pointerEvents: "none",
        }}
      />

      {/* Logomark */}
      <div style={{ opacity: markOpacity }}>
        <LogoMark size={52} glow />
      </div>

      {/* ZEYVO wordmark */}
      <div
        style={{
          display: "flex",
          gap: "0.18em",
          opacity: wordmarkOpacity,
        }}
      >
        {letters.map((l, i) => (
          <span
            key={i}
            style={{
              fontFamily: "'Geist', sans-serif",
              fontSize: "clamp(40px, 7vw, 88px)",
              fontWeight: 500,
              color: "#fff",
              letterSpacing: "0.18em",
              opacity: letterFades[i],
              transform: `translateY(${letterY[i]}px)`,
              display: "inline-block",
            }}
          >
            {l}
          </span>
        ))}
      </div>

      {/* Sub tagline */}
      <p
        style={{
          fontFamily: "'Geist', sans-serif",
          fontSize: "clamp(11px, 1.5vw, 16px)",
          fontWeight: 300,
          color: "rgba(255,255,255,0.42)",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          opacity: subTagOpacity,
          textAlign: "center",
          padding: "0 1rem",
        }}
      >
        AI-Powered Customer Flow Intelligence
      </p>

      {/* Ambient radial atmosphere */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 50% 40% at 50% 50%, ${BLUE}08 0%, transparent 70%)`,
          opacity: markOpacity,
        }}
      />
    </div>
  );
}

// ─── Scene 4: Product ─────────────────────────────────────────────────────────
function Scene4({ t }: { t: number }) {
  const vis = fade(t, 19, 19.3, 35.7, 36.1);

  // Sub-scene opacities
  const phone = fade(t, 19, 19.5, 21.5, 22.2);     // 19-22
  const panel = fade(t, 22, 22.5, 24.5, 25.2);     // 22-25
  const notif = fade(t, 25, 25.5, 27.5, 28.2);     // 25-28
  const dash  = fade(t, 28, 28.5, 31.5, 32.2);     // 28-32
  const tg    = fade(t, 32, 32.5, 35.5, 36.1);     // 32-36

  // Queue position countdown
  const qPos = Math.max(1, Math.round(12 - p(t, 22, 25) * 10));
  const eta  = Math.max(2, Math.round(14 - p(t, 22, 25) * 10));

  // Dashboard metrics
  const served  = Math.round(1200 + p(t, 28, 32) * 47);
  const eff     = Math.round(91 + p(t, 28, 32) * 3);
  const waitAvg = (8.3 - p(t, 28, 32) * 1.2).toFixed(1);

  // Phone button state
  const btnState = t < 20 ? "join" : t < 20.4 ? "check" : "pos";

  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{ opacity: vis, background: "#000" }}
    >
      {/* Sub-scene: Phone — remote queue join */}
      <div className="absolute inset-0 flex items-center justify-center" style={{ opacity: phone }}>
        <div
          style={{
            width: "clamp(200px, 30vw, 320px)",
            background: "rgba(10,10,14,0.95)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "20px",
            padding: "clamp(20px, 3vw, 32px)",
            boxShadow: `0 0 60px rgba(45,156,219,0.12), inset 0 1px 0 rgba(255,255,255,0.06)`,
            backdropFilter: "blur(20px)",
          }}
        >
          <div style={{ fontFamily: "'Geist', sans-serif", fontSize: "11px", fontWeight: 300, color: "rgba(255,255,255,0.35)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "16px" }}>
            Hamza Medical Center
          </div>
          <div style={{ fontFamily: "'Geist', sans-serif", fontSize: "clamp(14px, 2.5vw, 18px)", fontWeight: 500, color: "#fff", marginBottom: "8px" }}>
            Cardiology · Floor 3
          </div>
          <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: "13px", fontWeight: 300, color: "rgba(255,255,255,0.38)", marginBottom: "28px" }}>
            Current wait ≈ 18 min
          </div>

          {/* Button */}
          <div
            style={{
              background: btnState === "pos" ? "rgba(45,156,219,0.15)" : btnState === "check" ? BLUE : "transparent",
              border: `1px solid ${btnState === "join" ? "rgba(255,255,255,0.15)" : BLUE}`,
              borderRadius: "10px",
              padding: "12px 20px",
              textAlign: "center",
              transition: "all 0.3s ease",
            }}
          >
            {btnState === "join" && (
              <span style={{ fontFamily: "'Geist', sans-serif", fontSize: "14px", fontWeight: 500, color: "rgba(255,255,255,0.8)" }}>Join Queue</span>
            )}
            {btnState === "check" && (
              <span style={{ fontFamily: "'Geist', sans-serif", fontSize: "14px", fontWeight: 500, color: "#fff" }}>✓ Joined</span>
            )}
            {btnState === "pos" && (
              <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: "14px", fontWeight: 400, color: BLUE }}>Position: #12</span>
            )}
          </div>

          {/* Progress bar */}
          <div style={{ marginTop: "16px", height: "2px", background: "rgba(255,255,255,0.06)", borderRadius: "2px", overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${btnState === "pos" ? 15 : 0}%`,
                background: BLUE,
                boxShadow: `0 0 8px ${BLUE}`,
                transition: "width 0.8s ease",
                borderRadius: "2px",
              }}
            />
          </div>
        </div>
      </div>

      {/* Sub-scene: Live queue tracking glass panel */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ opacity: panel }}
      >
        <div
          style={{
            width: "clamp(260px, 40vw, 400px)",
            background: "rgba(255,255,255,0.04)",
            border: `1px solid rgba(45,156,219,0.22)`,
            borderRadius: "16px",
            padding: "clamp(20px, 3vw, 36px)",
            backdropFilter: "blur(40px)",
            boxShadow: `0 0 80px rgba(45,156,219,0.08), inset 0 1px 0 rgba(255,255,255,0.08)`,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
            <div>
              <div style={{ fontFamily: "'Geist', sans-serif", fontSize: "11px", fontWeight: 300, color: "rgba(255,255,255,0.35)", letterSpacing: "0.2em", textTransform: "uppercase" }}>
                Live Position
              </div>
              <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: "clamp(32px, 6vw, 56px)", fontWeight: 400, color: "#fff", lineHeight: 1.1, marginTop: "4px" }}>
                #{qPos}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "'Geist', sans-serif", fontSize: "11px", fontWeight: 300, color: "rgba(255,255,255,0.35)", letterSpacing: "0.2em", textTransform: "uppercase" }}>
                Est. wait
              </div>
              <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: "clamp(20px, 4vw, 32px)", fontWeight: 400, color: BLUE, lineHeight: 1.1, marginTop: "4px" }}>
                {eta} min
              </div>
            </div>
          </div>

          {/* Queue dots */}
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {Array.from({ length: 12 }, (_, i) => (
              <div
                key={i}
                style={{
                  width: i < qPos - 1 ? "24px" : "8px",
                  height: "4px",
                  borderRadius: "4px",
                  background: i === qPos - 1 ? BLUE : i < qPos - 1 ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)",
                  boxShadow: i === qPos - 1 ? `0 0 8px ${BLUE}` : "none",
                  flexShrink: 0,
                  transition: "all 0.4s ease",
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Sub-scene: Leave-now notification */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ opacity: notif }}
      >
        <div
          style={{
            maxWidth: "clamp(280px, 45vw, 440px)",
            width: "90%",
            background: "rgba(8,10,16,0.95)",
            border: `1px solid rgba(45,156,219,0.3)`,
            borderRadius: "16px",
            padding: "clamp(16px, 2.5vw, 28px)",
            backdropFilter: "blur(30px)",
            boxShadow: `0 0 60px rgba(45,156,219,0.14), inset 0 1px 0 rgba(255,255,255,0.06)`,
            animation: "float 3s ease-in-out infinite",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
            <LogoMark size={28} glow={false} />
            <span style={{ fontFamily: "'Geist', sans-serif", fontSize: "clamp(14px, 2vw, 18px)", fontWeight: 600, color: "#fff" }}>
              Leave now.
            </span>
          </div>
          <p style={{ fontFamily: "'Geist', sans-serif", fontSize: "13px", fontWeight: 300, color: "rgba(255,255,255,0.58)", lineHeight: 1.6, marginBottom: "16px" }}>
            Your appointment is ready in 4 minutes.
            Walk time: 3 min. You're on time.
          </p>
          <div style={{ display: "flex", gap: "10px" }}>
            <div style={{ flex: 1, background: BLUE, borderRadius: "8px", padding: "9px 0", textAlign: "center" }}>
              <span style={{ fontFamily: "'Geist', sans-serif", fontSize: "12px", fontWeight: 500, color: "#fff" }}>View Status</span>
            </div>
            <div style={{ flex: 1, border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "9px 0", textAlign: "center" }}>
              <span style={{ fontFamily: "'Geist', sans-serif", fontSize: "12px", fontWeight: 300, color: "rgba(255,255,255,0.45)" }}>Dismiss</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-scene: Operational dashboard */}
      <div
        className="absolute inset-0 flex items-center justify-center px-6"
        style={{ opacity: dash }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "860px",
            display: "grid",
            gridTemplateColumns: "1fr 2fr 1fr",
            gap: "12px",
            height: "clamp(280px, 45vh, 420px)",
          }}
        >
          {/* Branch list */}
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", padding: "16px", overflow: "hidden" }}>
            <div style={{ fontFamily: "'Geist', sans-serif", fontSize: "10px", fontWeight: 300, color: "rgba(255,255,255,0.28)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "14px" }}>
              Branches
            </div>
            {["City Center", "Mirzo", "Yunusabad", "Chilonzor", "Sergeli"].map((b, i) => (
              <div key={b} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <span style={{ fontFamily: "'Geist', sans-serif", fontSize: "12px", fontWeight: 300, color: "rgba(255,255,255,0.6)" }}>{b}</span>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>{[14, 8, 21, 6, 11][i]}</span>
                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: ["#4ADE80", "#4ADE80", BLUE, "#4ADE80", "#4ADE80"][i], boxShadow: `0 0 4px ${["#4ADE80", "#4ADE80", BLUE, "#4ADE80", "#4ADE80"][i]}` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Flow map */}
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", padding: "16px", position: "relative", overflow: "hidden" }}>
            <div style={{ fontFamily: "'Geist', sans-serif", fontSize: "10px", fontWeight: 300, color: "rgba(255,255,255,0.28)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "12px" }}>
              Live Flow
            </div>
            <FlowMap t={t} />
          </div>

          {/* Metrics */}
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "18px" }}>
            {[
              { label: "Avg wait", value: `${waitAvg} min` },
              { label: "Served today", value: served.toString() },
              { label: "Efficiency", value: `${eff}%` },
              { label: "Peak forecast", value: "14:00–14:45" },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontFamily: "'Geist', sans-serif", fontSize: "10px", fontWeight: 300, color: "rgba(255,255,255,0.28)", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: "3px" }}>
                  {label}
                </div>
                <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: "clamp(12px, 1.8vw, 18px)", fontWeight: 400, color: "#fff" }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sub-scene: Telegram */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ opacity: tg }}
      >
        <div
          style={{
            maxWidth: "clamp(260px, 40vw, 380px)",
            width: "90%",
            background: "rgba(6,8,14,0.96)",
            border: "1px solid rgba(255,255,255,0.09)",
            borderRadius: "16px",
            padding: "clamp(16px, 2.5vw, 28px)",
            boxShadow: "0 0 60px rgba(0,0,0,0.6)",
          }}
        >
          <div style={{ fontFamily: "'Geist', sans-serif", fontSize: "11px", fontWeight: 400, color: "rgba(255,255,255,0.35)", marginBottom: "14px", letterSpacing: "0.04em" }}>
            @ZeyvoBot
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: "14px" }}>
            <p style={{ fontFamily: "'Geist', sans-serif", fontSize: "13px", fontWeight: 400, color: "rgba(255,255,255,0.78)", lineHeight: 1.65, marginBottom: "14px" }}>
              Your queue at Hamza Clinic is now{" "}
              <span style={{ fontFamily: "'Geist Mono', monospace", color: "#fff", fontWeight: 500 }}>#3</span>.<br />
              Expected in:{" "}
              <span style={{ color: BLUE, fontWeight: 400 }}>6 minutes</span>.
            </p>
            <div style={{ display: "flex", gap: "8px" }}>
              <div style={{ flex: 1, border: `1px solid ${BLUE}`, borderRadius: "8px", padding: "8px 0", textAlign: "center" }}>
                <span style={{ fontFamily: "'Geist', sans-serif", fontSize: "12px", fontWeight: 400, color: BLUE }}>View Status</span>
              </div>
              <div style={{ flex: 1, border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "8px 0", textAlign: "center" }}>
                <span style={{ fontFamily: "'Geist', sans-serif", fontSize: "12px", fontWeight: 300, color: "rgba(255,255,255,0.35)" }}>Cancel</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Flow Map (canvas) ────────────────────────────────────────────────────────
function FlowMap({ t }: { t: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const nodes = [
      { x: 0.15, y: 0.3, size: 4 },
      { x: 0.35, y: 0.5, size: 6 },
      { x: 0.55, y: 0.25, size: 5 },
      { x: 0.75, y: 0.6, size: 7 },
      { x: 0.5, y: 0.72, size: 4 },
      { x: 0.85, y: 0.35, size: 3 },
    ];
    const edges = [
      [0, 1, 1.2], [1, 2, 0.7], [1, 4, 0.9],
      [2, 3, 1.4], [2, 5, 0.6], [3, 4, 1.1],
    ];

    edges.forEach(([a, b, w]) => {
      const n1 = nodes[a];
      const n2 = nodes[b];
      const alpha = 0.15 + (w as number) * 0.18;
      ctx.strokeStyle = `rgba(45,156,219,${alpha})`;
      ctx.lineWidth = (w as number) * 1.2;
      ctx.beginPath();
      ctx.moveTo(n1.x * W, n1.y * H);
      // Animated dash offset
      ctx.lineTo(n2.x * W, n2.y * H);
      ctx.stroke();
    });

    nodes.forEach((n) => {
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.shadowColor = BLUE;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(n.x * W, n.y * H, n.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });
  }, [t]);

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={180}
      style={{ width: "100%", height: "calc(100% - 30px)", opacity: 0.8 }}
    />
  );
}

// ─── Scene 5: AI Intelligence ─────────────────────────────────────────────────
function Scene5({ t }: { t: number }) {
  const vis = fade(t, 36, 36.3, 43.7, 44.1);
  const heat = fade(t, 36, 36.3, 38.7, 39.2);
  const rec  = fade(t, 39, 39.4, 40.7, 41.2);
  const net  = fade(t, 41, 41.3, 43.7, 44.1);

  const gridProgress = p(t, 36.3, 38); // 0→1 as grid draws in

  // Grid: 7 cols (days) x 12 rows (hours)
  const COLS = 7;
  const ROWS = 12;
  const loads = [
    [0.1,0.2,0.1,0.3,0.2,0.1,0.1],
    [0.2,0.3,0.2,0.4,0.3,0.2,0.2],
    [0.5,0.7,0.6,0.8,0.7,0.5,0.4],
    [0.9,0.8,0.9,1.0,0.9,0.8,0.7],
    [0.7,0.6,0.7,0.8,0.7,0.6,0.5],
    [0.4,0.5,0.4,0.6,0.5,0.4,0.3],
    [0.3,0.4,0.3,0.5,0.4,0.3,0.2],
    [0.6,0.7,0.6,0.9,0.8,0.6,0.5],
    [0.8,0.9,0.8,1.0,0.9,0.8,0.7],
    [0.5,0.6,0.5,0.7,0.6,0.5,0.4],
    [0.2,0.3,0.2,0.3,0.2,0.2,0.1],
    [0.1,0.1,0.1,0.2,0.1,0.1,0.1],
  ];
  const days = ["M","T","W","T","F","S","S"];
  const hours = ["08","09","10","11","12","13","14","15","16","17","18","19"];

  // Network reconfiguration progress
  const netP = p(t, 41.3, 43.5);

  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{ opacity: vis, background: "#000" }}
    >
      {/* Heat map */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-4"
        style={{ opacity: heat }}
      >
        <div style={{ fontFamily: "'Geist', sans-serif", fontSize: "10px", fontWeight: 300, color: "rgba(255,255,255,0.28)", letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: "8px" }}>
          Predictive Load Forecasting
        </div>
        <div style={{ display: "flex", gap: "3px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "3px", marginRight: "6px" }}>
            <div style={{ height: "22px" }} />
            {hours.map(h => (
              <div key={h} style={{ height: "16px", display: "flex", alignItems: "center", fontFamily: "'Geist Mono', monospace", fontSize: "9px", color: "rgba(255,255,255,0.22)", width: "22px", justifyContent: "flex-end", paddingRight: "4px" }}>{h}</div>
            ))}
          </div>
          <div>
            <div style={{ display: "flex", gap: "3px", marginBottom: "3px" }}>
              {days.map(d => (
                <div key={d} style={{ width: "clamp(22px,4vw,32px)", textAlign: "center", fontFamily: "'Geist Mono', monospace", fontSize: "9px", color: "rgba(255,255,255,0.22)" }}>{d}</div>
              ))}
            </div>
            {loads.map((row, ri) => {
              const cellIndex = ri * COLS;
              return (
                <div key={ri} style={{ display: "flex", gap: "3px", marginBottom: "3px" }}>
                  {row.map((load, ci) => {
                    const idx = ri * COLS + ci;
                    const totalCells = ROWS * COLS;
                    const revealAt = idx / totalCells;
                    const cellVis = Math.max(0, Math.min(1, (gridProgress - revealAt) / (1 / totalCells) * 4));
                    return (
                      <div
                        key={ci}
                        style={{
                          width: "clamp(22px,4vw,32px)",
                          height: "16px",
                          borderRadius: "3px",
                          background: `rgba(45,156,219,${load * cellVis * 0.9})`,
                          boxShadow: load > 0.8 ? `0 0 6px rgba(45,156,219,${load * 0.4})` : "none",
                          transition: "opacity 0.15s ease",
                        }}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recommendation card */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ opacity: rec }}
      >
        <div
          style={{
            maxWidth: "clamp(280px, 42vw, 420px)",
            width: "90%",
            background: "rgba(6,9,18,0.97)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "16px",
            padding: "clamp(20px, 3vw, 32px)",
            boxShadow: "0 0 80px rgba(0,0,0,0.7)",
          }}
        >
          <div style={{ fontFamily: "'Geist', sans-serif", fontSize: "11px", fontWeight: 300, color: "rgba(255,255,255,0.3)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "16px" }}>
            Recommendation
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: "16px" }}>
            <p style={{ fontFamily: "'Geist', sans-serif", fontSize: "14px", fontWeight: 400, color: "rgba(255,255,255,0.8)", lineHeight: 1.65, marginBottom: "16px" }}>
              Add 2 service operators at{" "}
              <span style={{ color: "#fff", fontWeight: 500 }}>Branch 04 – City Center</span>{" "}
              between 13:30–15:00 today.
            </p>
            <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
              <div>
                <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: "18px", fontWeight: 400, color: BLUE }}>↓ 34%</div>
                <div style={{ fontFamily: "'Geist', sans-serif", fontSize: "11px", fontWeight: 300, color: "rgba(255,255,255,0.3)", marginTop: "2px" }}>avg wait time</div>
              </div>
              <div>
                <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: "18px", fontWeight: 400, color: BLUE }}>↑ 22%</div>
                <div style={{ fontFamily: "'Geist', sans-serif", fontSize: "11px", fontWeight: 300, color: "rgba(255,255,255,0.3)", marginTop: "2px" }}>throughput</div>
              </div>
            </div>
            <div style={{ background: `rgba(45,156,219,0.12)`, border: `1px solid ${BLUE}40`, borderRadius: "8px", padding: "10px 16px", textAlign: "center" }}>
              <span style={{ fontFamily: "'Geist', sans-serif", fontSize: "13px", fontWeight: 500, color: BLUE }}>Apply Recommendation</span>
            </div>
          </div>
        </div>
      </div>

      {/* Network flow */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-4"
        style={{ opacity: net }}
      >
        <div style={{ fontFamily: "'Geist', sans-serif", fontSize: "10px", fontWeight: 300, color: "rgba(255,255,255,0.28)", letterSpacing: "0.22em", textTransform: "uppercase" }}>
          Operational Intelligence
        </div>
        <NetworkCanvas t={t} netP={netP} />
      </div>
    </div>
  );
}

// ─── Network Canvas ───────────────────────────────────────────────────────────
function NetworkCanvas({ t, netP }: { t: number; netP: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    const nodes = [
      { x: 0.2, y: 0.35 }, { x: 0.45, y: 0.2 }, { x: 0.72, y: 0.32 },
      { x: 0.3, y: 0.65 }, { x: 0.6,  y: 0.72 }, { x: 0.85, y: 0.55 },
      { x: 0.5, y: 0.5  },
    ];
    const edges = [
      [0,1],[0,3],[1,2],[1,6],[2,5],[3,4],[3,6],[4,5],[4,6],[2,6],
    ];

    // Optimize positions over netP
    function getPos(ni: number) {
      const base = nodes[ni];
      const target = [
        { x: 0.18, y: 0.3 }, { x: 0.5, y: 0.18 }, { x: 0.78, y: 0.28 },
        { x: 0.22, y: 0.72 }, { x: 0.62, y: 0.75 }, { x: 0.85, y: 0.5 },
        { x: 0.5, y: 0.5 },
      ][ni];
      return {
        x: (base.x + (target.x - base.x) * netP) * W,
        y: (base.y + (target.y - base.y) * netP) * H,
      };
    }

    ctx.clearRect(0, 0, W, H);

    edges.forEach(([a, b]) => {
      const p1 = getPos(a);
      const p2 = getPos(b);
      const load = 0.4 + Math.sin(a + b) * 0.3;
      ctx.strokeStyle = `rgba(45,156,219,${load * (1 - netP * 0.4)})`;
      ctx.lineWidth = load * 2;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    });

    nodes.forEach((_, i) => {
      const pos = getPos(i);
      const radius = 5 + (i === 6 ? 4 : 0);
      ctx.fillStyle = i === 6 ? "#fff" : "rgba(255,255,255,0.75)";
      ctx.shadowColor = BLUE;
      ctx.shadowBlur = i === 6 ? 12 : 6;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });
  }, [netP, t]);

  return (
    <canvas
      ref={canvasRef}
      width={500}
      height={280}
      style={{ width: "clamp(300px, 55vw, 550px)", height: "auto", opacity: 0.9 }}
    />
  );
}

// ─── Scene 6: Enterprise ──────────────────────────────────────────────────────
function Scene6({ t }: { t: number }) {
  const vis = fade(t, 44, 44.2, 47.7, 48.1);
  const a = fade(t, 44, 44.3, 45.0, 45.3);
  const b = fade(t, 45.2, 45.5, 46.2, 46.5);
  const c = fade(t, 46.4, 46.7, 47.5, 48.0);

  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{ opacity: vis, background: "#000" }}
    >
      {/* Cut A — clinic floor map */}
      <div className="absolute inset-0 flex items-center justify-center" style={{ opacity: a }}>
        <div style={{ position: "relative", width: "clamp(280px, 50vw, 560px)", height: "clamp(180px, 32vh, 320px)" }}>
          <svg width="100%" height="100%" viewBox="0 0 560 320" style={{ opacity: 0.85 }}>
            {/* Service windows */}
            {[80, 200, 320, 440].map((x) => (
              <g key={x}>
                <rect x={x} y={40} width={60} height={40} rx={4} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={1} />
                <circle cx={x + 30} cy={60} r={5} fill={BLUE} style={{ filter: `drop-shadow(0 0 4px ${BLUE})` }} />
              </g>
            ))}
            {/* Queue lines */}
            {[80, 200, 320, 440].map((x, i) => (
              <g key={`q${x}`}>
                {Array.from({ length: [3, 5, 2, 4][i] }, (_, j) => (
                  <circle key={j} cx={x + 30} cy={120 + j * 28} r={6} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={1} />
                ))}
              </g>
            ))}
            {/* Flow arrows */}
            {[80, 200, 320, 440].map((x) => (
              <line key={`a${x}`} x1={x + 30} y1={82} x2={x + 30} y2={110} stroke={`${BLUE}60`} strokeWidth={1} strokeDasharray="3 3" />
            ))}
          </svg>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, textAlign: "center", fontFamily: "'Geist', sans-serif", fontSize: "10px", fontWeight: 300, color: "rgba(255,255,255,0.22)", letterSpacing: "0.22em", textTransform: "uppercase" }}>
            Real-time service floor
          </div>
        </div>
      </div>

      {/* Cut B — multi-branch sync */}
      <div className="absolute inset-0 flex items-center justify-center px-6" style={{ opacity: b }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px", maxWidth: "500px", width: "100%" }}>
          {["City Center", "Mirzo", "Yunusabad", "Chilonzor"].map((name, i) => (
            <div
              key={name}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: i === 2 ? `1px solid ${BLUE}50` : "1px solid rgba(255,255,255,0.07)",
                borderRadius: "10px",
                padding: "14px",
              }}
            >
              <div style={{ fontFamily: "'Geist', sans-serif", fontSize: "11px", fontWeight: 400, color: "rgba(255,255,255,0.55)", marginBottom: "6px" }}>{name}</div>
              <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: "20px", fontWeight: 400, color: i === 2 ? BLUE : "#fff" }}>{[14, 8, 21, 6][i]}</div>
              <div style={{ fontFamily: "'Geist', sans-serif", fontSize: "10px", fontWeight: 300, color: "rgba(255,255,255,0.22)", marginTop: "2px" }}>in queue</div>
            </div>
          ))}
        </div>
      </div>

      {/* Cut C — operator with dashboard */}
      <div className="absolute inset-0 flex items-center justify-center" style={{ opacity: c }}>
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: "clamp(220px, 38vw, 380px)",
              margin: "0 auto",
              background: "rgba(6,9,18,0.97)",
              border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: "14px",
              padding: "20px",
              boxShadow: `0 0 60px rgba(45,156,219,0.1)`,
            }}
          >
            <div style={{ height: "3px", background: `linear-gradient(90deg, transparent, ${BLUE}, transparent)`, borderRadius: "3px", marginBottom: "16px", opacity: 0.6 }} />
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "14px" }}>
              {["94%", "1,247", "8.1 min"].map((v, i) => (
                <div key={i} style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: "16px", fontWeight: 400, color: "#fff" }}>{v}</div>
                  <div style={{ fontFamily: "'Geist', sans-serif", fontSize: "9px", fontWeight: 300, color: "rgba(255,255,255,0.25)", marginTop: "2px", letterSpacing: "0.15em" }}>
                    {["efficiency", "served", "avg wait"][i]}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", marginBottom: "14px" }} />
            <div style={{ display: "flex", gap: "4px" }}>
              {Array.from({ length: 14 }, (_, i) => (
                <div key={i} style={{ flex: 1, height: "24px", borderRadius: "2px", background: `rgba(45,156,219,${0.1 + Math.random() * 0.6})` }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Scene 7: Ending ──────────────────────────────────────────────────────────
function Scene7({ t }: { t: number }) {
  const vis = fade(t, 48, 48.1, 51.8, 52.2);
  const mark = fade(t, 49, 49.5, 51.5, 52);
  const tag  = fade(t, 50.5, 51, 51.5, 52);
  const url  = fade(t, 51.5, 51.8, 52.2, 52.5);

  const letters = "ZEYVO".split("");
  const letterFades = letters.map((_, i) =>
    Math.max(0, Math.min(1, (t - 49 - i * 0.05) / 0.35))
  );

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-6"
      style={{ opacity: vis, background: "#000" }}
    >
      <div style={{ opacity: mark }}>
        <LogoMark size={44} glow />
      </div>

      <div style={{ display: "flex", gap: "0.16em", opacity: mark }}>
        {letters.map((l, i) => (
          <span
            key={i}
            style={{
              fontFamily: "'Geist', sans-serif",
              fontSize: "clamp(36px, 6vw, 72px)",
              fontWeight: 500,
              color: "#fff",
              letterSpacing: "0.16em",
              opacity: letterFades[i],
            }}
          >
            {l}
          </span>
        ))}
      </div>

      <p
        style={{
          fontFamily: "'Geist', sans-serif",
          fontSize: "clamp(14px, 2.2vw, 28px)",
          fontWeight: 300,
          color: "rgba(255,255,255,0.9)",
          letterSpacing: "0.06em",
          textAlign: "center",
          opacity: tag,
          padding: "0 1rem",
        }}
      >
        Building the future of waiting.
      </p>

      <a
        href="https://zeyvo.tech"
        style={{
          fontFamily: "'Geist', sans-serif",
          fontSize: "clamp(12px, 1.6vw, 18px)",
          fontWeight: 400,
          color: BLUE,
          letterSpacing: "0.12em",
          textDecoration: "none",
          opacity: url,
          textShadow: `0 0 20px ${BLUE}60`,
        }}
      >
        zeyvo.tech
      </a>
    </div>
  );
}

// ─── Main Film Component ──────────────────────────────────────────────────────
export default function ZeyvoFilm() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [filmTime, setFilmTime] = useState(0);
  const [ended, setEnded] = useState(false);
  const rafRef  = useRef<number>(0);
  const startRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const startFilm = useCallback(() => {
    setIsPlaying(true);
    setEnded(false);
    setFilmTime(0);

    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;
      createAudioEngine(ctx);
    }

    startRef.current = performance.now();

    const tick = () => {
      const elapsed = (performance.now() - startRef.current) / 1000;
      if (elapsed >= DUR) {
        setFilmTime(DUR);
        setEnded(true);
        return;
      }
      setFilmTime(elapsed);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const replay = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    setEnded(false);
    setIsPlaying(false);
    setFilmTime(0);
    setTimeout(startFilm, 100);
  }, [startFilm]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      audioCtxRef.current?.close();
    };
  }, []);

  const t = filmTime;

  return (
    <div
      className="relative w-screen h-screen overflow-hidden select-none"
      style={{ background: "#000", cursor: isPlaying ? "none" : "default" }}
    >
      {/* ── Film layers ── */}
      {isPlaying && (
        <>
          <Scene1 t={t} />
          <Scene2 t={t} />
          <Scene3 t={t} />
          <Scene4 t={t} />
          <Scene5 t={t} />
          <Scene6 t={t} />
          <Scene7 t={t} />
          <Vignette />
          <Grain />
        </>
      )}

      {/* ── Start screen ── */}
      <AnimatePresence>
        {!isPlaying && !ended && (
          <motion.div
            key="start"
            className="absolute inset-0 flex flex-col items-center justify-center gap-10"
            style={{ background: "#000" }}
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.6 } }}
          >
            <LogoMark size={56} glow />
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontFamily: "'Geist', sans-serif",
                  fontSize: "clamp(32px, 5vw, 64px)",
                  fontWeight: 500,
                  color: "#fff",
                  letterSpacing: "0.18em",
                  marginBottom: "10px",
                }}
              >
                ZEYVO
              </div>
              <div
                style={{
                  fontFamily: "'Geist', sans-serif",
                  fontSize: "clamp(13px, 1.8vw, 18px)",
                  fontWeight: 300,
                  color: "rgba(255,255,255,0.38)",
                  letterSpacing: "0.08em",
                }}
              >
                Building the future of waiting.
              </div>
            </div>
            <button
              onClick={startFilm}
              style={{
                fontFamily: "'Geist', sans-serif",
                fontSize: "13px",
                fontWeight: 400,
                color: BLUE,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                background: "transparent",
                border: `1px solid ${BLUE}50`,
                borderRadius: "8px",
                padding: "12px 32px",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.background = `${BLUE}15`;
                (e.target as HTMLButtonElement).style.borderColor = BLUE;
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.background = "transparent";
                (e.target as HTMLButtonElement).style.borderColor = `${BLUE}50`;
              }}
            >
              Watch Film
            </button>
            <div
              style={{
                fontFamily: "'Geist', sans-serif",
                fontSize: "11px",
                fontWeight: 300,
                color: "rgba(255,255,255,0.2)",
                letterSpacing: "0.12em",
              }}
            >
              52 seconds · sound on recommended
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── End screen ── */}
      <AnimatePresence>
        {ended && (
          <motion.div
            key="end"
            className="absolute inset-0 flex flex-col items-center justify-center gap-8"
            style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(20px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 1, delay: 0.5 } }}
          >
            <LogoMark size={40} glow />
            <div
              style={{
                fontFamily: "'Geist', sans-serif",
                fontSize: "clamp(13px, 2vw, 20px)",
                fontWeight: 300,
                color: "rgba(255,255,255,0.7)",
                letterSpacing: "0.06em",
                textAlign: "center",
                padding: "0 1rem",
              }}
            >
              Building the future of waiting.
            </div>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
              <a
                href="https://zeyvo.tech"
                style={{
                  fontFamily: "'Geist', sans-serif",
                  fontSize: "13px",
                  fontWeight: 400,
                  color: "#fff",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  textDecoration: "none",
                  background: BLUE,
                  borderRadius: "8px",
                  padding: "12px 28px",
                  display: "block",
                }}
              >
                zeyvo.tech
              </a>
              <button
                onClick={replay}
                style={{
                  fontFamily: "'Geist', sans-serif",
                  fontSize: "13px",
                  fontWeight: 400,
                  color: "rgba(255,255,255,0.55)",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: "8px",
                  padding: "12px 28px",
                  cursor: "pointer",
                }}
              >
                Replay
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Progress bar (thin, bottom) ── */}
      {isPlaying && !ended && (
        <div
          className="absolute bottom-0 left-0 right-0"
          style={{ height: "2px", background: "rgba(255,255,255,0.06)" }}
        >
          <div
            style={{
              height: "100%",
              width: `${(t / DUR) * 100}%`,
              background: BLUE,
              boxShadow: `0 0 6px ${BLUE}`,
              transition: "none",
            }}
          />
        </div>
      )}

      {/* Float keyframe for notification */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}
