"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { getStompClient, onStompConnect } from "@/lib/realtime";

interface Conversation {
  id: string;
  customerId: string;
  type: string;
  orgId: string | null;
  status: string;
  updatedAt: string;
}

interface ChatMsg {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: string;
  content: string;
  sentAt: string;
}

const ROLE_COLOR: Record<string, string> = {
  customer: "var(--color-fg-3)",
  operator: "var(--color-primary)",
  manager: "var(--color-accent)",
  org_admin: "var(--color-warning)",
  super_admin: "var(--color-danger)",
};

export default function AdminChatPage() {
  const { roles, accessToken, orgId } = useAuthStore();
  const isSuper = roles.includes("super_admin");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);
  const subRef = useRef<{ unsubscribe: () => void } | null>(null);

  const loadConversations = useCallback(async () => {
    try {
      const list = await apiFetch<Conversation[]>("/api/v1/chat/admin/conversations");
      setConversations(list);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // Subscribe to relevant STOMP topic
  useEffect(() => {
    const stomp = getStompClient(accessToken ?? undefined);
    const topic = isSuper
      ? "/topic/chat/support"
      : orgId ? `/topic/chat/org/${orgId}` : null;
    if (!topic) return;
    const subscribe = () => {
      subRef.current = stomp.subscribe(topic!, (msg) => {
        try {
          const payload = JSON.parse(msg.body) as ChatMsg & { type: string };
          if (payload.type === "chat.message") {
            setMessages((prev) => {
              if (selected?.id === payload.conversationId && !prev.some((m) => m.id === payload.id)) {
                return [...prev, payload];
              }
              return prev;
            });
            loadConversations();
          }
        } catch {}
      });
    };
    const unsub = onStompConnect(subscribe);
    return () => { unsub(); subRef.current?.unsubscribe(); };
  }, [accessToken, isSuper, orgId, selected?.id, loadConversations]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function selectConversation(conv: Conversation) {
    setSelected(conv);
    setMessages([]);
    try {
      const msgs = await apiFetch<ChatMsg[]>(`/api/v1/chat/admin/conversations/${conv.id}/messages`);
      setMessages(msgs);
    } catch {}
  }

  async function send() {
    if (!input.trim() || sending || !selected) return;
    const content = input.trim();
    setInput("");
    setSending(true);
    try {
      const msg = await apiFetch<ChatMsg>(`/api/v1/chat/admin/conversations/${selected.id}/messages`, {
        method: "POST",
        body: JSON.stringify({ content }),
      });
      setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
    } catch {}
    setSending(false);
  }

  async function closeConv() {
    if (!selected) return;
    try {
      await apiFetch(`/api/v1/chat/admin/conversations/${selected.id}/close`, { method: "POST" });
      setSelected(null);
      setMessages([]);
      loadConversations();
    } catch {}
  }

  const fmtTime = (ts: string) =>
    new Date(ts).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  return (
    <div style={{ display: "flex", height: "100%" }}>
      {/* Sidebar — conversation list */}
      <div style={{
        width: 280, flexShrink: 0,
        borderRight: "1px solid var(--color-hairline)",
        display: "flex", flexDirection: "column",
        background: "var(--color-surface)",
      }}>
        <div style={{
          height: 56, padding: "0 18px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: "1px solid var(--color-hairline)",
        }}>
          <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: -0.2 }}>
            {isSuper ? "Support inbox" : "Customer chat"}
          </span>
          <span style={{
            fontSize: 10, fontFamily: "var(--font-mono)",
            background: "var(--color-primary-soft)", color: "var(--color-primary)",
            padding: "2px 7px", borderRadius: 999, fontWeight: 600,
          }}>
            {conversations.filter((c) => c.status === "open").length} open
          </span>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading && (
            <div style={{ padding: 20, textAlign: "center", fontSize: 12, color: "var(--color-fg-3)" }}>
              Loading…
            </div>
          )}
          {!loading && conversations.length === 0 && (
            <div style={{ padding: 20, textAlign: "center", fontSize: 12, color: "var(--color-fg-3)" }}>
              No open conversations
            </div>
          )}
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => selectConversation(c)}
              style={{
                width: "100%", textAlign: "left", cursor: "pointer",
                padding: "12px 16px",
                borderBottom: "1px solid var(--color-hairline)",
                background: selected?.id === c.id ? "var(--color-primary-soft)" : "transparent",
                border: "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, flex: "none",
                  background: "var(--color-primary-soft)", color: "var(--color-primary)",
                  display: "grid", placeItems: "center", fontSize: 13, fontWeight: 700,
                }}>
                  {c.customerId.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.customerId.slice(0, 8)}…
                  </div>
                  <div style={{ fontSize: 10.5, color: "var(--color-fg-3)", marginTop: 1, fontFamily: "var(--font-mono)" }}>
                    {c.type} · {fmtTime(c.updatedAt)}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main — thread */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {!selected ? (
          <div style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--color-fg-3)", fontSize: 13,
          }}>
            Select a conversation to reply
          </div>
        ) : (
          <>
            {/* Thread header */}
            <div style={{
              height: 56, padding: "0 20px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              borderBottom: "1px solid var(--color-hairline)",
              background: "var(--color-surface)", flexShrink: 0,
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Customer {selected.customerId.slice(0, 8)}</div>
                <div style={{ fontSize: 11, color: "var(--color-fg-3)", fontFamily: "var(--font-mono)" }}>
                  {selected.type} conversation
                </div>
              </div>
              <button onClick={closeConv} style={{
                padding: "5px 12px", borderRadius: 7, fontSize: 11, fontWeight: 600,
                border: "1.5px solid var(--color-border)", background: "transparent",
                color: "var(--color-fg-3)", cursor: "pointer",
              }}>
                Close chat
              </button>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
              {messages.length === 0 && (
                <div style={{ textAlign: "center", fontSize: 12, color: "var(--color-fg-4)", padding: "30px 0" }}>
                  No messages yet
                </div>
              )}
              {messages.map((m) => {
                const isAdmin = m.senderRole !== "customer";
                return (
                  <div key={m.id} style={{ display: "flex", justifyContent: isAdmin ? "flex-end" : "flex-start", flexDirection: "column", alignItems: isAdmin ? "flex-end" : "flex-start", gap: 3 }}>
                    {!isAdmin && (
                      <span style={{ fontSize: 10, color: "var(--color-fg-4)", fontFamily: "var(--font-mono)", paddingLeft: 4 }}>
                        customer · {fmtTime(m.sentAt)}
                      </span>
                    )}
                    <div style={{
                      maxWidth: "70%", padding: "9px 13px",
                      borderRadius: isAdmin ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                      background: isAdmin ? "var(--color-primary)" : "var(--color-surface-2)",
                      color: isAdmin ? "#fff" : "var(--color-fg)",
                      fontSize: 13, lineHeight: 1.5,
                    }}>
                      {m.content}
                    </div>
                    {isAdmin && (
                      <span style={{ fontSize: 10, color: "var(--color-fg-4)", fontFamily: "var(--font-mono)", paddingRight: 4 }}>
                        <span style={{ color: ROLE_COLOR[m.senderRole] ?? "var(--color-fg-3)" }}>{m.senderRole}</span>
                        {" · "}{fmtTime(m.sentAt)}
                      </span>
                    )}
                  </div>
                );
              })}
              <div ref={endRef}/>
            </div>

            {/* Reply input */}
            <div style={{
              padding: "12px 20px",
              borderTop: "1px solid var(--color-hairline)",
              display: "flex", gap: 10,
              background: "var(--color-surface)", flexShrink: 0,
            }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Type a reply…"
                style={{
                  flex: 1, padding: "9px 13px", borderRadius: 10,
                  border: "1px solid var(--color-border)", background: "var(--color-surface-2)",
                  fontSize: 13, color: "var(--color-fg)", outline: "none",
                }}
              />
              <button onClick={send} disabled={!input.trim() || sending} style={{
                padding: "9px 18px", borderRadius: 10, border: "none",
                background: !input.trim() ? "var(--color-surface-3)" : "var(--color-primary)",
                color: "#fff", fontSize: 13, fontWeight: 600,
                cursor: input.trim() ? "pointer" : "not-allowed",
              }}>
                {sending ? "…" : "Send"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
