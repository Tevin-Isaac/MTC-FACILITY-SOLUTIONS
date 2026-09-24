// Sample data for UI development before the Supabase schema is wired up.
// Shapes match src/types/work-order.ts.

import type {
  Account,
  Site,
  Vendor,
  WorkOrder,
  WorkOrderStatus,
} from "@/types/work-order";

export const mockAccounts: Account[] = [
  { id: "acc_1", name: "Crash Champions", type: "commercial", createdAt: "2025-01-10" },
  { id: "acc_2", name: "DriveTime", type: "commercial", createdAt: "2025-01-14" },
  { id: "acc_3", name: "Big Brand Tire & Service", type: "commercial", createdAt: "2025-02-02" },
  { id: "acc_4", name: "CVS", type: "commercial", createdAt: "2025-02-20" },
];

export const mockSites: Site[] = [
  { id: "site_1", accountId: "acc_1", storeCode: "CC549", name: "Crash Champions - CC549", address: "1420 Oak Cliff Ave, Dallas, TX", contactName: "Maria White", contactPhone: "214-555-0132", contactEmail: null, hoursOfOperation: "Mon-Fri 8a-6p" },
  { id: "site_2", accountId: "acc_2", storeCode: "0172", name: "DriveTime - 0172", address: "889 Northgate Dr, Little Elm, TX", contactName: "Jordan Reyes", contactPhone: "972-555-0110", contactEmail: null, hoursOfOperation: "Mon-Sat 9a-7p" },
  { id: "site_3", accountId: "acc_3", storeCode: "0041", name: "Big Brand Tire - 0041", address: "5521 Coast Hwy, Oceanside, CA", contactName: "Dana Kim", contactPhone: "760-555-0198", contactEmail: null, hoursOfOperation: "Mon-Sat 7a-6p" },
];

export const mockVendors: Vendor[] = [
  { id: "ven_1", name: "Metro Plumbing Co.", trades: ["plumbing"], phone: "469-555-0110", email: "dispatch@metroplumbing.example", coiExpiresAt: "2026-11-01", licenseExpiresAt: "2027-03-01", rateCardHourly: 95, isLastResort: false, active: true },
  { id: "ven_2", name: "Apex HVAC Services", trades: ["hvac"], phone: "214-555-0155", email: "service@apexhvac.example", coiExpiresAt: "2026-10-05", licenseExpiresAt: "2026-09-20", rateCardHourly: 110, isLastResort: false, active: true },
  { id: "ven_3", name: "Lone Star Electric", trades: ["electrical"], phone: "972-555-0177", email: "ops@lonestarelectric.example", coiExpiresAt: "2026-12-15", licenseExpiresAt: "2027-01-10", rateCardHourly: 105, isLastResort: false, active: true },
  { id: "ven_4", name: "YHM Services", trades: ["handyman", "general_construction"], phone: "800-555-0199", email: "oscar@yhmservices.example", coiExpiresAt: "2026-08-30", licenseExpiresAt: "2026-08-30", rateCardHourly: 85, isLastResort: true, active: true },
];

export const mockWorkOrders: WorkOrder[] = [
  { id: "wo_1", woNumber: "WO-3021", legacyWoNumber: "CC-88213", siteId: "site_1", trade: "doors", priority: "emergency_4_hour", status: "quote_with_client", description: "Overhead door failure, security exposure", poNumber: "PO-55210", nte: 140, dne: 140, vendorId: "ven_4", slaRespondBy: "2026-09-24T15:00:00Z", slaResolveBy: "2026-09-24T19:00:00Z", createdAt: "2026-09-24T11:20:00Z", closedAt: null },
  { id: "wo_2", woNumber: "WO-3022", legacyWoNumber: null, siteId: "site_2", trade: "hvac", priority: "priority_24_hour", status: "tech_onsite", description: "RTU not cooling, high indoor temp", poNumber: "PO-55298", nte: 900, dne: 900, vendorId: "ven_2", slaRespondBy: "2026-09-25T10:00:00Z", slaResolveBy: null, createdAt: "2026-09-24T09:05:00Z", closedAt: null },
  { id: "wo_3", woNumber: "WO-3023", legacyWoNumber: "BBT-1187", siteId: "site_3", trade: "plumbing", priority: "standard_48_hour", status: "pending_quote", description: "Slow drain, restroom 2", poNumber: "PO-55301", nte: null, dne: null, vendorId: "ven_1", slaRespondBy: "2026-09-26T18:00:00Z", slaResolveBy: null, createdAt: "2026-09-23T16:40:00Z", closedAt: null },
  { id: "wo_4", woNumber: "WO-3018", legacyWoNumber: null, siteId: "site_1", trade: "electrical", priority: "priority_24_hour", status: "in_quality_assurance", description: "Outlet not working, back office", poNumber: "PO-55177", nte: 260, dne: 260, vendorId: "ven_3", slaRespondBy: "2026-09-22T18:00:00Z", slaResolveBy: "2026-09-23T09:10:00Z", createdAt: "2026-09-21T14:00:00Z", closedAt: null },
  { id: "wo_5", woNumber: "WO-3010", legacyWoNumber: "DT-4471", siteId: "site_2", trade: "hvac", priority: "routine_scheduled", status: "closed", description: "Quarterly PM, rooftop units", poNumber: "PO-54980", nte: 400, dne: 400, vendorId: "ven_2", slaRespondBy: null, slaResolveBy: null, createdAt: "2026-09-10T08:00:00Z", closedAt: "2026-09-18T17:30:00Z" },
];

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

export function accountForSite(siteId: string): Account | undefined {
  const site = mockSites.find((s) => s.id === siteId);
  if (!site) return undefined;
  return mockAccounts.find((a) => a.id === site.accountId);
}

export function siteById(siteId: string): Site | undefined {
  return mockSites.find((s) => s.id === siteId);
}

export function vendorById(vendorId: string | null): Vendor | undefined {
  if (!vendorId) return undefined;
  return mockVendors.find((v) => v.id === vendorId);
}
