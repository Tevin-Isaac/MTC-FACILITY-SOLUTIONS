import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  Account,
  CompletionRecord,
  Invoice,
  NteIncrease,
  Site,
  Vendor,
  WorkOrder,
} from "@/types/work-order";
import type { QuoteLine, WorkOrderQuote } from "@/lib/quote";
import { parseThread, type ThreadItem } from "@/lib/thread";

export type { QuoteLine, WorkOrderQuote } from "@/lib/quote";
export { lineAmount, quoteTotals } from "@/lib/quote";
export type { ThreadItem } from "@/lib/thread";

// Maps snake_case Postgres rows to the camelCase domain types in
// src/types/work-order.ts. Keeping the mapping in one place means the rest
// of the app never has to know the DB's column naming.

function mapAccount(row: Record<string, unknown>): Account {
  return {
    id: row.id as string,
    name: row.name as string,
    type: row.type as Account["type"],
    createdAt: row.created_at as string,
  };
}

function mapSite(row: Record<string, unknown>): Site {
  return {
    id: row.id as string,
    accountId: row.account_id as string,
    storeCode: (row.store_code as string) ?? null,
    name: row.name as string,
    address: row.address as string,
    contactName: (row.contact_name as string) ?? null,
    contactPhone: (row.contact_phone as string) ?? null,
    contactEmail: (row.contact_email as string) ?? null,
    hoursOfOperation: (row.hours_of_operation as string) ?? null,
  };
}

function mapVendor(row: Record<string, unknown>): Vendor {
  return {
    id: row.id as string,
    name: row.name as string,
    trades: (row.trades as Vendor["trades"]) ?? [],
    phone: (row.phone as string) ?? null,
    email: (row.email as string) ?? null,
    coiExpiresAt: (row.coi_expires_at as string) ?? null,
    licenseExpiresAt: (row.license_expires_at as string) ?? null,
    rateCardHourly: (row.rate_card_hourly as number) ?? null,
    isLastResort: Boolean(row.is_last_resort),
    active: Boolean(row.active),
  };
}

function mapNteIncrease(row: Record<string, unknown>): NteIncrease {
  return {
    amount: Number(row.amount),
    approvedBy: row.approved_by as string,
    approvedAt: row.approved_at as string,
    method: row.method as NteIncrease["method"],
    note: (row.note as string) ?? null,
  };
}

function mapWorkOrder(row: Record<string, unknown>): WorkOrder {
  return {
    id: row.id as string,
    woNumber: row.wo_number as string,
    legacyWoNumber: (row.legacy_wo_number as string) ?? null,
    siteId: row.site_id as string,
    trade: row.trade as WorkOrder["trade"],
    priority: row.priority as WorkOrder["priority"],
    status: row.status as WorkOrder["status"],
    description: row.description as string,
    poNumber: (row.po_number as string) ?? null,
    nte: row.nte != null ? Number(row.nte) : null,
    dne: row.dne != null ? Number(row.dne) : null,
    nteHistory: ((row.nte_increases as Record<string, unknown>[]) ?? []).map(mapNteIncrease),
    vendorId: (row.vendor_id as string) ?? null,
    slaRespondBy: (row.sla_respond_by as string) ?? null,
    slaResolveBy: (row.sla_resolve_by as string) ?? null,
    createdAt: row.created_at as string,
    closedAt: (row.closed_at as string) ?? null,
    source: row.source as WorkOrder["source"],
    externalTrackingNumber: (row.external_tracking_number as string) ?? null,
    clientExtendedStatus: (row.client_extended_status as string) ?? null,
    category: (row.category as WorkOrder["category"]) ?? null,
    glCode: (row.gl_code as string) ?? null,
    reporterName: (row.reporter_name as string) ?? null,
    reporterCell: (row.reporter_cell as string) ?? null,
  };
}

export async function getAccounts(): Promise<Account[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("accounts").select("*").order("name");
  if (error) throw new Error(`getAccounts: ${error.message}`);
  return (data ?? []).map(mapAccount);
}

export async function getSites(): Promise<Site[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("sites").select("*").order("name");
  if (error) throw new Error(`getSites: ${error.message}`);
  return (data ?? []).map(mapSite);
}

export async function getVendors(): Promise<Vendor[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("vendors").select("*").order("name");
  if (error) throw new Error(`getVendors: ${error.message}`);
  return (data ?? []).map(mapVendor);
}

export async function getWorkOrders(): Promise<WorkOrder[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("work_orders")
    .select("*, nte_increases(*)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`getWorkOrders: ${error.message}`);
  return (data ?? []).map(mapWorkOrder);
}

export async function getWorkOrderById(id: string): Promise<WorkOrder | undefined> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("work_orders")
    .select("*, nte_increases(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getWorkOrderById: ${error.message}`);
  return data ? mapWorkOrder(data) : undefined;
}

export interface WorkOrderEvent {
  id: string;
  kind: string;
  summary: string;
  actorName: string | null;
  meta: Record<string, unknown>;
  createdAt: string;
}

export type WorkOrderNote = ThreadItem;

/** Real activity history, newest first. Replaces the timeline the first
    version synthesised in the component. */
function tableMissing(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const text = `${error.code ?? ""} ${error.message ?? ""}`.toLowerCase();
  return (
    text.includes("does not exist") ||
    text.includes("could not find the table") ||
    text.includes("schema cache") ||
    error.code === "PGRST205" ||
    error.code === "42P01"
  );
}

export async function getWorkOrderEvents(workOrderId: string): Promise<WorkOrderEvent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("work_order_events")
    .select("*")
    .eq("work_order_id", workOrderId)
    .order("created_at", { ascending: false });
  if (!error) {
    return (data ?? []).map((row) => ({
      id: row.id as string,
      kind: row.kind as string,
      summary: row.summary as string,
      actorName: (row.actor_name as string) ?? null,
      meta: (row.meta as Record<string, unknown>) ?? {},
      createdAt: row.created_at as string,
    }));
  }
  if (!tableMissing(error)) throw new Error(`getWorkOrderEvents: ${error.message}`);
  return synthesizeEvents(workOrderId);
}

export async function getWorkOrderNotes(workOrderId: string): Promise<WorkOrderNote[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("work_order_notes")
    .select("*")
    .eq("work_order_id", workOrderId)
    .order("created_at", { ascending: false });
  if (!error) {
    return (data ?? []).map((row) => ({
      id: row.id as string,
      body: row.body as string,
      visibility: row.visibility as WorkOrderNote["visibility"],
      authorName: (row.author_name as string) ?? null,
      createdAt: row.created_at as string,
      channel: "note" as const,
      audience: (row.visibility === "client" ? "client" : "internal") as ThreadItem["audience"],
      contactName: null,
      contactValue: null,
      outcome: null,
    }));
  }
  if (!tableMissing(error)) throw new Error(`getWorkOrderNotes: ${error.message}`);
  return readFallbackNotes(workOrderId);
}

export function parseFallbackNotes(raw: string | null): WorkOrderNote[] {
  return parseThread(raw);
}

async function readFallbackNotes(workOrderId: string): Promise<WorkOrderNote[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("completion_records")
    .select("technician_notes")
    .eq("work_order_id", workOrderId)
    .maybeSingle();
  return parseFallbackNotes((data?.technician_notes as string | null) ?? null);
}

async function synthesizeEvents(workOrderId: string): Promise<WorkOrderEvent[]> {
  const supabase = await createClient();
  const [{ data: wo }, { data: ntes }, { data: quotes }, { data: invoices }] =
    await Promise.all([
      supabase
        .from("work_orders")
        .select("created_at, source, status, vendor_id")
        .eq("id", workOrderId)
        .maybeSingle(),
      supabase
        .from("nte_increases")
        .select("*")
        .eq("work_order_id", workOrderId)
        .order("approved_at", { ascending: false }),
      supabase.from("quotes").select("*").eq("work_order_id", workOrderId),
      supabase.from("invoices").select("*").eq("work_order_id", workOrderId),
    ]);

  const events: WorkOrderEvent[] = [];
  if (wo) {
    events.push({
      id: "created",
      kind: "created",
      summary: `Work order created via ${String(wo.source).replace(/_/g, " ")}`,
      actorName: null,
      meta: {},
      createdAt: wo.created_at as string,
    });
  }
  for (const row of ntes ?? []) {
    events.push({
      id: row.id as string,
      kind: "nte_increased",
      summary: `NTE raised to $${Number(row.amount).toLocaleString()} by ${row.approved_by} (${row.method})`,
      actorName: row.approved_by as string,
      meta: {},
      createdAt: row.approved_at as string,
    });
  }
  for (const row of quotes ?? []) {
    events.push({
      id: row.id as string,
      kind: row.status === "draft" ? "quote_submitted" : "quote_decided",
      summary:
        row.status === "approved" || row.status === "declined"
          ? `Client ${row.status} the quote${row.approved_by ? ` (${row.approved_by})` : ""}`
          : `Quote ${row.status}`,
      actorName: (row.approved_by as string) ?? null,
      meta: {},
      createdAt: (row.approved_at as string) ?? (wo?.created_at as string),
    });
  }
  for (const row of invoices ?? []) {
    events.push({
      id: row.id as string,
      kind: "status_changed",
      summary: `Invoice ${row.invoice_number} is ${row.status} · $${Number(row.amount).toLocaleString()}`,
      actorName: null,
      meta: {},
      createdAt: (row.issued_at as string) ?? (wo?.created_at as string),
    });
  }
  return events.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function getInvoices(): Promise<Invoice[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .order("issued_at", { ascending: false });
  if (error) throw new Error(`getInvoices: ${error.message}`);
  return (data ?? []).map((row) => ({
    id: row.id as string,
    invoiceNumber: row.invoice_number as string,
    workOrderId: row.work_order_id as string,
    status: row.status as Invoice["status"],
    amount: Number(row.amount),
    issuedAt: (row.issued_at as string) ?? null,
    dueAt: (row.due_at as string) ?? null,
  }));
}

export async function getInvoicesForWorkOrder(workOrderId: string): Promise<Invoice[]> {
  const all = await getInvoices();
  return all.filter((invoice) => invoice.workOrderId === workOrderId);
}

export async function getCompletion(workOrderId: string): Promise<CompletionRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("completion_records")
    .select("*")
    .eq("work_order_id", workOrderId)
    .maybeSingle();
  if (error) throw new Error(`getCompletion: ${error.message}`);
  if (!data) return null;
  return {
    workOrderId: data.work_order_id as string,
    beforePhotoUrls: (data.before_photo_urls as string[]) ?? [],
    afterPhotoUrls: (data.after_photo_urls as string[]) ?? [],
    afterVideoUrl: (data.after_video_url as string) ?? null,
    technicianNotes: (data.technician_notes as string) ?? null,
    rootCause: (data.root_cause as string) ?? null,
    signOffName: (data.sign_off_name as string) ?? null,
    signOffSignatureUrl: (data.sign_off_signature_url as string) ?? null,
    signOffAt: (data.sign_off_at as string) ?? null,
  };
}

// Fetches everything the app currently needs in one place — small
// reference datasets (accounts/sites/vendors) plus all work orders. Fine
// at this scale; revisit with pagination/filtering once volume grows.
export async function getAppData() {
  const [accounts, sites, vendors, workOrders] = await Promise.all([
    getAccounts(),
    getSites(),
    getVendors(),
    getWorkOrders(),
  ]);
  return { accounts, sites, vendors, workOrders };
}

function mapQuoteLine(row: Record<string, unknown>): QuoteLine {
  return {
    id: row.id as string,
    side: row.side as QuoteLine["side"],
    description: row.description as string,
    kind: row.kind as QuoteLine["kind"],
    laborHours: row.labor_hours != null ? Number(row.labor_hours) : null,
    laborRate: row.labor_rate != null ? Number(row.labor_rate) : null,
    materialsCost: row.materials_cost != null ? Number(row.materials_cost) : null,
    markupPercent: row.markup_percent != null ? Number(row.markup_percent) : null,
  };
}

export async function getQuoteForWorkOrder(workOrderId: string): Promise<WorkOrderQuote | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quotes")
    .select("*, quote_line_items(*)")
    .eq("work_order_id", workOrderId)
    .limit(1)
    .maybeSingle();
  if (error) {
    if (tableMissing(error)) return null;
    throw new Error(`getQuoteForWorkOrder: ${error.message}`);
  }
  if (!data) return null;
  return {
    id: data.id as string,
    workOrderId: data.work_order_id as string,
    optionType: data.option_type as WorkOrderQuote["optionType"],
    status: data.status as WorkOrderQuote["status"],
    approvedBy: (data.approved_by as string) ?? null,
    approvedAt: (data.approved_at as string) ?? null,
    lines: ((data.quote_line_items as Record<string, unknown>[]) ?? []).map(mapQuoteLine),
  };
}
