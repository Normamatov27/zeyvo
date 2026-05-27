"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { getStompClient } from "@/lib/realtime";

interface Conversation {
  id: string;
  customerId: string;
  type: string;
  orgId: string | null;
  status: string;
  updatedAt: string;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: string;
  content: string;
  sentAt: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return Math.floor(diff / 60_000) + "m ago";
  if (diff < 86_400_000) return Math.floor(diff / 3_600_000) + "h ago";
  return Math.floor(diff / 86_400_000) + "d ago";
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export default function PlatformChatPage() {
  const { accessToken, userId, _hydrated } = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const subRef = useRef<{ unsubscribe: () => void } | null>(null);

  const selectedIdRef = useRef<string | null>(null);
  useEffect(() => {
    selectedIdRef.current = selected?.id ?? null;
  }, [selected]);

  function loadConversations() {
    setLoadingConvs(true);
    apiFetch<Conversation[]>("/api/v1/chat/admin/conversations")
      .then(setConversations)
      .catch(() => setConversations([]))
      .finally(() => setLoadingConvs(false));
  }

  useEffect(() => { loadConversations(); }, []);

  // WebSocket subscription for live support chat updates
  useEffect(() => {
    if (!_hydrated || !userId) return;
    const stomp = getStompClient(accessToken ?? undefined);
    const subscribe = () => {
      subRef.current = stomp.subscribe("/topic/chat/support", (msg) => {
        try {
          const payload = JSON.parse(msg.body) as Message & { type: string };
          if (payload.type === "chat.message") {
            // 1. If message belongs to current selected conversation, append it
            if (payload.conversationId === selectedIdRef.current) {
              setMessages((prev) => {
                if (prev.some((m) => m.id === payload.id)) return prev;
                return [...prev, payload];
              });
            }

            // 2. Update conversation list sidebar
            setConversations((prev) => {
              const exists = prev.some((c) => c.id === payload.conversationId);
              if (!exists) {
                // New support chat initiated by customer: fetch current list from API
                apiFetch<Conversation[]>("/api/v1/chat/admin/conversations")
                  .then(setConversations)
                  .catch(() => {});
                return prev;
              }
              // Move existing conversation to top and update activity time
              return prev
                .map((c) =>
                  c.id === payload.conversationId
                    ? { ...c, updatedAt: payload.sentAt }
                    : c
                )
                .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
            });
          }
        } catch (e) {
          console.error("STOMP parse error", e);
        }
      });
    };

    if (stomp.connected) subscribe();
    else stomp.onConnect = subscribe;

    return () => {
      subRef.current?.unsubscribe();
    };
  }, [_hydrated, userId, accessToken]);

  useEffect(() => {
    if (!selected) return;
    setLoadingMsgs(true);
    apiFetch<Message[]>(`/api/v1/chat/admin/conversations/${selected.id}/messages`)
      .then(setMessages)
      .catch(() => setMessages([]))
      .finally(() => setLoadingMsgs(false));
  }, [selected]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendReply() {
    if (!selected || !reply.trim()) return;
    setSending(true);
    try {
      const msg = await apiFetch<Message>(
        `/api/v1/chat/admin/conversations/${selected.id}/messages`,
        { method: "POST", body: JSON.stringify({ content: reply.trim() }) }
      );
      setMessages((prev) => [...prev, msg]);
      setReply("");
    } catch (e: any) {
      alert(e?.message ?? "Failed to send");
    } finally {
      setSending(false);
    }
  }

  async function closeConversation() {
    if (!selected) return;
    setClosing(true);
    try {
      await apiFetch(`/api/v1/chat/admin/conversations/${selected.id}/close`, { method: "POST" });
      setConversations((prev) => prev.filter((c) => c.id !== selected.id));
      setSelected(null);
      setMessages([]);
    } catch (e: any) {
      alert(e?.message ?? "Failed to close");
    } finally {
      setClosing(false);
    }
  }

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* Conversation list */}
      <div style={{
        width: 280, flexShrink: 0,
        borderRight: "1px solid var(--color-hairline)",
        display: "flex", flexDirection: "column",
        background: "var(--color-surface)",
      }}>
        <div style={{
          height: 56, padding: "0 18px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: "1px solid var(--color-hairline)", flexShrink: 0,
        }}>
          <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: -0.3 }}>Support chat</span>
          <button onClick={loadConversations} style={{
            padding: "4px 10px", borderRadius: 6,
            border: "1px solid var(--color-border)",
            background: "transparent", color: "var(--color-fg-3)",
            fontSize: 11, cursor: "pointer",
          }}>Refresh</button>
        </div>

        <div style={{ flex: 1, overflow: "auto" }}>
          {loadingConvs ? (
            [1, 2, 3].map((i) => (
              <div key={i} style={{
                height: 64, margin: "8px 10px", borderRadius: 10,
                background: "var(--color-surface-2)",
              }}/>
            ))
          ) : conversations.length === 0 ? (
            <div style={{ padding: "40px 18px", textAlign: "center", color: "var(--color-fg-4)", fontSize: 13 }}>
              No open conversations
            </div>
          ) : conversations.map((c) => {
            const isSelected = selected?.id === c.id;
            return (
              <button key={c.id} onClick={() => setSelected(c)} style={{
                width: "100%", textAlign: "left",
                padding: "12px 16px",
                background: isSelected ? "oklch(0.16 0.06 25)" : "transparent",
                border: "none", cursor: "pointer",
                borderBottom: "1px solid var(--color-hairline)",
                display: "flex", flexDirection: "column", gap: 4,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "space-between" }}>
                  <span style={{
                    fontSize: 12, fontWeight: 600,
                    color: isSelected ? "oklch(0.78 0.14 25)" : "var(--color-fg)",
                    fontFamily: "var(--font-mono)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    maxWidth: 140,
                  }}>
                    {c.customerId.slice(0, 8)}…
                  </span>
                  <span style={{
                    fontSize: 10, color: "var(--color-fg-4)",
                    fontFamily: "var(--font-mono)", flexShrink: 0,
                  }}>
                    {timeAgo(c.updatedAt)}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "var(--color-fg-3)" }}>
                  {c.type} support
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Message panel */}
      {!selected ? (
        <div style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          flexDirection: "column", gap: 12, color: "var(--color-fg-4)",
        }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <div style={{ fontSize: 13 }}>Select a conversation</div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Header */}
          <div style={{
            height: 56, padding: "0 20px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            borderBottom: "1px solid var(--color-hairline)",
            background: "var(--color-surface)", flexShrink: 0,
          }}>
            <div>
              <span style={{ fontSize: 14, fontWeight: 600, fontFamily: "var(--font-mono)" }}>
                {selected.customerId.slice(0, 8)}…
              </span>
              <span style={{
                marginLeft: 8, fontSize: 11, color: "var(--color-fg-3)",
                padding: "2px 7px", borderRadius: 999,
                background: "var(--color-surface-2)",
              }}>
                {selected.type} · {selected.status}
              </span>
            </div>
            <button onClick={closeConversation} disabled={closing} style={{
              padding: "6px 14px", borderRadius: 8,
              border: "1px solid var(--color-danger-soft)",
              background: "var(--color-danger-soft)", color: "var(--color-danger)",
              fontSize: 12, fontWeight: 600, cursor: closing ? "not-allowed" : "pointer",
            }}>
              {closing ? "Closing…" : "Close conversation"}
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflow: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
            {loadingMsgs ? (
              <div style={{ textAlign: "center", color: "var(--color-fg-4)", fontSize: 13, paddingTop: 40 }}>
                Loading messages…
              </div>
            ) : messages.length === 0 ? (
              <div style={{ textAlign: "center", color: "var(--color-fg-4)", fontSize: 13, paddingTop: 40 }}>
                No messages yet.
              </div>
            ) : messages.map((m) => {
              const isAdmin = m.senderRole !== "customer";
              return (
                <div key={m.id} style={{
                  display: "flex",
                  justifyContent: isAdmin ? "flex-end" : "flex-start",
                }}>
                  <div style={{ maxWidth: "70%" }}>
                    <div style={{
                      padding: "10px 14px", borderRadius: isAdmin ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                      background: isAdmin ? "oklch(0.58 0.2 25)" : "var(--color-surface)",
                      border: isAdmin ? "none" : "1px solid var(--color-border)",
                      color: isAdmin ? "#fff" : "var(--color-fg)",
                      fontSize: 13, lineHeight: 1.5,
                    }}>
                      {m.content}
                    </div>
                    <div style={{
                      fontSize: 10, color: "var(--color-fg-4)",
                      marginTop: 4, fontFamily: "var(--font-mono)",
                      textAlign: isAdmin ? "right" : "left",
                    }}>
                      {m.senderRole} · {formatTime(m.sentAt)}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef}/>
          </div>

          {/* Reply input */}
          <div style={{
            padding: "12px 16px",
            borderTop: "1px solid var(--color-hairline)",
            background: "var(--color-surface)",
            display: "flex", gap: 8, flexShrink: 0,
          }}>
            <input
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
              placeholder="Type a reply…"
              style={{
                flex: 1, padding: "10px 14px", borderRadius: 10,
                border: "1px solid var(--color-border)",
                background: "var(--color-surface-2)",
                color: "var(--color-fg)", fontSize: 13, outline: "none",
              }}
            />
            <button
              onClick={sendReply}
              disabled={sending || !reply.trim()}
              style={{
                padding: "10px 18px", borderRadius: 10, border: "none",
                background: reply.trim() ? "oklch(0.58 0.2 25)" : "var(--color-fg-4)",
                color: "#fff", fontSize: 13, fontWeight: 600,
                cursor: sending || !reply.trim() ? "not-allowed" : "pointer",
                flexShrink: 0,
              }}
            >
              {sending ? "…" : "Send"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
