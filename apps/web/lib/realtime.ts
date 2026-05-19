import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

// WS must connect directly to backend (Next.js rewrites don't proxy WebSocket upgrades)
// SockJS requires http:// or https:// (not ws://wss://) — it handles the upgrade itself.
const RAW_WS = process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:8080";
const WS_URL = `${RAW_WS.replace(/^wss:\/\//, "https://").replace(/^ws:\/\//, "http://")}/api/ws`;

let client: Client | null = null;

export function getStompClient(token?: string): Client {
  if (client?.connected) return client;

  client = new Client({
    webSocketFactory: () => new SockJS(WS_URL),
    connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    reconnectDelay: 3000,
    onStompError: (frame) => {
      console.error("STOMP error", frame);
    },
  });

  client.activate();
  return client;
}

export function disconnectStomp() {
  client?.deactivate();
  client = null;
}

/** Subscribe to a branch queue topic */
export function subscribeBranchQueue(
  client: Client,
  branchId: string,
  callback: (event: unknown) => void
) {
  return client.subscribe(`/topic/branches/${branchId}/queue`, (msg) => {
    try {
      callback(JSON.parse(msg.body));
    } catch {
      // malformed message — ignore
    }
  });
}

/** Subscribe to ticket-specific updates */
export function subscribeTicket(
  client: Client,
  ticketId: string,
  callback: (event: unknown) => void
) {
  return client.subscribe(`/topic/tickets/${ticketId}`, (msg) => {
    try {
      callback(JSON.parse(msg.body));
    } catch {}
  });
}
