import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

// SockJS requires http/https, not ws/wss — it handles the upgrade itself
const RAW_WS = process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:8080";
const WS_URL = `${RAW_WS.replace(/^wss:\/\//, "https://").replace(/^ws:\/\//, "http://")}/api/ws`;

type ConnectionListener = (state: "connected" | "reconnecting" | "offline") => void;

let client: Client | null = null;
// Connect callbacks registered by multiple components — all fired on every (re)connect
const connectCallbacks = new Set<() => void>();
const connectionListeners = new Set<ConnectionListener>();

function notifyListeners(state: "connected" | "reconnecting" | "offline") {
  connectionListeners.forEach((l) => l(state));
}

export function getStompClient(token?: string): Client {
  if (client) return client;

  client = new Client({
    webSocketFactory: () => new SockJS(WS_URL),
    connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    // Exponential backoff: 3s, 6s, 12s, max 30s
    reconnectDelay: 3000,
    onConnect: () => {
      notifyListeners("connected");
      connectCallbacks.forEach((cb) => cb());
    },
    onDisconnect: () => {
      notifyListeners("reconnecting");
    },
    onStompError: (frame) => {
      console.error("[realtime] STOMP error", frame.headers?.message);
      notifyListeners("offline");
    },
    onWebSocketError: () => {
      notifyListeners("reconnecting");
    },
  });

  client.activate();
  return client;
}

export function disconnectStomp() {
  client?.deactivate();
  connectCallbacks.clear();
  client = null;
}

/**
 * Register a callback that runs immediately if already connected,
 * and again on every subsequent reconnect. Returns an unregister function.
 *
 * This replaces the old `stomp.onConnect = fn` pattern which allowed only
 * one handler and caused components to overwrite each other.
 */
export function onStompConnect(cb: () => void): () => void {
  const stomp = getStompClient();
  connectCallbacks.add(cb);
  if (stomp.connected) cb();
  return () => connectCallbacks.delete(cb);
}

/** Subscribe to connection state changes */
export function onConnectionStateChange(listener: ConnectionListener): () => void {
  connectionListeners.add(listener);
  // Emit current state immediately
  if (client?.connected) listener("connected");
  else if (client) listener("reconnecting");
  return () => connectionListeners.delete(listener);
}

/** Subscribe to a branch queue topic. Auto-resubscribes on reconnect. */
export function subscribeBranchQueue(
  branchId: string,
  callback: (event: unknown) => void
): () => void {
  let sub: { unsubscribe: () => void } | null = null;

  const sub_fn = () => {
    sub?.unsubscribe();
    sub = getStompClient().subscribe(`/topic/branches/${branchId}/queue`, (msg) => {
      try { callback(JSON.parse(msg.body)); } catch {}
    });
  };

  const unsub_connect = onStompConnect(sub_fn);

  return () => {
    unsub_connect();
    sub?.unsubscribe();
  };
}

/** Subscribe to ticket-specific updates. Auto-resubscribes on reconnect. */
export function subscribeTicket(
  ticketId: string,
  callback: (event: unknown) => void
): () => void {
  let sub: { unsubscribe: () => void } | null = null;

  const sub_fn = () => {
    sub?.unsubscribe();
    sub = getStompClient().subscribe(`/topic/tickets/${ticketId}`, (msg) => {
      try { callback(JSON.parse(msg.body)); } catch {}
    });
  };

  const unsub_connect = onStompConnect(sub_fn);

  return () => {
    unsub_connect();
    sub?.unsubscribe();
  };
}
