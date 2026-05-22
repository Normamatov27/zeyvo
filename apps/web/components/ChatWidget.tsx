"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { getStompClient } from "@/lib/realtime";

interface ChatMsg {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: string;
  content: string;
  sentAt: string;
}

type Channel = "support" | "org";
type View = "closed" | "menu" | "thread";

const ChatIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

export function ChatWidget({ orgId, orgName }: { orgId?: string; orgName?: string }) {
  const { userId, accessToken, _hydrated } = useAuthStore();
  const [view, setView] = useState<View>("closed");
  const [channel, setChannel] = useState<Channel>("support");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [convId, setConvId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const subRef = useRef<{ unsubscribe: () => void } | null>(null);

  // Subscribe to incoming chat messages via STOMP
  useEffect(() => {
    if (!_hydrated || !userId) return;
    const stomp = getStompClient(accessToken ?? undefined);
    const subscribe = () => {
      subRef.current = stomp.subscribe("/user/queue/chat", (msg) => {
        try {
          const payload = JSON.parse(msg.body) as ChatMsg & { type: string };
          if (payload.type === "chat.message") {
            setMessages((prev) => {
              if (prev.some((m) => m.id === payload.id)) return prev;
              return [...prev, payload];
            });
            if (view === "closed" || view === "menu") setUnread(true);
          }
        } catch {}
      });
    };
    if (stomp.connected) subscribe();
    else stomp.onConnect = subscribe;
    return () => { subRef.current?.unsubscribe(); };
  }, [_hydrated, userId, accessToken]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (view === "thread") endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, view]);

  async function openThread(ch: Channel) {
    setChannel(ch);
    setView("thread");
    setUnread(false);
    setMessages([]);
    try {
      const url = ch === "support" ? "/api/v1/chat/support" : `/api/v1/chat/orgs/${orgId}`;
      const data = await apiFetch<{ conversationId?: string; messages: ChatMsg[] }>(url);
      if (data.conversationId) setConvId(data.conversationId);
      setMessages(data.messages ?? []);
    } catch {}
  }

  async function send() {
    if (!input.trim() || sending) return;
    const content = input.trim();
    setInput("");
    setSending(true);
    try {
      const url = channel === "support"
        ? "/api/v1/chat/support/messages"
        : `/api/v1/chat/orgs/${orgId}/messages`;
      const msg = await apiFetch<ChatMsg>(url, {
        method: "POST",
        body: JSON.stringify({ content }),
      });
      setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
      if (msg.conversationId && !convId) setConvId(msg.conversationId);
    } catch {}
    setSending(false);
  }

  if (!_hydrated || !userId) return null;

  return (
    <>
      {/* Panel */}
      {view !== "closed" && (
        <div style={{
          position: "fixed", bottom: 140, right: 16, zIndex: 999,
          width: 320, maxHeight: 440,
          background: "var(--color-surface)", borderRadius: 16,
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          border: "1px solid var(--color-border)",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}>
          {/* Panel header */}
          <div style={{
            padding: "12px 14px", borderBottom: "1px solid var(--color-hairline)",
            display: "flex", alignItems: "center", gap: 8,
            background: "var(--color-surface)",
          }}>
            {view === "thread" && (
              <button onClick={() => setView("menu")} style={{
                width: 26, height: 26, borderRadius: 6, border: "1px solid var(--color-border)",
                background: "transparent", cursor: "pointer", color: "var(--color-fg-3)",
                display: "grid", placeItems: "center", flex: "none",
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
              </button>
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>
                {view === "menu" ? "Chat" : channel === "support" ? "Zeyvo Support" : (orgName ?? "Organisation")}
              </div>
              {view === "thread" && (
                <div style={{ fontSize: 10, color: "var(--color-fg-4)", fontFamily: "var(--font-mono)" }}>
                  {channel === "support" ? "Platform support" : "Organisation team"}
                </div>
              )}
            </div>
            <button onClick={() => setView("closed")} style={{
              width: 26, height: 26, borderRadius: 6, border: "1px solid var(--color-border)",
              background: "transparent", cursor: "pointer", color: "var(--color-fg-3)",
              display: "grid", placeItems: "center", flex: "none",
            }}>
              <CloseIcon/>
            </button>
          </div>

          {/* Menu view */}
          {view === "menu" && (
            <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              <button onClick={() => openThread("support")} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                borderRadius: 10, border: "1px solid var(--color-border)",
                background: "var(--color-surface-2)", cursor: "pointer", textAlign: "left",
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 8, flex: "none",
                  background: "var(--color-primary-soft)", color: "var(--color-primary)",
                  display: "grid", placeItems: "center", fontSize: 14, fontWeight: 700,
                }}>Z</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Zeyvo Support</div>
                  <div style={{ fontSize: 11, color: "var(--color-fg-3)", marginTop: 1 }}>Platform help & questions</div>
                </div>
              </button>
              {orgId && (
                <button onClick={() => openThread("org")} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                  borderRadius: 10, border: "1px solid var(--color-border)",
                  background: "var(--color-surface-2)", cursor: "pointer", textAlign: "left",
                }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 8, flex: "none",
                    background: "var(--color-accent-soft)", color: "var(--color-accent)",
                    display: "grid", placeItems: "center", fontSize: 14, fontWeight: 700,
                  }}>
                    {(orgName ?? "O").charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{orgName ?? "Organisation"}</div>
                    <div style={{ fontSize: 11, color: "var(--color-fg-3)", marginTop: 1 }}>Questions before booking</div>
                  </div>
                </button>
              )}
            </div>
          )}

          {/* Thread view */}
          {view === "thread" && (
            <>
              <div style={{ flex: 1, overflowY: "auto", padding: "12px 12px 8px", display: "flex", flexDirection: "column", gap: 8, minHeight: 200 }}>
                {messages.length === 0 && (
                  <div style={{ textAlign: "center", fontSize: 12, color: "var(--color-fg-4)", padding: "20px 0" }}>
                    No messages yet. Say hello!
                  </div>
                )}
                {messages.map((m) => {
                  const isMine = m.senderId === userId;
                  return (
                    <div key={m.id} style={{ display: "flex", justifyContent: isMine ? "flex-end" : "flex-start" }}>
                      <div style={{
                        maxWidth: "80%", padding: "8px 11px", borderRadius: isMine ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
                        background: isMine ? "var(--color-primary)" : "var(--color-surface-2)",
                        color: isMine ? "#fff" : "var(--color-fg)",
                        fontSize: 13, lineHeight: 1.45,
                      }}>
                        {m.content}
                      </div>
                    </div>
                  );
                })}
                <div ref={endRef}/>
              </div>
              <div style={{ padding: "8px 10px", borderTop: "1px solid var(--color-hairline)", display: "flex", gap: 8 }}>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="Type a message…"
                  style={{
                    flex: 1, padding: "8px 11px", borderRadius: 10,
                    border: "1px solid var(--color-border)", background: "var(--color-surface-2)",
                    fontSize: 13, color: "var(--color-fg)", outline: "none",
                  }}
                />
                <button onClick={send} disabled={!input.trim() || sending} style={{
                  width: 34, height: 34, borderRadius: 10, border: "none",
                  background: !input.trim() ? "var(--color-surface-3)" : "var(--color-primary)",
                  color: "#fff", cursor: input.trim() ? "pointer" : "not-allowed",
                  display: "grid", placeItems: "center", flex: "none",
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => {
          setUnread(false);
          setView((v) => v === "closed" ? "menu" : "closed");
        }}
        style={{
          position: "fixed", bottom: 80, right: 16, zIndex: 1000,
          width: 48, height: 48, borderRadius: "50%",
          background: "var(--color-primary)", color: "#fff",
          border: "none", cursor: "pointer",
          display: "grid", placeItems: "center",
          boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
        }}
      >
        {view !== "closed" ? <CloseIcon/> : <ChatIcon/>}
        {unread && view === "closed" && (
          <span style={{
            position: "absolute", top: 4, right: 4,
            width: 10, height: 10, borderRadius: "50%",
            background: "var(--color-success)",
            border: "2px solid var(--color-primary)",
          }}/>
        )}
      </button>
    </>
  );
}
