import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Account, NteIncrease, Site, Vendor, WorkOrder } from "@/types/work-order";

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
