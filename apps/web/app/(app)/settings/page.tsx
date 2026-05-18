"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import { useUiStore } from "@/stores/ui";
import { apiFetch } from "@/lib/api";

type Theme = "light" | "dark" | "system";

const THEME_OPTIONS: { value: Theme; label: string; icon: string }[] = [
  { value: "light", label: "Light", icon: "☀️" },
  { value: "system", label: "System", icon: "💻" },
  { value: "dark", label: "Dark", icon: "🌙" },
];

interface UserProfile {
  id: string;
  fullName: string | null;
  phone: string | null;
  telegramId: number | null;
  locale: string;
}

interface LinkTelegramResponse {
  code: string;
  botUrl: string;
  expiresInSeconds: string;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-fg-3)",
        textTransform: "uppercase", letterSpacing: 0.6, fontFamily: "var(--font-mono)",
        marginBottom: 8 }}>
        {title}
      </div>
      <div style={{
        background: "var(--color-surface)", border: "1px solid var(--color-border)",
        borderRadius: 14, overflow: "hidden",
      }}>
        {children}
      </div>
    </div>
  );
}

function Row({ label, value, danger, accent, onClick, last }: {
  label: string; value?: string; danger?: boolean; accent?: boolean;
  onClick?: () => void; last?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      style={{
        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "13px 16px", background: "none", border: "none",
        borderBottom: last ? "none" : "1px solid var(--color-hairline)",
        cursor: onClick ? "pointer" : "default", textAlign: "left",
      }}
    >
      <span style={{
        fontSize: 14,
        color: danger ? "var(--color-danger)"
          : accent ? "var(--color-primary)"
          : "var(--color-fg)",
        fontWeight: 500,
      }}>
        {label}
      </span>
      {value && (
        <span style={{ fontSize: 13, color: "var(--color-fg-3)", fontFamily: "var(--font-mono)" }}>
          {value}
        </span>
      )}
    </button>
  );
}

function LinkTelegramModal({
  onClose, onLinked,
}: { onClose: () => void; onLinked: () => void }) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [data, setData] = useState<LinkTelegramResponse | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    apiFetch<LinkTelegramResponse>("/api/v1/me/link-telegram/init", { method: "POST" })
      .then((d) => { setData(d); setState("ready"); })
      .catch(() => setState("error"));
  }, []);

  function copy() {
    if (data) {
      navigator.clipboard.writeText(data.code).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
      zIndex: 100, padding: "0 16px 24px",
    }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--color-surface)", borderRadius: 20, padding: 20,
          width: "100%", maxWidth: 440,
          display: "flex", flexDirection: "column", gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.3 }}>Link Telegram</div>
          <button onClick={onClose} style={{
            width: 30, height: 30, borderRadius: 8, border: "1px solid var(--color-border)",
            background: "var(--color-surface-2)", cursor: "pointer", color: "var(--color-fg-3)",
            display: "grid", placeItems: "center",
          }}>✕</button>
        </div>

        {state === "loading" && (
          <div style={{ textAlign: "center", padding: 20, color: "var(--color-fg-3)", fontSize: 13 }}>
            Generating link code…
          </div>
        )}

        {state === "error" && (
          <div style={{ color: "var(--color-danger)", fontSize: 13, padding: "8px 0" }}>
            Failed to generate code. Sign in and try again.
          </div>
        )}

        {state === "ready" && data && (
          <>
            <div style={{ fontSize: 13, color: "var(--color-fg-2)", lineHeight: 1.6 }}>
              Open the bot and tap <strong>Start</strong> — it will link your account automatically.
            </div>

            {/* Code display */}
            <div style={{
              background: "var(--color-surface-2)", border: "1px solid var(--color-border)",
              borderRadius: 12, padding: "14px 16px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 700, letterSpacing: 2,
              }}>{data.code}</span>
              <button onClick={copy} style={{
                padding: "6px 12px", borderRadius: 8, border: "1px solid var(--color-border)",
                background: "transparent", cursor: "pointer", fontSize: 12,
                color: copied ? "var(--color-success)" : "var(--color-fg-3)",
              }}>
                {copied ? "Copied ✓" : "Copy"}
              </button>
            </div>

            <div style={{ fontSize: 12, color: "var(--color-fg-3)", textAlign: "center" }}>
              Code expires in 10 minutes
            </div>

            <a
              href={data.botUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "14px 0", borderRadius: 14, border: "none",
                background: "oklch(0.46 0.17 229)", color: "#fff",
                fontSize: 15, fontWeight: 600, textDecoration: "none",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8l-1.68 7.92c-.12.56-.44.7-.88.44l-2.44-1.8-1.18 1.14c-.12.12-.24.16-.48.16l.16-2.4 4.28-3.88c.18-.16-.04-.24-.28-.08L8.32 14.5l-2.4-.74c-.52-.16-.52-.52.12-.78l9.36-3.6c.44-.16.82.1.64.78v-.36z"/>
              </svg>
              Open @zeyvo_bot
            </a>

            <button onClick={onLinked} style={{
              padding: "12px 0", borderRadius: 12, border: "1.5px solid var(--color-border)",
              background: "transparent", color: "var(--color-fg-2)", fontSize: 13, cursor: "pointer",
            }}>
              Done — I sent the code
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { roles, clear } = useAuthStore();
  const { theme, setTheme } = useUiStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [savingName, setSavingName] = useState(false);

  function loadProfile() {
    apiFetch<UserProfile>("/api/v1/me").then(setProfile).catch(() => {});
  }

  useEffect(() => { loadProfile(); }, []);

  async function saveName() {
    if (!nameInput.trim() || savingName) return;
    setSavingName(true);
    try {
      await apiFetch("/api/v1/me", {
        method: "PATCH",
        body: JSON.stringify({ fullName: nameInput.trim() }),
      });
      await loadProfile();
      setEditingName(false);
    } catch {}
    setSavingName(false);
  }

  function signOut() {
    clear();
    router.replace("/sign-in");
  }

  const isAdmin = roles.some((r) =>
    ["operator", "manager", "org_admin", "super_admin"].includes(r)
  );

  const tgLinked = profile?.telegramId != null;

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
      <div style={{
        padding: "16px 16px 12px",
        borderBottom: "1px solid var(--color-hairline)",
        background: "var(--color-bg)",
        position: "sticky", top: 0, zIndex: 5,
      }}>
        <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: -0.3 }}>Settings</div>
      </div>

      <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Account */}
        <Section title="Account">
          {/* Name row — inline editable */}
          {editingName ? (
            <div style={{
              padding: "12px 16px", borderBottom: "1px solid var(--color-hairline)",
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <input
                autoFocus
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false); }}
                placeholder="Your name"
                style={{
                  flex: 1, padding: "6px 10px", borderRadius: 8,
                  border: "1.5px solid var(--color-primary)", outline: "none",
                  background: "var(--color-surface-2)", color: "var(--color-fg)", fontSize: 14,
                }}
              />
              <button onClick={saveName} disabled={savingName} style={{
                padding: "6px 12px", borderRadius: 8, border: "none",
                background: "var(--color-primary)", color: "#fff",
                fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}>
                {savingName ? "…" : "Save"}
              </button>
              <button onClick={() => setEditingName(false)} style={{
                padding: "6px 10px", borderRadius: 8,
                border: "1px solid var(--color-border)", background: "transparent",
                color: "var(--color-fg-3)", fontSize: 13, cursor: "pointer",
              }}>
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setNameInput(profile?.fullName ?? ""); setEditingName(true); }}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "13px 16px", background: "none", border: "none",
                borderBottom: "1px solid var(--color-hairline)", cursor: "pointer", textAlign: "left",
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 500, color: "var(--color-fg)" }}>Name</span>
              <span style={{ fontSize: 13, color: "var(--color-fg-3)", fontFamily: "var(--font-mono)",
                display: "flex", alignItems: "center", gap: 6 }}>
                {profile?.fullName ?? "Add name"}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </span>
            </button>
          )}
          {profile?.phone && <Row label="Phone" value={profile.phone} />}
          <Row
            label={tgLinked ? "Telegram" : "Link Telegram"}
            value={tgLinked ? "Linked ✓" : "Link for notifications →"}
            accent={!tgLinked}
            onClick={tgLinked ? undefined : () => setShowLinkModal(true)}
          />
          <Row label="Role" value={roles.join(", ") || "customer"} />
          {isAdmin && (
            <Row
              label="Admin panel"
              value="Open →"
              onClick={() => router.push("/admin/overview")}
            />
          )}
          <Row label="Sign out" danger last onClick={signOut} />
        </Section>

        {/* Appearance */}
        <Section title="Appearance">
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--color-hairline)" }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: "var(--color-fg)", marginBottom: 10 }}>
              Theme
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {THEME_OPTIONS.map((opt) => {
                const active = theme === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setTheme(opt.value)}
                    style={{
                      flex: 1, padding: "10px 0", borderRadius: 10,
                      border: active ? "2px solid var(--color-primary)" : "1.5px solid var(--color-border)",
                      background: active ? "var(--color-primary-soft)" : "var(--color-surface-2)",
                      color: active ? "var(--color-primary)" : "var(--color-fg-2)",
                      fontSize: 12, fontWeight: active ? 600 : 400,
                      cursor: "pointer", display: "flex", flexDirection: "column",
                      alignItems: "center", gap: 4, transition: "all 0.15s",
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{opt.icon}</span>
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
          <Row label="Language" value="O'zbek (UZ)" last />
        </Section>

        {/* About */}
        <Section title="About">
          <Row label="Version" value="0.1.0-mvp" />
          <Row label="zeyvo" value="queue management OS" last />
        </Section>
      </div>

      {showLinkModal && (
        <LinkTelegramModal
          onClose={() => setShowLinkModal(false)}
          onLinked={() => {
            setShowLinkModal(false);
            loadProfile();
          }}
        />
      )}
    </div>
  );
}
