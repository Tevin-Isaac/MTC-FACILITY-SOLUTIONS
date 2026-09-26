// Pure business logic for work orders — no data dependency, safe to import
// from server or client components. Split out from the old mock-data
// module so it keeps working unchanged once real Postgres queries (see
// src/lib/data/) replace the in-memory arrays.

import type { Account, Site, Vendor, WorkOrder, WorkOrderStatus } from "@/types/work-order";

export const STATUS_LABEL: Record<WorkOrderStatus, string> = {
  new: "New",
  assigned: "Assigned",
  schedule_confirmed: "Schedule Confirmed",
  tech_onsite: "Tech Onsite",
  pending_quote: "Pending Quote",
  quote_with_client: "Quote with Client",
  quote_approved: "Quote Approved",
  quote_declined: "Quote Declined",
  work_completed: "Work Completed",
  pending_documentation: "Pending Documentation",
  in_quality_assurance: "In Quality Assurance",
  ready_to_bill: "Ready to Bill",
  ready_to_invoice: "Ready to Invoice",
  invoiced: "Invoiced",
  paid: "Paid",
  closed: "Closed",
  complete_no_charge: "Complete - No Charge",
  cancelled: "Cancelled",
  on_hold: "On Hold",
};

// Phase families group the granular status list into the 6 stages that
// matter for a board/chart view — see reference_dashboard_design_ideas
// memory. Exceptions (on_hold, etc.) are flags layered on a status, not a
// separate phase.
export type PhaseFamily =
  | "Intake"
  | "Dispatch"
  | "Quote"
  | "Completion"
  | "Billing"
  | "Closed";

export const PHASE_FAMILIES: PhaseFamily[] = [
  "Intake",
  "Dispatch",
  "Quote",
  "Completion",
  "Billing",
  "Closed",
];

export const PHASE_COLOR: Record<PhaseFamily, string> = {
  Intake: "var(--phase-intake)",
  Dispatch: "var(--phase-dispatch)",
  Quote: "var(--phase-quote)",
  Completion: "var(--phase-completion)",
  Billing: "var(--phase-billing)",
  Closed: "var(--phase-closed)",
};

// Matching soft background for each family, so chips and board columns read
// as tinted rather than outlined.
export const PHASE_TINT: Record<PhaseFamily, string> = {
  Intake: "var(--phase-intake-tint)",
  Dispatch: "var(--phase-dispatch-tint)",
  Quote: "var(--phase-quote-tint)",
  Completion: "var(--phase-completion-tint)",
  Billing: "var(--phase-billing-tint)",
  Closed: "var(--phase-closed-tint)",
};

const PHASE_BY_STATUS: Record<WorkOrderStatus, PhaseFamily> = {
  new: "Intake",
  assigned: "Dispatch",
  schedule_confirmed: "Dispatch",
  tech_onsite: "Dispatch",
  on_hold: "Dispatch",
  pending_quote: "Quote",
  quote_with_client: "Quote",
  quote_approved: "Quote",
  quote_declined: "Quote",
  work_completed: "Completion",
  pending_documentation: "Completion",
  in_quality_assurance: "Completion",
  ready_to_bill: "Billing",
  ready_to_invoice: "Billing",
  invoiced: "Billing",
  paid: "Billing",
  closed: "Closed",
  complete_no_charge: "Closed",
  cancelled: "Closed",
};

// Representative status used when a card is moved into a phase on the board.
export const PHASE_DEFAULT_STATUS: Record<PhaseFamily, WorkOrderStatus> = {
  Intake: "new",
  Dispatch: "assigned",
  Quote: "pending_quote",
  Completion: "in_quality_assurance",
  Billing: "ready_to_bill",
  Closed: "closed",
};

export function phaseForStatus(status: WorkOrderStatus): PhaseFamily {
  return PHASE_BY_STATUS[status];
}

// Exception statuses render as an amber flag on top of their normal phase,
// rather than pulling the work order into a separate "exception" column.
const EXCEPTION_STATUSES: WorkOrderStatus[] = ["on_hold"];

export function isException(wo: WorkOrder): boolean {
  return EXCEPTION_STATUSES.includes(wo.status);
}

export type SlaRisk = "on_track" | "at_risk" | "breached";

export function slaRisk(wo: WorkOrder, now: Date = new Date()): SlaRisk {
  if (phaseForStatus(wo.status) === "Closed") return "on_track";
  if (!wo.slaResolveBy) return "on_track";
  const resolveBy = new Date(wo.slaResolveBy).getTime();
  const hoursRemaining = (resolveBy - now.getTime()) / 3_600_000;
  if (hoursRemaining < 0) return "breached";
  if (hoursRemaining <= 4) return "at_risk";
  return "on_track";
}

// Human-readable SLA countdown, e.g. "2h 14m left" or "1h 5m overdue".
export function slaCountdown(wo: WorkOrder, now: Date = new Date()): string | null {
  if (!wo.slaResolveBy) return null;
  const diffMs = new Date(wo.slaResolveBy).getTime() - now.getTime();
  const overdue = diffMs < 0;
  const totalMinutes = Math.round(Math.abs(diffMs) / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const label = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  return overdue ? `${label} overdue` : `${label} left`;
}

// Deterministic pseudo-trend ending exactly at `current`, for KPI
// sparklines. Not real history (no time-series backend yet) — a seeded
// generator instead of Math.random() so it's reproducible and doesn't
// differ between renders.
export function seededTrend(seed: number, current: number, points = 7): number[] {
  let x = seed || 1;
  const rand = () => {
    x = (x * 9301 + 49297) % 233280;
    return x / 233280;
  };
  const arr: number[] = new Array(points).fill(current);
  let v = current;
  for (let i = points - 2; i >= 0; i--) {
    v = Math.max(0, Math.round(v + (rand() - 0.5) * 2));
    arr[i] = v;
  }
  arr[points - 1] = current;
  return arr;
}

// Illustrative quote line items that actually sum to `total` — trip charge
// fixed at MTC's $115 standard, remainder split labor/materials.
export function quoteLineItems(total: number, tripCharge = 115) {
  const charged = Math.min(tripCharge, total);
  const remaining = Math.max(total - charged, 0);
  const labor = Math.round(remaining * 0.6);
  const materials = remaining - labor;
  return { labor, materials, tripCharge: charged };
}

// Estimated vendor cost / MTC margin at the standard 15-20% materials
// markup (New Hire manual §3.4) — illustrative until real cost line items
// exist per quote.
export function estimatedMargin(total: number, markupPercent = 0.18) {
  const vendorCost = Math.round(total / (1 + markupPercent));
  return { vendorCost, margin: total - vendorCost };
}

export type ComplianceStatus = "expired" | "expiring_soon" | "valid" | "unknown";

export function complianceStatus(
  dateStr: string | null,
  now: Date = new Date()
): ComplianceStatus {
  if (!dateStr) return "unknown";
  const days = (new Date(dateStr).getTime() - now.getTime()) / 86_400_000;
  if (days < 0) return "expired";
  if (days < 30) return "expiring_soon";
  return "valid";
}

// Worst-of COI/license compliance for a vendor — used to gate dispatch.
export function vendorComplianceStatus(vendor: Vendor, now: Date = new Date()): ComplianceStatus {
  const statuses = [
    complianceStatus(vendor.coiExpiresAt, now),
    complianceStatus(vendor.licenseExpiresAt, now),
  ];
  if (statuses.includes("expired")) return "expired";
  if (statuses.includes("expiring_soon")) return "expiring_soon";
  if (statuses.every((s) => s === "unknown")) return "unknown";
  return "valid";
}

export function siteById(sites: Site[], siteId: string): Site | undefined {
  return sites.find((s) => s.id === siteId);
}

export function accountForSite(
  sites: Site[],
  accounts: Account[],
  siteId: string
): Account | undefined {
  const site = siteById(sites, siteId);
  if (!site) return undefined;
  return accounts.find((a) => a.id === site.accountId);
}

export function vendorById(vendors: Vendor[], vendorId: string | null): Vendor | undefined {
  if (!vendorId) return undefined;
  return vendors.find((v) => v.id === vendorId);
}

export function vendorsForTrade(vendors: Vendor[], trade: WorkOrder["trade"]): Vendor[] {
  return [...vendors]
    .filter((v) => v.active)
    .sort((a, b) => {
      const aMatch = a.trades.includes(trade) ? 0 : 1;
      const bMatch = b.trades.includes(trade) ? 0 : 1;
      if (aMatch !== bMatch) return aMatch - bMatch;
      return (a.rateCardHourly ?? 0) - (b.rateCardHourly ?? 0);
    });
}

// Next-step button label, context-aware per the WO's current status.
export function nextStepLabel(status: WorkOrderStatus): string {
  const map: Partial<Record<WorkOrderStatus, string>> = {
    new: "Assign vendor",
    assigned: "Confirm schedule",
    schedule_confirmed: "Mark tech onsite",
    tech_onsite: "Mark work completed",
    pending_quote: "Send quote to client",
    quote_with_client: "Record client decision",
    quote_approved: "Schedule repair",
    quote_declined: "Close, no charge",
    work_completed: "Upload documentation",
    pending_documentation: "Submit for QA",
    in_quality_assurance: "Approve for billing",
    ready_to_bill: "Create invoice",
    ready_to_invoice: "Send invoice",
    invoiced: "Record payment",
    paid: "Close work order",
    on_hold: "Resume work order",
  };
  return map[status] ?? "Update status";
}

/**
 * The single status the primary next-step button moves to. `null` means the
 * work order is terminal, or the step needs more input than one click (a
 * client decision, which goes through `recordQuoteDecision` instead).
 */
const NEXT_STATUS: Partial<Record<WorkOrderStatus, WorkOrderStatus>> = {
  new: "assigned",
  assigned: "schedule_confirmed",
  schedule_confirmed: "tech_onsite",
  tech_onsite: "work_completed",
  pending_quote: "quote_with_client",
  quote_approved: "schedule_confirmed",
  quote_declined: "complete_no_charge",
  work_completed: "pending_documentation",
  pending_documentation: "in_quality_assurance",
  in_quality_assurance: "ready_to_bill",
  ready_to_bill: "ready_to_invoice",
  ready_to_invoice: "invoiced",
  invoiced: "paid",
  paid: "closed",
  on_hold: "assigned",
};

export function nextStatusFor(status: WorkOrderStatus): WorkOrderStatus | null {
  return NEXT_STATUS[status] ?? null;
}

/**
 * Lifecycle graph. Movement is deliberately restricted — a work order can't
 * jump from New straight to Invoiced — so the pipeline keeps meaning. On hold
 * and Cancelled are reachable from any live stage, which is how exceptions
 * actually happen.
 */
const ESCAPE_HATCHES: WorkOrderStatus[] = ["on_hold", "cancelled"];

const TRANSITIONS: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  new: ["assigned", "pending_quote"],
  assigned: ["schedule_confirmed", "tech_onsite", "pending_quote"],
  schedule_confirmed: ["tech_onsite", "pending_quote"],
  tech_onsite: ["work_completed", "pending_quote"],
  pending_quote: ["quote_with_client"],
  quote_with_client: ["quote_approved", "quote_declined"],
  quote_approved: ["schedule_confirmed", "tech_onsite"],
  quote_declined: ["complete_no_charge", "closed"],
  work_completed: ["pending_documentation", "in_quality_assurance"],
  pending_documentation: ["in_quality_assurance"],
  in_quality_assurance: ["ready_to_bill", "work_completed"],
  ready_to_bill: ["ready_to_invoice"],
  ready_to_invoice: ["invoiced"],
  invoiced: ["paid"],
  paid: ["closed"],
  on_hold: ["assigned", "schedule_confirmed", "tech_onsite", "pending_quote"],
  // Terminal.
  closed: [],
  complete_no_charge: [],
  cancelled: [],
};

export function allowedTransitions(from: WorkOrderStatus): WorkOrderStatus[] {
  const base = TRANSITIONS[from];
  if (base.length === 0) return [];
  return [...base, ...ESCAPE_HATCHES.filter((s) => s !== from)];
}

export function canTransition(from: WorkOrderStatus, to: WorkOrderStatus): boolean {
  return allowedTransitions(from).includes(to);
}

/**
 * Which status a board drag should land on. Dropping a card into a phase
 * column is ambiguous — a phase holds several statuses — so this picks the
 * phase's representative status when that move is legal, and otherwise the
 * first legal status inside that phase. `null` means the move isn't allowed
 * at all, which the board reports instead of silently snapping back.
 */
export function statusForPhaseDrop(
  from: WorkOrderStatus,
  phase: PhaseFamily
): WorkOrderStatus | null {
  const allowed = allowedTransitions(from);
  const preferred = PHASE_DEFAULT_STATUS[phase];
  if (allowed.includes(preferred)) return preferred;
  return allowed.find((status) => phaseForStatus(status) === phase) ?? null;
}
