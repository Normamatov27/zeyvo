// API response types — mirroring backend DTO records

export interface Org {
  id: string;
  name: string;
  slug: string;
  plan: string;
  branchCount: number;
}

export interface Branch {
  id: string;
  organizationId: string;
  orgName: string | null;
  slug: string;
  name: string;
  shortName: string | null;
  type: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  timezone: string;
  capacity: number;
  active: boolean;
  activeTickets: number;
  openWindows: number;
  avgServiceS: number;
}

export interface Service {
  id: string;
  branchId: string;
  code: string;
  name: string;
  avgDurationS: number;
  priority: number;
  active: boolean;
  displayOrder: number;
}

export interface WindowDesk {
  id: string;
  branchId: string;
  number: number;
  label: string | null;
  status: "open" | "idle" | "closed" | "paused";
  operatorId: string | null;
  servingTicket: string | null;
  serviceCodes: string[];
}

export interface BranchDetail extends Branch {
  services: Service[];
  windows: WindowDesk[];
  activeTickets: number;
}

export type TicketStatus =
  | "waiting"
  | "called"
  | "serving"
  | "served"
  | "no_show"
  | "cancelled"
  | "expired"
  | "transferred";

export interface Ticket {
  id: string;
  number: string;
  branchId: string;
  serviceId: string;
  source: string;
  status: TicketStatus;
  priority: number;
  joinedAt: string;
  calledAt: string | null;
  servingAt: string | null;
  servedAt: string | null;
  windowId: string | null;
  windowNumber: number | null;
  etaMinutes: number | null;
  queuePosition: number | null;
  // enriched by GET /tickets/{id}
  serviceName: string | null;
  branchName: string | null;
  windowLabel: string | null;
  ratingStars: number | null;
}

export type AppointmentStatus = "booked" | "cancelled" | "no_show" | "served";

export interface Appointment {
  id: string;
  branchId: string;
  serviceId: string;
  customerId: string;
  scheduledAt: string;
  durationSeconds: number;
  status: AppointmentStatus;
  ticketId: string | null;
  notes: string | null;
  createdAt: string;
  branchName: string | null;
  serviceName: string | null;
}

export interface SlotInfo {
  time: string;
  available: boolean;
}

export type LoadLevel = "low" | "medium" | "high";

export function branchLoadLevel(activeTickets: number, openWindows: number): LoadLevel {
  const ratio = activeTickets / Math.max(1, openWindows);
  if (ratio < 2) return "low";
  if (ratio < 5) return "medium";
  return "high";
}

export function estimateWaitMin(activeTickets: number, avgServiceS: number, openWindows: number): number {
  return Math.max(1, Math.round((activeTickets * (avgServiceS / 60)) / Math.max(1, openWindows)));
}

export function fmtClock(ts: string | null): string {
  if (!ts) return "--:--";
  return new Date(ts).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export function fmtEta(etaMinutes: number | null): string {
  if (etaMinutes === null) return "—";
  if (etaMinutes < 1) return "< 1 min";
  return `~${etaMinutes} min`;
}
