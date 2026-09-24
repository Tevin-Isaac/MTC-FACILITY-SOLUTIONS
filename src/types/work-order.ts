// Core domain types for the MTC work-order platform.
// Modeled on MTC's documented process (FC training, New Hire manual) and
// corrected for the gaps found in reviewing the previous system (see docs/data-model.md):
// - single lifecycle, not duplicated pipelines/tags
// - NTE (vendor-side) and DNE (client-side) as first-class fields
// - sites as their own entity under an account, not flattened into "clients"

export type ClientType = "commercial" | "residential";

export type Trade =
  | "plumbing"
  | "hvac"
  | "electrical"
  | "doors"
  | "roofing"
  | "general_construction"
  | "flooring"
  | "locksmith"
  | "fire_life_safety"
  | "handyman";

export type Priority =
  | "emergency_same_day"
  | "emergency_4_hour"
  | "priority_24_hour"
  | "standard_48_hour"
  | "routine_scheduled";

// Single, non-duplicated status pipeline. Every stage is reachable from an
// adjacent stage only (no free any-to-any drag) to keep
// the lifecycle meaningful.
export type WorkOrderStatus =
  | "new"
  | "assigned"
  | "schedule_confirmed"
  | "tech_onsite"
  | "pending_quote"
  | "quote_with_client"
  | "quote_approved"
  | "quote_declined"
  | "work_completed"
  | "pending_documentation"
  | "in_quality_assurance"
  | "ready_to_bill"
  | "ready_to_invoice"
  | "invoiced"
  | "paid"
  | "closed"
  | "complete_no_charge"
  | "cancelled"
  | "on_hold";

export const TERMINAL_STATUSES: WorkOrderStatus[] = [
  "closed",
  "complete_no_charge",
  "cancelled",
];

export interface Account {
  id: string;
  name: string;
  type: ClientType;
  createdAt: string;
}

export interface Site {
  id: string;
  accountId: string;
  storeCode: string | null;
  name: string;
  address: string;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  hoursOfOperation: string | null;
}

export interface Vendor {
  id: string;
  name: string;
  trades: Trade[];
  phone: string | null;
  email: string | null;
  coiExpiresAt: string | null;
  licenseExpiresAt: string | null;
  rateCardHourly: number | null;
  isLastResort: boolean;
  active: boolean;
}

export interface WorkOrder {
  id: string;
  woNumber: string;
  legacyWoNumber: string | null;
  siteId: string;
  trade: Trade;
  priority: Priority;
  status: WorkOrderStatus;
  description: string;
  poNumber: string | null;
  nte: number | null; // Not-to-Exceed: vendor-side authorization limit
  dne: number | null; // Do-Not-Exceed: client-approved spending limit
  vendorId: string | null;
  slaRespondBy: string | null;
  slaResolveBy: string | null;
  createdAt: string;
  closedAt: string | null;
}

export interface QuoteLineItem {
  description: string;
  kind: "incurred" | "proposed";
  laborHours: number | null;
  laborRate: number | null;
  materialsCost: number | null;
  markupPercent: number | null;
}

export interface Quote {
  id: string;
  workOrderId: string;
  // Two-option repair-vs-replace support.
  optionType: "single" | "repair_vs_replace";
  repairLineItems: QuoteLineItem[];
  replaceLineItems: QuoteLineItem[] | null;
  status: "draft" | "submitted" | "approved" | "declined";
  approvedBy: string | null;
  approvedAt: string | null;
}

export interface CompletionRecord {
  workOrderId: string;
  beforePhotoUrls: string[];
  afterPhotoUrls: string[];
  technicianNotes: string | null;
  signOffName: string | null;
  signOffSignatureUrl: string | null;
  signOffAt: string | null;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  workOrderId: string;
  status: "draft" | "sent" | "viewed" | "partial" | "paid" | "overdue";
  amount: number;
  issuedAt: string | null;
  dueAt: string | null;
}
