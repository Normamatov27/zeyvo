"use client";

import { useEffect, useRef, useState, useCallback, memo } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

// ─── Constants ────────────────────────────────────────────────────────────────
const DUR = 90;
const BLUE = "#2D9CDB";

function p(t: number, s: number, e: number) {
  return Math.max(0, Math.min(1, (t - s) / (e - s)));
}
function eoo(x: number) {
  return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
}
function fade(t: number, inS: number, inE: number, outS?: number, outE?: number) {
  const i = Math.max(0, Math.min(1, (t - inS) / Math.max(0.001, inE - inS)));
  const o = outS !== undefined && outE !== undefined
    ? 1 - Math.max(0, Math.min(1, (t - outS) / Math.max(0.001, outE - outS)))
    : 1;
  return Math.min(i, o);
}

function usePortrait() {
  const [portrait, setPortrait] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(orientation: portrait)");
    setPortrait(mq.matches);
    const h = (e: MediaQueryListEvent) => setPortrait(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);
  return portrait;
}

// ─── Deterministic particle data (computed once, outside components) ──────────
const AMBIENT_PARTS = Array.from({ length: 80 }, (_, i) => ({
  x0: ((i * 61803) % 10000) / 10000,
  y0: ((i * 24142) % 10000) / 10000,
  vx: (((i * 31415) % 10000) / 10000 - 0.5) * 0.005,
  vy: (((i * 27182) % 10000) / 10000 - 0.5) * 0.005,
  size: 0.5 + ((i * 1732) % 10000) / 10000 * 1.0,
  opacity: 0.05 + ((i * 5773) % 10000) / 10000 * 0.14,
}));

const WARP_PARTS = Array.from({ length: 110 }, (_, i) => ({
  angle: (i / 110) * Math.PI * 2 + ((i * 1618) % 1000) / 1000 * 0.3,
  speed: 0.028 + ((i * 1414) % 1000) / 1000 * 0.022,
  phase: i / 110,
  bright: 0.35 + ((i * 2718) % 1000) / 1000 * 0.45,
}));

const UI_FRAGS = Array.from({ length: 24 }, (_, i) => ({
  xNorm: ((i * 4142) % 1000) / 1000,
  yNorm: 0.06 + (i / 24) * 0.88,
  widthNorm: 0.04 + ((i * 3141) % 1000) / 1000 * 0.11,
  alpha: 0.07 + ((i * 5773) % 1000) / 1000 * 0.13,
  drift: (((i * 2414) % 1000) / 1000 - 0.5) * 0.01,
  phase: i / 24,
}));

// ─── Audio Engine ─────────────────────────────────────────────────────────────
function createAudioEngine(ctx: AudioContext) {
  const master = ctx.createGain();
  master.gain.value = 0.55;
  master.connect(ctx.destination);

  const reverbGain = ctx.createGain();
  reverbGain.gain.value = 0.28;
  reverbGain.connect(master);
  const convolver = ctx.createConvolver();
  const irLen = Math.floor(ctx.sampleRate * 4.2);
  const ir = ctx.createBuffer(2, irLen, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < irLen; i++)
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / irLen, 2.5);
  }
  convolver.buffer = ir;
  convolver.connect(reverbGain);

  function subBass(freq: number, g: number, t1: number, t2: number) {
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = "sine"; osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, t1);
    gain.gain.linearRampToValueAtTime(g, t1 + 0.6);
    gain.gain.setValueAtTime(g, t2 - 0.8);
    gain.gain.linearRampToValueAtTime(0, t2);
    osc.connect(gain); gain.connect(master);
    osc.start(t1); osc.stop(t2 + 0.1);
  }
  function pad(freqs: number[], g: number, t1: number, t2: number) {
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = "sine"; osc.frequency.value = f * (1 + i * 0.003);
      gain.gain.setValueAtTime(0, t1);
      gain.gain.linearRampToValueAtTime(g / freqs.length, t1 + 1.2);
      gain.gain.setValueAtTime(g / freqs.length, t2 - 1.0);
      gain.gain.linearRampToValueAtTime(0, t2);
      osc.connect(gain); gain.connect(master); gain.connect(convolver);
      osc.start(t1); osc.stop(t2 + 0.1);
    });
  }
  function noiseBurst(g: number, t1: number, t2: number, lp: number) {
    const len = Math.min(ctx.sampleRate * Math.min(t2 - t1, 20), ctx.sampleRate * 20);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
    src.buffer = buf; filter.type = "lowpass"; filter.frequency.value = lp;
    gain.gain.setValueAtTime(0, t1);
    gain.gain.linearRampToValueAtTime(g, t1 + 0.4);
    gain.gain.setValueAtTime(g, t2 - 0.4);
    gain.gain.linearRampToValueAtTime(0, t2);
    src.connect(filter); filter.connect(gain); gain.connect(master);
    src.start(t1); src.stop(t2);
  }
  function tick(t: number) {
    const len = Math.floor(ctx.sampleRate * 0.06);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++)
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.008));
    const src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = buf; g.gain.value = 0.18;
    const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 800;
    src.connect(hp); hp.connect(g); g.connect(master);
    src.start(t);
  }
  function uiClick(t: number, g: number) {
    const len = Math.floor(ctx.sampleRate * 0.025);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++)
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.005));
    const src = ctx.createBufferSource(), gain = ctx.createGain();
    src.buffer = buf; gain.gain.value = g;
    src.connect(gain); gain.connect(master);
    src.start(t);
  }
  function deepClick(t: number, g: number) {
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.25);
    gain.gain.setValueAtTime(g, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.connect(gain); gain.connect(master); gain.connect(convolver);
    osc.start(t); osc.stop(t + 0.4);
  }
  function whoosh(t: number, dur: number) {
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), gain = ctx.createGain();
    src.buffer = buf; bp.type = "bandpass"; bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(80, t);
    bp.frequency.exponentialRampToValueAtTime(6000, t + dur);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.18, t + dur * 0.4);
    gain.gain.linearRampToValueAtTime(0, t + dur);
    src.connect(bp); bp.connect(gain); gain.connect(master); gain.connect(convolver);
    src.start(t); src.stop(t + dur);
  }
  function chime(freqs: number[], t: number, g: number) {
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = "sine"; osc.frequency.value = freq;
      const st = t + i * 0.07;
      gain.gain.setValueAtTime(0, st);
      gain.gain.linearRampToValueAtTime(g, st + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, st + 2.5);
      osc.connect(gain); gain.connect(master); gain.connect(convolver);
      osc.start(st); osc.stop(st + 3);
    });
  }
  function kick808(t: number, g: number) {
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.18);
    gain.gain.setValueAtTime(g, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.connect(gain); gain.connect(master);
    osc.start(t); osc.stop(t + 0.4);
  }
  function piano(freq: number, t: number, g: number) {
    [1, 2, 3, 4].forEach((h, i) => {
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = "sine"; osc.frequency.value = freq * h;
      const hg = g * Math.pow(0.55, i);
      gain.gain.setValueAtTime(hg, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 4.5 - i * 0.4);
      osc.connect(gain); gain.connect(master); gain.connect(convolver);
      osc.start(t); osc.stop(t + 5);
    });
  }

  const n = ctx.currentTime;
  const bpm = 60 / 70;

  // Scene 1 — Opening Darkness (0–6s)
  subBass(27, 0.08, n, n + 6);
  subBass(37, 0.06, n, n + 6);
  noiseBurst(0.012, n, n + 5.5, 160);

  // Scene 2 — The Problem (6–16s)
  subBass(37, 0.14, n + 6, n + 16);
  subBass(55, 0.07, n + 6, n + 16);
  noiseBurst(0.022, n + 6, n + 15.5, 250);
  [6.5, 8.5, 10.5, 12.5, 14.5].forEach(dt => tick(n + dt));

  // Scene 3 — Freeze (16–21s)
  chime([432], n + 17, 0.07);
  pad([293.7, 370.0], 0.04, n + 17.5, n + 21);

  // Scene 4 — Digital Transition (21–28s)
  whoosh(n + 21, 2.0);
  pad([293.7, 370.0, 440], 0.06, n + 22, n + 34);

  // Scene 5 — Logo Reveal (28–34s)
  deepClick(n + 30.5, 0.55);

  // Scene 6 — Remote Queue (34–46s)
  noiseBurst(0.012, n + 34, n + 46, 7000);
  for (let b = 0; b * bpm < 12; b++) kick808(n + 34 + b * bpm, 0.28);
  uiClick(n + 34.8, 0.32);
  chime([880, 1108], n + 35.3, 0.04);
  [37.3, 38.0, 38.8].forEach(dt => uiClick(n + dt, 0.12));
  chime([659, 784], n + 42, 0.04);

  // Scene 7 — Live Tracking (46–56s)
  for (let b = 0; b * bpm < 10; b++) kick808(n + 46 + b * bpm, 0.26);
  noiseBurst(0.010, n + 46, n + 56, 7000);
  [48.3, 49.0, 49.8].forEach(dt => uiClick(n + dt, 0.12));
  chime([784, 1047], n + 52.5, 0.05);
  noiseBurst(0.016, n + 53, n + 56, 600);

  // Scene 8 — AI ETA (56–66s)
  noiseBurst(0.014, n + 56, n + 66, 1400);
  chime([523, 659, 784], n + 61.8, 0.038);
  deepClick(n + 62.8, 0.22);

  // Scene 9 — Business Intelligence (66–78s)
  pad([220, 277.2, 329.6], 0.06, n + 66, n + 78);
  noiseBurst(0.012, n + 66, n + 78, 2400);
  chime([659, 880, 1047], n + 69, 0.03);
  deepClick(n + 73, 0.20);
  chime([523, 698.5, 1047], n + 77, 0.04);

  // Scene 10 — Ecosystem (78–84s)
  pad([146.8, 220, 293.7], 0.12, n + 78, n + 84);
  chime([293.7, 440, 587.3], n + 78, 0.07);
  kick808(n + 78, 0.40); kick808(n + 79, 0.30); kick808(n + 80, 0.22);
  noiseBurst(0.02, n + 80, n + 84, 400);

  // Scene 11 — Final Statement (84–90s)
  deepClick(n + 85, 0.42);
  piano(293.7, n + 85.4, 0.07);
  piano(440, n + 87.5, 0.05);

  return master;
}

// ─── Shared UI Components ─────────────────────────────────────────────────────
const LogoMark = memo(function LogoMark({ size = 48, glow = true }: { size?: number; glow?: boolean }) {
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      {glow && (
        <div style={{
          position: "absolute", inset: "-65%",
          background: `radial-gradient(circle, rgba(45,156,219,0.32) 0%, transparent 62%)`,
          pointerEvents: "none",
        }} />
      )}
      <img src="/logo.jpg" alt="Zeyvo" style={{
        width: "100%", height: "100%", objectFit: "contain",
        filter: glow
          ? "invert(1) drop-shadow(0 0 10px rgba(45,156,219,0.8)) brightness(1.1)"
          : "invert(1) brightness(1.1)",
        mixBlendMode: "screen", display: "block",
      }} />
    </div>
  );
});

const Grain = memo(function Grain() {
  return (
    <div className="pointer-events-none absolute inset-0 z-50 opacity-[0.04] mix-blend-overlay"
      style={{
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        backgroundSize: "180px",
      }} />
  );
});

const Vignette = memo(function Vignette() {
  return (
    <div className="pointer-events-none absolute inset-0 z-40"
      style={{ background: "radial-gradient(ellipse 80% 80% at 50% 50%, transparent 40%, rgba(0,0,0,0.6) 100%)" }} />
  );
});

// ─── Scene 1: Opening Darkness (0–6s) ────────────────────────────────────────
function Scene1Darkness({ t }: { t: number }) {
  const vis = fade(t, 0, 0, 5.5, 6);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    AMBIENT_PARTS.forEach(part => {
      const px = (((part.x0 + part.vx * t) % 1) + 1) % 1;
      const py = (((part.y0 + part.vy * t) % 1) + 1) % 1;
      ctx.fillStyle = `rgba(255,255,255,${part.opacity})`;
      ctx.beginPath();
      ctx.arc(px * W, py * H, part.size, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [t]);

  return (
    <div className="absolute inset-0" style={{ opacity: vis, background: "#020202" }}>
      <canvas ref={canvasRef} width={1280} height={720}
        style={{ width: "100%", height: "100%", opacity: 0.6 }} />
    </div>
  );
}

// ─── Scene 2: The Problem (6–16s) ────────────────────────────────────────────
function Scene2Problem({ t }: { t: number }) {
  const vis = fade(t, 6, 6.3, 15.6, 16.1);
  const s1 = fade(t, 6, 6.4, 8.7, 9.2);
  const s2 = fade(t, 9.3, 9.6, 11.7, 12.2);
  const s3 = fade(t, 12.3, 12.6, 14.5, 15.0);
  const txt = fade(t, 14.5, 14.9, 15.6, 16.1);
  const frozenRot = (12.3 * 180) % 360;

  return (
    <div className="absolute inset-0" style={{ opacity: vis, background: "#040404" }}>
      {/* Shot 1 — service counter */}
      <div className="absolute inset-0 flex items-center justify-center" style={{ opacity: s1 }}>
        <div>
          <div style={{
            fontFamily: "'Geist Mono', monospace",
            fontSize: "clamp(100px, 22vw, 220px)",
            fontWeight: 400, color: "rgba(255,255,255,0.88)",
            letterSpacing: "-0.04em", lineHeight: 1,
            textShadow: "0 0 80px rgba(255,255,255,0.06)",
          }}>247</div>
          <div className="mt-3 text-center" style={{
            fontFamily: "'Geist', sans-serif", fontSize: "13px", fontWeight: 300,
            color: "rgba(255,255,255,0.25)", letterSpacing: "0.28em", textTransform: "uppercase",
          }}>Now serving</div>
        </div>
      </div>

      {/* Shot 2 — ticket */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-5" style={{ opacity: s2 }}>
        <div style={{
          fontFamily: "'Geist Mono', monospace",
          fontSize: "clamp(44px, 9vw, 88px)",
          fontWeight: 400, color: "rgba(255,255,255,0.72)", letterSpacing: "0.1em",
        }}>N–312</div>
        <div style={{
          fontFamily: "'Geist', sans-serif", fontSize: "12px", fontWeight: 300,
          color: "rgba(255,255,255,0.2)", letterSpacing: "0.32em", textTransform: "uppercase",
        }}>Your ticket</div>
        <div style={{
          fontFamily: "'Geist Mono', monospace", fontSize: "clamp(13px, 2.5vw, 17px)",
          fontWeight: 300, color: "rgba(255,255,255,0.16)", letterSpacing: "0.12em",
        }}>14:23 — still waiting</div>
      </div>

      {/* Shot 3 — frozen spinner */}
      <div className="absolute inset-0 flex items-center justify-center" style={{ opacity: s3 }}>
        <div style={{
          width: "clamp(70px, 16vw, 140px)", height: "clamp(70px, 16vw, 140px)",
          border: "1.5px solid rgba(255,255,255,0.07)",
          borderTopColor: "rgba(255,255,255,0.5)",
          borderRadius: "50%",
          transform: `rotate(${frozenRot}deg)`,
        }} />
      </div>

      {/* Text */}
      <div className="absolute inset-0 flex items-center justify-center px-8" style={{ opacity: txt }}>
        <p style={{
          fontFamily: "'Geist', sans-serif",
          fontSize: "clamp(18px, 3.2vw, 44px)",
          fontWeight: 300, color: "rgba(255,255,255,0.9)",
          letterSpacing: "0.04em", textAlign: "center",
        }}>People waste years waiting.</p>
      </div>
    </div>
  );
}

// ─── Scene 3: The Freeze (16–21s) ────────────────────────────────────────────
function Scene3Freeze({ t }: { t: number }) {
  const vis = fade(t, 16, 16.05, 20.8, 21.1);
  const lightOp = fade(t, 16.2, 16.8, 20.5, 21);
  const words = ["There", "should", "be", "a", "smarter", "way."];
  const wordFades = words.map((_, i) =>
    fade(t, 17.5 + i * 0.14, 17.5 + i * 0.14 + 0.45, 20.5, 21)
  );

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-10"
      style={{ opacity: vis, background: "#000" }}>
      {/* Horizontal light */}
      <div style={{
        position: "absolute", top: "50%", left: 0, right: 0,
        height: "1px", marginTop: "-1px",
        background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.55) 25%, rgba(255,255,255,0.9) 50%, rgba(255,255,255,0.55) 75%, transparent 100%)",
        boxShadow: "0 0 18px rgba(255,255,255,0.35), 0 0 40px rgba(255,255,255,0.12)",
        opacity: lightOp,
      }} />

      <p style={{
        fontFamily: "'Geist', sans-serif",
        fontSize: "clamp(16px, 2.8vw, 40px)",
        fontWeight: 200, letterSpacing: "0.06em",
        color: "rgba(255,255,255,0.88)",
        display: "flex", gap: "0.38em",
        flexWrap: "wrap", justifyContent: "center",
        textAlign: "center", padding: "0 1.5rem",
      }}>
        {words.map((w, i) => (
          <span key={i} style={{
            opacity: wordFades[i] ?? 0,
            filter: `blur(${(1 - (wordFades[i] ?? 0)) * 5}px)`,
          }}>{w}</span>
        ))}
      </p>
    </div>
  );
}

// ─── Scene 4: Digital Transition (21–28s) ────────────────────────────────────
function Scene4Transition({ t }: { t: number }) {
  const vis = fade(t, 21, 21.1, 27.7, 28.1);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2;
    ctx.clearRect(0, 0, W, H);

    const prog = p(t, 21, 28);

    // Central blue glow
    const glowR = 60 + prog * 220;
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
    glow.addColorStop(0, `rgba(45,156,219,${0.14 * prog})`);
    glow.addColorStop(1, "rgba(45,156,219,0)");
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(cx, cy, glowR, 0, Math.PI * 2); ctx.fill();

    // Warp streak particles
    WARP_PARTS.forEach(part => {
      const progress = ((( t - 21) * part.speed + part.phase) % 1 + 1) % 1;
      const dist = progress * Math.min(W, H) * 0.55;
      const prevDist = Math.max(0, dist - 12);
      const alpha = (1 - progress) * part.bright * 0.55 * prog;

      ctx.strokeStyle = `rgba(45,156,219,${alpha})`;
      ctx.lineWidth = 0.5 + progress * 1.5;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(part.angle) * prevDist, cy + Math.sin(part.angle) * prevDist);
      ctx.lineTo(cx + Math.cos(part.angle) * dist, cy + Math.sin(part.angle) * dist);
      ctx.stroke();
    });

    // Floating UI line fragments
    UI_FRAGS.forEach(frag => {
      const fragProg = p(t, 22 + frag.phase * 3, 22 + frag.phase * 3 + 1.5);
      if (fragProg <= 0) return;
      const alpha = frag.alpha * fragProg * prog;
      const x = frag.xNorm * W + Math.sin(t * frag.drift * 10 + frag.yNorm * 8) * 20;
      const y = frag.yNorm * H;
      const w = frag.widthNorm * W;
      ctx.fillStyle = `rgba(45,156,219,${alpha})`;
      ctx.fillRect(x, y, w, 1);
      // Node dot at right end
      ctx.fillStyle = `rgba(45,156,219,${alpha * 1.8})`;
      ctx.beginPath(); ctx.arc(x + w, y, 1.5, 0, Math.PI * 2); ctx.fill();
    });

    // Ambient particles drifting in
    AMBIENT_PARTS.slice(0, 40).forEach(part => {
      const px = (((part.x0 + part.vx * t * 2) % 1) + 1) % 1;
      const py = (((part.y0 + part.vy * t * 2) % 1) + 1) % 1;
      ctx.fillStyle = `rgba(45,156,219,${part.opacity * 0.8 * prog})`;
      ctx.beginPath(); ctx.arc(px * W, py * H, part.size * 0.8, 0, Math.PI * 2); ctx.fill();
    });
  }, [t]);

  return (
    <div className="absolute inset-0" style={{ opacity: vis, background: "#010508" }}>
      <canvas ref={canvasRef} width={1280} height={720}
        style={{ width: "100%", height: "100%" }} />
    </div>
  );
}

// ─── Scene 5: Logo Reveal (28–34s) ───────────────────────────────────────────
function Scene5Logo({ t }: { t: number }) {
  const vis = fade(t, 28, 28.1, 33.7, 34.1);

  const glowScale = (() => {
    if (t < 28) return 0;
    if (t < 29) return eoo(p(t, 28, 29)) * 5;
    return 5 - eoo(p(t, 29, 31)) * 4.85;
  })();
  const glowOpacity = (() => {
    if (t < 28) return 0;
    if (t < 29) return eoo(p(t, 28, 29));
    return Math.max(0, 1 - eoo(p(t, 29, 31)) * 0.88);
  })();

  const markOp = fade(t, 30.5, 31.2, 33.4, 34);
  const wordOp  = fade(t, 31.3, 32.0, 33.4, 34);
  const tagOp   = fade(t, 32.2, 32.9, 33.4, 34);

  const letters = "ZEYVO".split("");
  const lFades = letters.map((_, i) => fade(t, 31.3 + i * 0.08, 31.3 + i * 0.08 + 0.38));
  const lY = letters.map((_, i) => (1 - Math.min(1, Math.max(0, (t - 31.3 - i * 0.08) / 0.38))) * 6);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6"
      style={{ opacity: vis, background: "#000" }}>
      {/* Glow burst */}
      <div className="absolute" style={{
        width: "300px", height: "300px", borderRadius: "50%",
        background: `radial-gradient(circle, ${BLUE}28 0%, transparent 70%)`,
        transform: `scale(${glowScale})`, opacity: glowOpacity, pointerEvents: "none",
      }} />

      {/* Logo + glass reflection */}
      <div style={{ position: "relative", opacity: markOp }}>
        <LogoMark size={54} glow />
        {/* Glass reflection below */}
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0,
          height: "54px", marginTop: "2px",
          transform: "scaleY(-1)",
          maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, transparent 70%)",
          WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, transparent 70%)",
          pointerEvents: "none",
        }}>
          <LogoMark size={54} glow={false} />
        </div>
      </div>

      {/* ZEYVO wordmark */}
      <div style={{ display: "flex", gap: "0.18em", opacity: wordOp }}>
        {letters.map((l, i) => (
          <span key={i} style={{
            fontFamily: "'Geist', sans-serif",
            fontSize: "clamp(38px, 6.5vw, 80px)",
            fontWeight: 500, color: "#fff", letterSpacing: "0.18em",
            opacity: lFades[i], transform: `translateY(${lY[i]}px)`,
            display: "inline-block",
          }}>{l}</span>
        ))}
      </div>

      <p style={{
        fontFamily: "'Geist', sans-serif",
        fontSize: "clamp(10px, 1.4vw, 15px)",
        fontWeight: 300, color: "rgba(255,255,255,0.38)",
        letterSpacing: "0.24em", textTransform: "uppercase",
        opacity: tagOp, textAlign: "center", padding: "0 1rem",
      }}>AI-powered operational flow intelligence</p>

      {/* Atmosphere */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: `radial-gradient(ellipse 62% 52% at 50% 50%, ${BLUE}12 0%, transparent 70%)`,
        opacity: markOp,
      }} />
    </div>
  );
}

// ─── Scene 6: Remote Queue (34–46s) ──────────────────────────────────────────
function Scene6Queue({ t }: { t: number }) {
  const vis = fade(t, 34, 34.3, 45.6, 46.1);

  const step1 = fade(t, 34, 34.5, 37.2, 37.7);
  const step2 = fade(t, 37.8, 38.2, 40.8, 41.3);
  const step3 = fade(t, 41.4, 41.8, 45.4, 46);

  const txt1 = fade(t, 35.5, 36.0, 37.2, 37.7);
  const txt2 = fade(t, 43.0, 43.5, 45.4, 46);

  const selectedBranch = t > 36 ? 1 : -1;
  const selectedService = t > 39.5 ? 0 : -1;
  const joinAnim = p(t, 41.4, 42.5);

  return (
    <div className="absolute inset-0 flex items-center justify-center"
      style={{ opacity: vis, background: "#000" }}>

      {/* Step 1 — Branch selection */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-6" style={{ opacity: step1 }}>
        <p style={{ fontFamily: "'Geist', sans-serif", fontSize: "clamp(24px, 4vw, 56px)", fontWeight: 200, color: "rgba(255,255,255,0.9)", letterSpacing: "0.06em", opacity: txt1 }}>
          Join remotely.
        </p>
        <div style={{
          width: "clamp(260px, 36vw, 360px)",
          background: "rgba(8,10,16,0.96)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "18px", padding: "clamp(16px, 2.5vw, 28px)",
          boxShadow: `0 0 60px rgba(45,156,219,0.1), inset 0 1px 0 rgba(255,255,255,0.06)`,
        }}>
          <div style={{ fontFamily: "'Geist', sans-serif", fontSize: "10px", fontWeight: 300, color: "rgba(255,255,255,0.3)", letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: "16px" }}>Select Branch</div>
          {["City Center", "Mirzo Medical", "Yunusabad", "Chilonzor"].map((name, i) => (
            <div key={name} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "10px 12px", marginBottom: "6px", borderRadius: "8px",
              background: selectedBranch === i ? `rgba(45,156,219,0.12)` : "transparent",
              border: selectedBranch === i ? `1px solid ${BLUE}40` : "1px solid transparent",
              transition: "all 0.3s ease",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{
                  width: "6px", height: "6px", borderRadius: "50%",
                  background: selectedBranch === i ? BLUE : "rgba(255,255,255,0.2)",
                  boxShadow: selectedBranch === i ? `0 0 6px ${BLUE}` : "none",
                  transition: "all 0.3s",
                }} />
                <span style={{ fontFamily: "'Geist', sans-serif", fontSize: "13px", fontWeight: selectedBranch === i ? 500 : 300, color: selectedBranch === i ? "#fff" : "rgba(255,255,255,0.5)" }}>{name}</span>
              </div>
              <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>{[14, 8, 21, 6][i]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Step 2 — Service selection */}
      <div className="absolute inset-0 flex items-center justify-center" style={{ opacity: step2 }}>
        <div style={{
          width: "clamp(260px, 36vw, 360px)",
          background: "rgba(8,10,16,0.96)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "18px", padding: "clamp(16px, 2.5vw, 28px)",
          boxShadow: `0 0 60px rgba(45,156,219,0.1), inset 0 1px 0 rgba(255,255,255,0.06)`,
        }}>
          <div style={{ fontFamily: "'Geist', sans-serif", fontSize: "11px", fontWeight: 400, color: "rgba(255,255,255,0.4)", marginBottom: "4px" }}>Mirzo Medical</div>
          <div style={{ fontFamily: "'Geist', sans-serif", fontSize: "10px", fontWeight: 300, color: "rgba(255,255,255,0.28)", letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: "16px" }}>Select Service</div>
          {["Cardiology", "Neurology", "General Practice", "Diagnostics"].map((svc, i) => (
            <div key={svc} style={{
              display: "flex", alignItems: "center", gap: "10px",
              padding: "10px 12px", marginBottom: "6px", borderRadius: "8px",
              background: selectedService === i ? `rgba(45,156,219,0.12)` : "transparent",
              border: selectedService === i ? `1px solid ${BLUE}40` : "1px solid transparent",
              transition: "all 0.3s",
            }}>
              <div style={{
                width: "6px", height: "6px", borderRadius: "50%",
                background: selectedService === i ? BLUE : "rgba(255,255,255,0.18)",
                boxShadow: selectedService === i ? `0 0 6px ${BLUE}` : "none",
                transition: "all 0.3s",
              }} />
              <span style={{ fontFamily: "'Geist', sans-serif", fontSize: "13px", fontWeight: selectedService === i ? 500 : 300, color: selectedService === i ? "#fff" : "rgba(255,255,255,0.45)" }}>{svc}</span>
            </div>
          ))}
          <div style={{ marginTop: "16px", background: BLUE, borderRadius: "10px", padding: "11px 0", textAlign: "center" }}>
            <span style={{ fontFamily: "'Geist', sans-serif", fontSize: "13px", fontWeight: 500, color: "#fff" }}>Join Queue →</span>
          </div>
        </div>
      </div>

      {/* Step 3 — Confirmation */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-6" style={{ opacity: step3 }}>
        <div style={{
          width: "clamp(260px, 36vw, 360px)",
          background: "rgba(8,10,16,0.96)",
          border: `1px solid ${BLUE}40`,
          borderRadius: "18px", padding: "clamp(16px, 2.5vw, 28px)",
          boxShadow: `0 0 80px rgba(45,156,219,0.15), inset 0 1px 0 rgba(255,255,255,0.06)`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
            <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: BLUE, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 12px ${BLUE}` }}>
              <span style={{ fontSize: "11px", color: "#fff" }}>✓</span>
            </div>
            <span style={{ fontFamily: "'Geist', sans-serif", fontSize: "15px", fontWeight: 500, color: "#fff" }}>Joined Queue</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
            <div>
              <div style={{ fontFamily: "'Geist', sans-serif", fontSize: "10px", fontWeight: 300, color: "rgba(255,255,255,0.3)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "4px" }}>Position</div>
              <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: "clamp(28px, 5vw, 44px)", fontWeight: 400, color: "#fff" }}>#12</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "'Geist', sans-serif", fontSize: "10px", fontWeight: 300, color: "rgba(255,255,255,0.3)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "4px" }}>Wait</div>
              <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: "clamp(20px, 3.5vw, 32px)", fontWeight: 400, color: BLUE }}>~18 min</div>
            </div>
          </div>
          <div style={{ height: "3px", background: "rgba(255,255,255,0.06)", borderRadius: "3px", overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${joinAnim * 15}%`,
              background: BLUE, boxShadow: `0 0 8px ${BLUE}`,
              transition: "none", borderRadius: "3px",
            }} />
          </div>
        </div>
        <p style={{ fontFamily: "'Geist', sans-serif", fontSize: "clamp(16px, 2.5vw, 32px)", fontWeight: 200, color: "rgba(255,255,255,0.75)", letterSpacing: "0.06em", textAlign: "center", opacity: txt2 }}>
          Never wait physically again.
        </p>
      </div>
    </div>
  );
}

// ─── Flow Map (particle canvas system) ───────────────────────────────────────
const FM_NODES = [
  { x: 0.12, y: 0.28, r: 4.5 }, { x: 0.38, y: 0.18, r: 5.5 },
  { x: 0.62, y: 0.30, r: 4.0 }, { x: 0.82, y: 0.22, r: 3.5 },
  { x: 0.25, y: 0.62, r: 5.0 }, { x: 0.55, y: 0.72, r: 6.0 },
  { x: 0.78, y: 0.65, r: 4.0 }, { x: 0.48, y: 0.46, r: 4.5 },
];
const FM_EDGES: [number, number, number][] = [
  [0,1,0.8],[1,2,1.1],[2,3,0.6],[0,4,0.9],[1,7,1.3],
  [4,5,1.4],[5,6,0.9],[2,7,0.7],[7,5,1.2],[3,6,0.5],
];

function drawFlowCanvas(
  ctx: CanvasRenderingContext2D, W: number, H: number, t: number,
  nodes: { x: number; y: number; r: number }[],
  edges: [number, number, number][],
  speedMult = 1,
) {
  ctx.clearRect(0, 0, W, H);

  // Background radial glow from center
  const bg = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, Math.max(W, H) * 0.65);
  bg.addColorStop(0, "rgba(45,156,219,0.05)");
  bg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  // Pulse rings emanating from each node
  nodes.forEach((nd, i) => {
    const x = nd.x * W, y = nd.y * H;
    for (let ring = 0; ring < 2; ring++) {
      const progress = ((t * 0.28 + i * 0.41 + ring * 0.5) % 1 + 1) % 1;
      const ringR = nd.r * 1.8 + progress * nd.r * 9;
      const alpha = (1 - progress) * 0.18;
      ctx.strokeStyle = `rgba(45,156,219,${alpha})`;
      ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.arc(x, y, ringR, 0, Math.PI * 2); ctx.stroke();
    }
  });

  // Edges
  edges.forEach(([ai, bi, load], ei) => {
    const a = nodes[ai]!, b = nodes[bi]!;
    const x1 = a.x*W, y1 = a.y*H, x2 = b.x*W, y2 = b.y*H;
    const mx = (x1+x2)/2, my = (y1+y2)/2;
    const dx = x2-x1, dy = y2-y1, len = Math.sqrt(dx*dx+dy*dy)||1;
    const sign = ei%2===0?1:-1;
    const cpx = mx+(-dy/len)*20*sign, cpy = my+(dx/len)*20*sign;
    const grad = ctx.createLinearGradient(x1,y1,x2,y2);
    const alpha = 0.09+load*0.24;
    grad.addColorStop(0, `rgba(45,156,219,${alpha*0.5})`);
    grad.addColorStop(0.5, `rgba(45,156,219,${alpha})`);
    grad.addColorStop(1, `rgba(45,156,219,${alpha*0.5})`);
    ctx.strokeStyle=grad; ctx.lineWidth=0.6+load*1.7;
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.quadraticCurveTo(cpx,cpy,x2,y2); ctx.stroke();
  });

  // Flow particles with trails
  edges.forEach(([ai, bi, load], ei) => {
    const a = nodes[ai]!, b = nodes[bi]!;
    const x1=a.x*W, y1=a.y*H, x2=b.x*W, y2=b.y*H;
    const mx=(x1+x2)/2, my=(y1+y2)/2, dx=x2-x1, dy=y2-y1, len=Math.sqrt(dx*dx+dy*dy)||1;
    const sign=ei%2===0?1:-1;
    const cpx=mx+(-dy/len)*20*sign, cpy=my+(dx/len)*20*sign;
    const count=Math.floor(load*5+3), speed=(0.11+load*0.08)*speedMult;
    for (let k=0; k<count; k++) {
      const progress=((t*speed+k/count)%1+1)%1;
      const inv=1-progress;
      const px=inv*inv*x1+2*inv*progress*cpx+progress*progress*x2;
      const py=inv*inv*y1+2*inv*progress*cpy+progress*progress*y2;
      const al=0.65+0.35*Math.sin(t*3.5+k*1.6);

      // Trail
      for (let s=1; s<=4; s++) {
        const tp=Math.max(0, progress-s*0.022);
        const tinv=1-tp;
        const trx=tinv*tinv*x1+2*tinv*tp*cpx+tp*tp*x2;
        const tryy=tinv*tinv*y1+2*tinv*tp*cpy+tp*tp*y2;
        ctx.fillStyle=`rgba(45,156,219,${al*(0.32-s*0.06)})`;
        ctx.beginPath(); ctx.arc(trx, tryy, 2.8-s*0.4, 0, Math.PI*2); ctx.fill();
      }

      // Glow halo
      const g=ctx.createRadialGradient(px,py,0,px,py,7);
      g.addColorStop(0, `rgba(80,195,255,${al*0.85})`);
      g.addColorStop(0.4, `rgba(45,156,219,${al*0.55})`);
      g.addColorStop(1, "rgba(45,156,219,0)");
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(px,py,7,0,Math.PI*2); ctx.fill();
      // Bright core
      ctx.fillStyle=`rgba(220,242,255,${al*0.95})`;
      ctx.beginPath(); ctx.arc(px,py,1.6,0,Math.PI*2); ctx.fill();
    }
  });

  // Nodes
  nodes.forEach((nd, i) => {
    const x=nd.x*W, y=nd.y*H, pulse=Math.sin(t*2.2+i*0.9)*0.3+0.7;
    // Outer glow
    const glow=ctx.createRadialGradient(x,y,nd.r,x,y,nd.r*5);
    glow.addColorStop(0, `rgba(45,156,219,${0.32*pulse})`);
    glow.addColorStop(1, "rgba(45,156,219,0)");
    ctx.fillStyle=glow; ctx.beginPath(); ctx.arc(x,y,nd.r*5,0,Math.PI*2); ctx.fill();
    // Outer ring
    ctx.strokeStyle=`rgba(45,156,219,${0.5*pulse})`; ctx.lineWidth=0.8;
    ctx.beginPath(); ctx.arc(x,y,nd.r*2+pulse*1.4,0,Math.PI*2); ctx.stroke();
    // Inner ring
    ctx.strokeStyle=`rgba(120,200,255,${0.25*pulse})`; ctx.lineWidth=0.5;
    ctx.beginPath(); ctx.arc(x,y,nd.r*1.3,0,Math.PI*2); ctx.stroke();
    // Core
    ctx.fillStyle=`rgba(255,255,255,${0.82+0.18*pulse})`;
    ctx.beginPath(); ctx.arc(x,y,nd.r,0,Math.PI*2); ctx.fill();
  });
}

function FlowMap({ t }: { t: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const c = canvas.getContext("2d"); if (!c) return;
    drawFlowCanvas(c, canvas.width, canvas.height, t, FM_NODES, FM_EDGES);
  }, [t]);
  return <canvas ref={canvasRef} width={480} height={290} style={{ width: "100%", height: "calc(100% - 30px)" }} />;
}

// ─── Scene 7: Live Tracking (46–56s) ─────────────────────────────────────────
function Scene7Tracking({ t }: { t: number }) {
  const isPortrait = usePortrait();
  const vis = fade(t, 46, 46.3, 55.6, 56.1);

  const panelOp = fade(t, 46, 46.5, 50.2, 50.7);
  const dashOp  = fade(t, 50.8, 51.2, 55.4, 56);

  const txt1 = fade(t, 47.0, 47.5, 50.0, 50.5);
  const txt2 = fade(t, 53.0, 53.5, 55.4, 56);

  const qPos = Math.max(1, Math.round(12 - p(t, 46.5, 50) * 10));
  const eta  = Math.max(2, Math.round(14 - p(t, 46.5, 50) * 10));
  const served  = Math.round(1200 + p(t, 50.8, 55) * 47);
  const eff     = Math.round(91 + p(t, 50.8, 55) * 3);
  const waitAvg = (8.3 - p(t, 50.8, 55) * 1.2).toFixed(1);

  return (
    <div className="absolute inset-0 flex items-center justify-center"
      style={{ opacity: vis, background: "#000" }}>

      {/* Queue panel */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-6" style={{ opacity: panelOp }}>
        <p style={{ fontFamily: "'Geist', sans-serif", fontSize: "clamp(22px, 3.5vw, 48px)", fontWeight: 200, color: "rgba(255,255,255,0.88)", letterSpacing: "0.06em", opacity: txt1 }}>
          Track in real-time.
        </p>
        <div style={{
          width: "clamp(260px, 38vw, 400px)",
          background: "rgba(255,255,255,0.04)",
          border: `1px solid rgba(45,156,219,0.22)`,
          borderRadius: "16px", padding: "clamp(20px, 3vw, 36px)",
          backdropFilter: "blur(40px)",
          boxShadow: `0 0 80px rgba(45,156,219,0.08), inset 0 1px 0 rgba(255,255,255,0.08)`,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
            <div>
              <div style={{ fontFamily: "'Geist', sans-serif", fontSize: "11px", fontWeight: 300, color: "rgba(255,255,255,0.35)", letterSpacing: "0.2em", textTransform: "uppercase" }}>Live Position</div>
              <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: "clamp(30px, 5.5vw, 52px)", fontWeight: 400, color: "#fff", lineHeight: 1.1, marginTop: "4px" }}>#{qPos}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "'Geist', sans-serif", fontSize: "11px", fontWeight: 300, color: "rgba(255,255,255,0.35)", letterSpacing: "0.2em", textTransform: "uppercase" }}>Est. wait</div>
              <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: "clamp(18px, 3.5vw, 30px)", fontWeight: 400, color: BLUE, lineHeight: 1.1, marginTop: "4px" }}>{eta} min</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} style={{
                width: i < qPos-1 ? "22px" : "8px", height: "4px", borderRadius: "4px",
                background: i===qPos-1 ? BLUE : i<qPos-1 ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)",
                boxShadow: i===qPos-1 ? `0 0 8px ${BLUE}` : "none",
                flexShrink: 0, transition: "all 0.4s ease",
              }} />
            ))}
          </div>
        </div>
      </div>

      {/* Dashboard */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-4" style={{ opacity: dashOp }}>
        <div style={{
          width: "100%", maxWidth: "820px",
          display: "grid",
          gridTemplateColumns: isPortrait ? "1fr" : "1fr 2fr 1fr",
          gap: "12px", height: isPortrait ? "auto" : "clamp(260px, 42vh, 400px)",
        }}>
          {!isPortrait && (
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", padding: "16px", backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 35%)" }}>
              <div style={{ fontFamily: "'Geist', sans-serif", fontSize: "10px", fontWeight: 300, color: "rgba(255,255,255,0.28)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "14px" }}>Branches</div>
              {(["City Center","Mirzo","Yunusabad","Chilonzor","Sergeli"] as const).map((b, i) => {
                const counts = [14, 8, 21, 6, 11];
                const cap = counts[i] ?? 0;
                const fill = cap / 25;
                const color = fill > 0.75 ? BLUE : "#4ADE80";
                return (
                  <div key={b} style={{ marginBottom: "11px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <span style={{ fontFamily: "'Geist', sans-serif", fontSize: "11px", fontWeight: 300, color: "rgba(255,255,255,0.6)" }}>{b}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                        <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: "10px", color: "rgba(255,255,255,0.35)" }}>{cap}</span>
                        <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: color, boxShadow: `0 0 ${4 + (0.5 + 0.5 * Math.sin(t * 2.8 + i)) * 3}px ${color}` }} />
                      </div>
                    </div>
                    <div style={{ height: "2px", background: "rgba(255,255,255,0.06)", borderRadius: "2px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${fill * 100}%`, background: color, boxShadow: `0 0 4px ${color}80`, borderRadius: "2px" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", padding: "16px", position: "relative", overflow: "hidden", backgroundImage: "linear-gradient(180deg, rgba(45,156,219,0.06) 0%, transparent 35%)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <div style={{ fontFamily: "'Geist', sans-serif", fontSize: "10px", fontWeight: 300, color: "rgba(255,255,255,0.28)", letterSpacing: "0.2em", textTransform: "uppercase" }}>Live Flow</div>
              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#4ADE80", boxShadow: `0 0 ${6 + (0.5 + 0.5 * Math.sin(t * 3.8)) * 4}px #4ADE80` }} />
                <span style={{ fontFamily: "'Geist', sans-serif", fontSize: "9px", fontWeight: 400, color: "#4ADE80", letterSpacing: "0.18em" }}>LIVE</span>
              </div>
            </div>
            <FlowMap t={t} />
          </div>
          {!isPortrait && (
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
              {[
                { label: "Avg wait", value: `${waitAvg} min` },
                { label: "Served today", value: served.toString() },
                { label: "Efficiency", value: `${eff}%` },
                { label: "Peak forecast", value: "14:00–14:45" },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontFamily: "'Geist', sans-serif", fontSize: "10px", fontWeight: 300, color: "rgba(255,255,255,0.28)", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: "3px" }}>{label}</div>
                  <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: "clamp(12px, 1.8vw, 17px)", fontWeight: 400, color: "#fff" }}>{value}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <p style={{ fontFamily: "'Geist', sans-serif", fontSize: "clamp(14px, 2vw, 26px)", fontWeight: 200, color: "rgba(255,255,255,0.72)", letterSpacing: "0.06em", textAlign: "center", opacity: txt2 }}>
          Arrive exactly when needed.
        </p>
      </div>
    </div>
  );
}

// ─── Scene 8: AI ETA (56–66s) ─────────────────────────────────────────────────
function Scene8AIEta({ t }: { t: number }) {
  const vis = fade(t, 56, 56.2, 65.7, 66.1);

  const notifOp  = fade(t, 56, 56.4, 60.2, 60.7);
  const timelineOp = fade(t, 60.8, 61.2, 65.4, 66);

  const txt1 = fade(t, 57.5, 58.0, 60.2, 60.7);
  const wordFades = ["Predict.", "Optimize.", "Synchronize."].map((_, i) =>
    fade(t, 62.5 + i * 0.55, 62.5 + i * 0.55 + 0.5, 65.4, 66)
  );

  const tlProg = p(t, 61.2, 64.5);

  return (
    <div className="absolute inset-0 flex items-center justify-center"
      style={{ opacity: vis, background: "#000" }}>

      {/* Leave Now notification */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-5" style={{ opacity: notifOp }}>
        <p style={{ fontFamily: "'Geist', sans-serif", fontSize: "clamp(14px, 2vw, 22px)", fontWeight: 300, color: "rgba(255,255,255,0.35)", letterSpacing: "0.22em", textTransform: "uppercase", opacity: txt1 }}>
          Smart ETA intelligence.
        </p>
        <div style={{
          maxWidth: "clamp(280px, 42vw, 420px)", width: "90%",
          background: "rgba(8,10,16,0.97)",
          border: `1px solid rgba(45,156,219,0.3)`,
          borderRadius: "16px", padding: "clamp(16px, 2.5vw, 26px)",
          backdropFilter: "blur(30px)",
          boxShadow: `0 0 60px rgba(45,156,219,0.15), inset 0 1px 0 rgba(255,255,255,0.06)`,
          animation: "float 3s ease-in-out infinite",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
            <LogoMark size={26} glow={false} />
            <span style={{ fontFamily: "'Geist', sans-serif", fontSize: "clamp(14px, 2vw, 18px)", fontWeight: 600, color: "#fff" }}>Leave now.</span>
          </div>
          <p style={{ fontFamily: "'Geist', sans-serif", fontSize: "13px", fontWeight: 300, color: "rgba(255,255,255,0.58)", lineHeight: 1.65, marginBottom: "16px" }}>
            Your appointment is ready in 4 minutes.<br />
            Walk time: 3 min. You&apos;re on time.
          </p>
          <div style={{ display: "flex", gap: "10px" }}>
            <div style={{ flex: 1, background: BLUE, borderRadius: "8px", padding: "9px 0", textAlign: "center" }}>
              <span style={{ fontFamily: "'Geist', sans-serif", fontSize: "12px", fontWeight: 500, color: "#fff" }}>View Status</span>
            </div>
            <div style={{ flex: 1, border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "9px 0", textAlign: "center" }}>
              <span style={{ fontFamily: "'Geist', sans-serif", fontSize: "12px", fontWeight: 300, color: "rgba(255,255,255,0.4)" }}>Dismiss</span>
            </div>
          </div>
        </div>
      </div>

      {/* Prediction timeline + words */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-8" style={{ opacity: timelineOp }}>
        {/* Timeline */}
        <div style={{ width: "clamp(280px, 48vw, 460px)", position: "relative" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
            {["Depart", "Walk 3 min", "Arrive", "Your Turn"].map((lbl, i) => (
              <div key={lbl} style={{ textAlign: "center", flex: 1 }}>
                <div style={{ fontFamily: "'Geist', sans-serif", fontSize: "9px", fontWeight: 300, color: tlProg > i/3 ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.2)", letterSpacing: "0.12em", textTransform: "uppercase", transition: "color 0.4s" }}>{lbl}</div>
              </div>
            ))}
          </div>
          {/* Rail */}
          <div style={{ position: "relative", height: "3px", background: "rgba(255,255,255,0.08)", borderRadius: "3px", overflow: "hidden" }}>
            <div style={{
              position: "absolute", top: 0, left: 0, height: "100%",
              width: `${tlProg * 100}%`,
              background: `linear-gradient(90deg, ${BLUE}80, ${BLUE})`,
              boxShadow: `0 0 8px ${BLUE}`,
              transition: "none",
            }} />
          </div>
          {/* Dot */}
          <div style={{
            position: "absolute", top: "calc(50% + 2px)", left: `${tlProg * 100}%`,
            width: "12px", height: "12px", borderRadius: "50%",
            background: BLUE, boxShadow: `0 0 12px ${BLUE}`,
            transform: "translate(-50%, -50%)",
            transition: "none",
          }} />
          {/* Markers */}
          {[0, 0.33, 0.66, 1].map((pos, i) => (
            <div key={i} style={{
              position: "absolute", top: "calc(50% + 2px)", left: `${pos * 100}%`,
              width: "5px", height: "5px", borderRadius: "50%",
              background: tlProg >= pos ? "#fff" : "rgba(255,255,255,0.2)",
              transform: "translate(-50%, -50%)",
              transition: "background 0.3s",
            }} />
          ))}
        </div>

        {/* Predict / Optimize / Synchronize */}
        <div style={{ display: "flex", gap: "clamp(16px, 3vw, 40px)", flexWrap: "wrap", justifyContent: "center" }}>
          {["Predict.", "Optimize.", "Synchronize."].map((w, i) => (
            <span key={w} style={{
              fontFamily: "'Geist', sans-serif",
              fontSize: "clamp(22px, 3.8vw, 52px)",
              fontWeight: 200, color: "rgba(255,255,255,0.9)",
              letterSpacing: "0.06em",
              opacity: wordFades[i] ?? 0,
              filter: `blur(${(1 - (wordFades[i] ?? 0)) * 4}px)`,
            }}>{w}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Network Canvas ───────────────────────────────────────────────────────────
const NC_BASE = [
  { x: 0.20, y: 0.35, r: 5 }, { x: 0.45, y: 0.20, r: 5 }, { x: 0.72, y: 0.32, r: 4.5 },
  { x: 0.30, y: 0.65, r: 4.5 }, { x: 0.60, y: 0.72, r: 5 }, { x: 0.85, y: 0.55, r: 4 },
  { x: 0.50, y: 0.50, r: 7.5 },
];
const NC_TARGET = [
  { x: 0.18, y: 0.28, r: 5 }, { x: 0.50, y: 0.18, r: 5 }, { x: 0.78, y: 0.26, r: 4.5 },
  { x: 0.20, y: 0.72, r: 4.5 }, { x: 0.62, y: 0.76, r: 5 }, { x: 0.86, y: 0.50, r: 4 },
  { x: 0.50, y: 0.50, r: 7.5 },
];
const NC_EDGES: [number, number, number][] = [
  [0,1,0.7],[0,3,0.8],[1,2,0.9],[1,6,1.3],[2,5,0.6],
  [3,4,0.9],[3,6,1.1],[4,5,0.7],[4,6,1.2],[2,6,0.8],
];

function NetworkCanvas({ t, netP }: { t: number; netP: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const nodes = NC_BASE.map((base, i) => {
      const tgt = NC_TARGET[i] ?? base;
      const ease = netP < 0.5 ? 2*netP*netP : 1-Math.pow(-2*netP+2,2)/2;
      return { x: base.x+(tgt.x-base.x)*ease, y: base.y+(tgt.y-base.y)*ease, r: base.r };
    });
    drawFlowCanvas(ctx, canvas.width, canvas.height, t, nodes, NC_EDGES, 1-Math.sin(netP*Math.PI)*0.5);
  }, [netP, t]);
  return <canvas ref={canvasRef} width={520} height={290} style={{ width: "clamp(300px, 54vw, 540px)", height: "auto" }} />;
}

// ─── Scene 9: Business Intelligence (66–78s) ─────────────────────────────────
function Scene9Intelligence({ t }: { t: number }) {
  const isPortrait = usePortrait();
  const vis = fade(t, 66, 66.3, 77.6, 78.1);

  const heat = fade(t, 66, 66.3, 70.2, 70.7);
  const rec  = fade(t, 70.8, 71.2, 74.8, 75.3);
  const net  = fade(t, 75.4, 75.8, 77.5, 78);

  const txt1 = fade(t, 67, 67.5, 70, 70.5);
  const txt2 = fade(t, 71, 71.5, 74.6, 75.2);

  const gridProgress = p(t, 66.3, 69);
  const COLS = isPortrait ? 4 : 7;
  const ROWS = 12;
  const loads = [
    [0.1,0.2,0.1,0.3,0.2,0.1,0.1],[0.2,0.3,0.2,0.4,0.3,0.2,0.2],
    [0.5,0.7,0.6,0.8,0.7,0.5,0.4],[0.9,0.8,0.9,1.0,0.9,0.8,0.7],
    [0.7,0.6,0.7,0.8,0.7,0.6,0.5],[0.4,0.5,0.4,0.6,0.5,0.4,0.3],
    [0.3,0.4,0.3,0.5,0.4,0.3,0.2],[0.6,0.7,0.6,0.9,0.8,0.6,0.5],
    [0.8,0.9,0.8,1.0,0.9,0.8,0.7],[0.5,0.6,0.5,0.7,0.6,0.5,0.4],
    [0.2,0.3,0.2,0.3,0.2,0.2,0.1],[0.1,0.1,0.1,0.2,0.1,0.1,0.1],
  ];
  const days = isPortrait ? ["M","T","W","T"] : ["M","T","W","T","F","S","S"];
  const hours = ["08","09","10","11","12","13","14","15","16","17","18","19"];
  const netP = p(t, 75.8, 77.6);

  return (
    <div className="absolute inset-0 flex items-center justify-center"
      style={{ opacity: vis, background: "#000" }}>

      {/* Heatmap */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4" style={{ opacity: heat }}>
        <p style={{ fontFamily: "'Geist', sans-serif", fontSize: "clamp(20px, 3.2vw, 44px)", fontWeight: 200, color: "rgba(255,255,255,0.88)", letterSpacing: "0.06em", opacity: txt1 }}>
          Operational intelligence.
        </p>
        <div style={{ display: "flex", gap: "3px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "3px", marginRight: "6px" }}>
            <div style={{ height: "22px" }} />
            {hours.map(h => (
              <div key={h} style={{ height: "16px", display: "flex", alignItems: "center", fontFamily: "'Geist Mono', monospace", fontSize: "9px", color: "rgba(255,255,255,0.22)", width: "22px", justifyContent: "flex-end", paddingRight: "4px" }}>{h}</div>
            ))}
          </div>
          <div>
            <div style={{ display: "flex", gap: "3px", marginBottom: "3px" }}>
              {days.map((d, di) => (
                <div key={di} style={{ width: "clamp(22px,4vw,32px)", textAlign: "center", fontFamily: "'Geist Mono', monospace", fontSize: "9px", color: "rgba(255,255,255,0.22)" }}>{d}</div>
              ))}
            </div>
            {loads.map((row, ri) => (
              <div key={ri} style={{ display: "flex", gap: "3px", marginBottom: "3px" }}>
                {row.slice(0, COLS).map((load, ci) => {
                  const idx = ri * COLS + ci;
                  const cellVis = Math.max(0, Math.min(1, (gridProgress - idx / (ROWS * COLS)) / (1 / (ROWS * COLS)) * 4));
                  return (
                    <div key={ci} style={{
                      width: "clamp(22px,4vw,32px)", height: "16px", borderRadius: "3px",
                      background: `rgba(45,156,219,${load * cellVis * 0.9})`,
                      boxShadow: load > 0.8 ? `0 0 6px rgba(45,156,219,${load * 0.4})` : "none",
                    }} />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recommendation */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-5" style={{ opacity: rec }}>
        <p style={{ fontFamily: "'Geist', sans-serif", fontSize: "clamp(14px, 1.8vw, 20px)", fontWeight: 300, color: "rgba(255,255,255,0.38)", letterSpacing: "0.18em", textTransform: "uppercase", opacity: txt2 }}>
          Real-time visibility for modern businesses.
        </p>
        <div style={{
          maxWidth: "clamp(280px, 42vw, 420px)", width: "90%",
          background: "rgba(6,9,18,0.97)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "16px", padding: "clamp(20px, 3vw, 32px)",
        }}>
          <div style={{ fontFamily: "'Geist', sans-serif", fontSize: "11px", fontWeight: 300, color: "rgba(255,255,255,0.3)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "16px" }}>AI Recommendation</div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: "16px" }}>
            <p style={{ fontFamily: "'Geist', sans-serif", fontSize: "14px", fontWeight: 400, color: "rgba(255,255,255,0.8)", lineHeight: 1.65, marginBottom: "16px" }}>
              Add 2 operators at <span style={{ color: "#fff", fontWeight: 500 }}>Branch 04 – City Center</span> between 13:30–15:00 today.
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

      {/* Network */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4" style={{ opacity: net }}>
        <div style={{ fontFamily: "'Geist', sans-serif", fontSize: "10px", fontWeight: 300, color: "rgba(255,255,255,0.28)", letterSpacing: "0.22em", textTransform: "uppercase" }}>Operational Intelligence</div>
        <NetworkCanvas t={t} netP={netP} />
      </div>
    </div>
  );
}

// ─── Large Network Canvas (10 nodes) ─────────────────────────────────────────
const NC_LARGE_NODES = [
  { x: 0.10, y: 0.24, r: 4.5 }, { x: 0.32, y: 0.14, r: 5.0 }, { x: 0.58, y: 0.18, r: 4.5 },
  { x: 0.80, y: 0.26, r: 4.0 }, { x: 0.18, y: 0.60, r: 5.0 }, { x: 0.44, y: 0.70, r: 6.5 },
  { x: 0.68, y: 0.64, r: 5.0 }, { x: 0.90, y: 0.50, r: 4.0 }, { x: 0.50, y: 0.42, r: 5.5 },
  { x: 0.28, y: 0.40, r: 4.5 },
];
const NC_LARGE_EDGES: [number, number, number][] = [
  [0,1,0.8],[0,4,0.9],[1,2,1.1],[1,8,1.2],[2,3,0.7],
  [2,8,0.9],[3,7,0.6],[4,5,1.3],[5,6,1.1],[5,8,1.4],
  [6,7,0.8],[7,8,0.7],[8,9,1.0],[9,4,0.9],
];

function LargeNetworkCanvas({ t }: { t: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    drawFlowCanvas(ctx, canvas.width, canvas.height, t, NC_LARGE_NODES, NC_LARGE_EDGES);
  }, [t]);
  return <canvas ref={canvasRef} width={660} height={370} style={{ width: "clamp(340px, 68vw, 660px)", height: "auto" }} />;
}

// ─── Scene 10: Ecosystem Scale (78–84s) ──────────────────────────────────────
function Scene10Ecosystem({ t }: { t: number }) {
  const vis = fade(t, 78, 78.2, 83.7, 84.1);
  const a = fade(t, 78, 78.3, 80.0, 80.4);
  const b = fade(t, 80.5, 80.8, 82.5, 83.0);
  const c = fade(t, 83.0, 83.3, 83.7, 84);
  const lblOp = fade(t, 83.5, 83.9, 83.7, 84);

  return (
    <div className="absolute inset-0 flex items-center justify-center"
      style={{ opacity: vis, background: "#000" }}>

      {/* Floor map */}
      <div className="absolute inset-0 flex items-center justify-center" style={{ opacity: a }}>
        <div style={{ position: "relative", width: "clamp(280px, 50vw, 560px)", height: "clamp(180px, 32vh, 320px)" }}>
          <svg width="100%" height="100%" viewBox="0 0 560 320" style={{ opacity: 0.85 }}>
            {[80, 200, 320, 440].map((x) => (
              <g key={x}>
                <rect x={x} y={40} width={60} height={40} rx={4} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={1} />
                <circle cx={x+30} cy={60} r={5} fill={BLUE} style={{ filter: `drop-shadow(0 0 4px ${BLUE})` }} />
              </g>
            ))}
            {[80, 200, 320, 440].map((x, i) => (
              <g key={`q${x}`}>
                {Array.from({ length: ([3,5,2,4] as number[])[i] ?? 3 }, (_, j) => (
                  <circle key={j} cx={x+30} cy={120+j*28} r={6} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={1} />
                ))}
              </g>
            ))}
            {[80, 200, 320, 440].map((x) => (
              <line key={`a${x}`} x1={x+30} y1={82} x2={x+30} y2={110} stroke={`${BLUE}60`} strokeWidth={1} strokeDasharray="3 3" />
            ))}
          </svg>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, textAlign: "center", fontFamily: "'Geist', sans-serif", fontSize: "10px", fontWeight: 300, color: "rgba(255,255,255,0.22)", letterSpacing: "0.22em", textTransform: "uppercase" }}>
            Real-time service floor
          </div>
        </div>
      </div>

      {/* Branch grid */}
      <div className="absolute inset-0 flex items-center justify-center px-6" style={{ opacity: b }}>
        <div style={{ maxWidth: "560px", width: "100%" }}>
          <p style={{ fontFamily: "'Geist', sans-serif", fontSize: "clamp(16px, 2.5vw, 30px)", fontWeight: 200, color: "rgba(255,255,255,0.85)", letterSpacing: "0.06em", textAlign: "center", marginBottom: "24px" }}>
            Built for the future of service operations.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px" }}>
            {["City Center","Mirzo","Yunusabad","Chilonzor"].map((name, i) => (
              <div key={name} style={{
                background: "rgba(255,255,255,0.03)",
                border: i === 2 ? `1px solid ${BLUE}50` : "1px solid rgba(255,255,255,0.07)",
                borderRadius: "10px", padding: "14px",
              }}>
                <div style={{ fontFamily: "'Geist', sans-serif", fontSize: "11px", fontWeight: 400, color: "rgba(255,255,255,0.55)", marginBottom: "6px" }}>{name}</div>
                <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: "20px", fontWeight: 400, color: i === 2 ? BLUE : "#fff" }}>{[14,8,21,6][i]}</div>
                <div style={{ fontFamily: "'Geist', sans-serif", fontSize: "10px", fontWeight: 300, color: "rgba(255,255,255,0.22)", marginTop: "2px" }}>in queue</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Large network */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3" style={{ opacity: c }}>
        <div style={{ fontFamily: "'Geist', sans-serif", fontSize: "10px", fontWeight: 300, color: "rgba(255,255,255,0.28)", letterSpacing: "0.22em", textTransform: "uppercase" }}>Operational Network</div>
        <LargeNetworkCanvas t={t} />
        <p style={{ fontFamily: "'Geist', sans-serif", fontSize: "clamp(13px, 1.8vw, 18px)", fontWeight: 300, color: "rgba(255,255,255,0.5)", letterSpacing: "0.06em", textAlign: "center", opacity: lblOp }}>
          Infrastructure-grade intelligence.
        </p>
      </div>
    </div>
  );
}

// ─── Scene 11: Final Statement (84–90s) ──────────────────────────────────────
function Scene11Final({ t }: { t: number }) {
  const vis  = fade(t, 84, 84.1, 89.8, 90.2);
  const mark = fade(t, 85, 85.5, 89.5, 90);
  const tag  = fade(t, 86.5, 87.0, 89.5, 90);
  const url  = fade(t, 88.5, 88.9, 90, 90.5);

  const letters = "ZEYVO".split("");
  const lFades = letters.map((_, i) => Math.max(0, Math.min(1, (t - 85 - i * 0.05) / 0.35)));

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6"
      style={{ opacity: vis, background: "#000" }}>
      <div style={{ opacity: mark }}><LogoMark size={44} glow /></div>
      <div style={{ display: "flex", gap: "0.16em", opacity: mark }}>
        {letters.map((l, i) => (
          <span key={i} style={{
            fontFamily: "'Geist', sans-serif",
            fontSize: "clamp(34px, 5.5vw, 68px)",
            fontWeight: 500, color: "#fff", letterSpacing: "0.16em",
            opacity: lFades[i],
          }}>{l}</span>
        ))}
      </div>
      <p style={{
        fontFamily: "'Geist', sans-serif",
        fontSize: "clamp(14px, 2.2vw, 28px)",
        fontWeight: 300, color: "rgba(255,255,255,0.9)",
        letterSpacing: "0.06em", textAlign: "center",
        opacity: tag, padding: "0 1rem",
      }}>Building the future of waiting.</p>
      <a href="https://zeyvo.tech" style={{
        fontFamily: "'Geist', sans-serif",
        fontSize: "clamp(12px, 1.6vw, 18px)",
        fontWeight: 400, color: BLUE,
        letterSpacing: "0.12em", textDecoration: "none",
        opacity: url, textShadow: `0 0 20px ${BLUE}60`,
      }}>zeyvo.tech</a>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ZeyvoFilm() {
  const params = useSearchParams();
  const seekTo = parseFloat(params.get("t") ?? "0") || 0;

  const [isPlaying, setIsPlaying] = useState(false);
  const [filmTime, setFilmTime] = useState(seekTo);
  const [ended, setEnded] = useState(false);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (seekTo > 0) {
      setIsPlaying(true);
      setFilmTime(seekTo);
      startRef.current = performance.now() - seekTo * 1000;
      const tick = () => {
        const elapsed = (performance.now() - startRef.current) / 1000;
        if (elapsed >= DUR) { setFilmTime(DUR); setEnded(true); return; }
        setFilmTime(elapsed);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      if (elapsed >= DUR) { setFilmTime(DUR); setEnded(true); return; }
      setFilmTime(elapsed);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const replay = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    setEnded(false); setIsPlaying(false); setFilmTime(0);
    setTimeout(startFilm, 100);
  }, [startFilm]);

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    audioCtxRef.current?.close();
  }, []);

  const t = filmTime;

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none"
      style={{ background: "#000", cursor: isPlaying ? "none" : "default" }}>

      {isPlaying && (
        <>
          <Scene1Darkness t={t} />
          <Scene2Problem t={t} />
          <Scene3Freeze t={t} />
          <Scene4Transition t={t} />
          <Scene5Logo t={t} />
          <Scene6Queue t={t} />
          <Scene7Tracking t={t} />
          <Scene8AIEta t={t} />
          <Scene9Intelligence t={t} />
          <Scene10Ecosystem t={t} />
          <Scene11Final t={t} />
          <Vignette />
          <Grain />
        </>
      )}

      {/* Start screen */}
      <AnimatePresence>
        {!isPlaying && !ended && (
          <motion.div key="start"
            className="absolute inset-0 flex flex-col items-center justify-center gap-10"
            style={{ background: "#000" }}
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.6 } }}>
            <LogoMark size={56} glow />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'Geist', sans-serif", fontSize: "clamp(30px, 5vw, 60px)", fontWeight: 500, color: "#fff", letterSpacing: "0.18em", marginBottom: "10px" }}>
                ZEYVO
              </div>
              <div style={{ fontFamily: "'Geist', sans-serif", fontSize: "clamp(13px, 1.8vw, 18px)", fontWeight: 300, color: "rgba(255,255,255,0.35)", letterSpacing: "0.08em" }}>
                Building the future of waiting.
              </div>
            </div>
            <button onClick={startFilm} style={{
              fontFamily: "'Geist', sans-serif", fontSize: "13px", fontWeight: 400,
              color: BLUE, letterSpacing: "0.22em", textTransform: "uppercase",
              background: "transparent", border: `1px solid ${BLUE}50`,
              borderRadius: "8px", padding: "12px 32px", cursor: "pointer",
              transition: "all 0.2s ease",
            }}
              onMouseEnter={e => { (e.target as HTMLButtonElement).style.background = `${BLUE}15`; (e.target as HTMLButtonElement).style.borderColor = BLUE; }}
              onMouseLeave={e => { (e.target as HTMLButtonElement).style.background = "transparent"; (e.target as HTMLButtonElement).style.borderColor = `${BLUE}50`; }}>
              Watch Film
            </button>
            <div style={{ fontFamily: "'Geist', sans-serif", fontSize: "11px", fontWeight: 300, color: "rgba(255,255,255,0.18)", letterSpacing: "0.12em" }}>
              90 seconds · sound on recommended
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* End screen */}
      <AnimatePresence>
        {ended && (
          <motion.div key="end"
            className="absolute inset-0 flex flex-col items-center justify-center gap-8"
            style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(20px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 1, delay: 0.5 } }}>
            <LogoMark size={40} glow />
            <div style={{ fontFamily: "'Geist', sans-serif", fontSize: "clamp(13px, 2vw, 20px)", fontWeight: 300, color: "rgba(255,255,255,0.7)", letterSpacing: "0.06em", textAlign: "center", padding: "0 1rem" }}>
              Building the future of waiting.
            </div>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
              <a href="https://zeyvo.tech" style={{
                fontFamily: "'Geist', sans-serif", fontSize: "13px", fontWeight: 400,
                color: "#fff", letterSpacing: "0.18em", textTransform: "uppercase",
                textDecoration: "none", background: BLUE, borderRadius: "8px",
                padding: "12px 28px", display: "block",
              }}>zeyvo.tech</a>
              <button onClick={replay} style={{
                fontFamily: "'Geist', sans-serif", fontSize: "13px", fontWeight: 400,
                color: "rgba(255,255,255,0.55)", letterSpacing: "0.18em", textTransform: "uppercase",
                background: "transparent", border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "8px", padding: "12px 28px", cursor: "pointer",
              }}>Replay</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress bar */}
      {isPlaying && !ended && (
        <div className="absolute bottom-0 left-0 right-0" style={{ height: "2px", background: "rgba(255,255,255,0.05)" }}>
          <div style={{
            height: "100%", width: `${(t / DUR) * 100}%`,
            background: BLUE, boxShadow: `0 0 6px ${BLUE}`, transition: "none",
          }} />
        </div>
      )}

      <style>{`
        @keyframes float {
          0%,100%{transform:translateY(0)}
          50%{transform:translateY(-4px)}
        }
      `}</style>
    </div>
  );
}
