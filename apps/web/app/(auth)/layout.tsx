import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        .auth-shell {
          min-height: 100svh;
          display: flex;
          background: var(--color-bg);
        }
        .auth-left {
          display: none;
        }
        .auth-mobile-logo {
          display: block;
        }
        .auth-right {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px 24px;
        }
        .auth-right-inner {
          width: 100%;
          max-width: 400px;
        }
        @media (min-width: 900px) {
          .auth-left {
            display: flex;
            flex: 0 0 50%;
            flex-direction: column;
            justify-content: space-between;
            padding: 64px;
            background: linear-gradient(135deg, var(--color-bg) 0%, var(--color-surface) 100%);
            border-right: 1px solid var(--color-hairline);
            position: relative;
            overflow: hidden;
          }
          .auth-mobile-logo {
            display: none;
          }
        }
      `}</style>

      <div className="auth-shell">
        {/* Left decorative panel — desktop only */}
        <div className="auth-left">
          {/* Wordmark */}
          <div style={{
            fontSize: 20, fontWeight: 700, letterSpacing: -0.8,
            color: "var(--color-primary)",
          }}>
            zeyvo
          </div>

          {/* Tagline */}
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{
              fontSize: 40, fontWeight: 500, letterSpacing: -1.5,
              lineHeight: 1.05, maxWidth: 420,
            }}>
              Ship your queue from{" "}
              <span style={{ color: "var(--color-primary)" }}>paper</span>
              {" "}to{" "}
              <span style={{ color: "var(--color-accent)" }}>realtime</span>.
            </div>
            <p style={{
              fontSize: 14, color: "var(--color-fg-2)",
              maxWidth: 360, lineHeight: 1.55, marginTop: 18,
            }}>
              Set up a branch in 15 minutes. We'll guide you through services,
              windows and notifications.
            </p>
          </div>

          {/* Version label */}
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: 11,
            color: "var(--color-fg-3)",
          }}>
            tashkent · v0.1
          </div>

          {/* Decorative chart */}
          <div style={{
            position: "absolute", right: -40, bottom: 80,
            opacity: 0.3, width: 400, height: 240,
            pointerEvents: "none",
          }}>
            <svg viewBox="0 0 400 240" style={{ width: "100%", height: "100%" }}>
              <defs>
                <linearGradient id="auth-grad-1" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0"/>
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="1"/>
                </linearGradient>
                <linearGradient id="auth-grad-2" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0"/>
                  <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="1"/>
                </linearGradient>
              </defs>
              <path
                d="M0 200 C 60 180, 100 160, 140 150 S 220 130, 260 110 S 360 70, 400 60"
                fill="none" stroke="url(#auth-grad-1)" strokeWidth="2"
              />
              <path
                d="M0 220 C 60 200, 100 190, 140 180 S 220 150, 260 140 S 360 110, 400 100"
                fill="none" stroke="url(#auth-grad-2)" strokeWidth="2"
              />
            </svg>
          </div>
        </div>

        {/* Right form panel */}
        <div className="auth-right" style={{ position: "relative" }}>
          {/* Theme + locale floating top-right */}
          <div style={{
            position: "absolute", top: 16, right: 16, display: "flex", gap: 8, zIndex: 1,
          }}>
            <ThemeToggle compact/>
            <LocaleSwitcher compact/>
          </div>
          <div className="auth-right-inner">
            {/* Logo shown on mobile only */}
            <div className="auth-mobile-logo" style={{ textAlign: "center", marginBottom: 36 }}>
              <div style={{
                fontSize: 28, fontWeight: 700, letterSpacing: -1,
                color: "var(--color-primary)",
              }}>
                zeyvo
              </div>
              <div style={{ fontSize: 13, color: "var(--color-fg-3)", marginTop: 4 }}>
                Queue management platform
              </div>
            </div>

            {children}
          </div>
        </div>
      </div>
    </>
  );
}
