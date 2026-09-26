import type { Priority, Trade, WorkOrderCategory } from "@/types/work-order";

export type IntakeDraft = {
  source: "service_channel" | "outlook_email";
  trackingNumber: string | null;
  storeCode: string | null;
  siteName: string | null;
  address: string | null;
  accountName: string | null;
  trade: Trade;
  priority: Priority;
  description: string;
  nte: number | null;
  poNumber: string | null;
  reporterName: string | null;
  reporterCell: string | null;
  clientExtendedStatus: string | null;
  category: WorkOrderCategory | null;
  subject: string | null;
};

const TRADES: Trade[] = [
  "plumbing",
  "hvac",
  "electrical",
  "doors",
  "roofing",
  "general_construction",
  "flooring",
  "locksmith",
  "fire_life_safety",
  "handyman",
];

function pickTrade(text: string): Trade {
  const lower = text.toLowerCase();
  if (/hvac|rtu|cooling|heat|a\/c|air cond/.test(lower)) return "hvac";
  if (/plumb|drain|sewer|leak|toilet|water heater/.test(lower)) return "plumbing";
  if (/electr|outlet|panel|light|power/.test(lower)) return "electrical";
  if (/door|gate|overhead/.test(lower)) return "doors";
  if (/roof/.test(lower)) return "roofing";
  if (/floor/.test(lower)) return "flooring";
  if (/lock/.test(lower)) return "locksmith";
  if (/fire|sprinkler|alarm/.test(lower)) return "fire_life_safety";
  const named = TRADES.find((trade) => lower.includes(trade.replace(/_/g, " ")) || lower.includes(trade));
  return named ?? "handyman";
}

function pickPriority(text: string): Priority {
  const lower = text.toLowerCase();
  if (/p1|4.?hour|emergency.?4/.test(lower)) return "emergency_4_hour";
  if (/same.?day|emergency/.test(lower)) return "emergency_same_day";
  if (/p2|24.?hour|priority/.test(lower)) return "priority_24_hour";
  if (/routine|pm\b|preventive|scheduled/.test(lower)) return "routine_scheduled";
  return "standard_48_hour";
}

function pickCategory(text: string): WorkOrderCategory | null {
  const lower = text.toLowerCase();
  if (/capex/.test(lower)) return "capex";
  if (/building.?r&?m|repair.?maint/.test(lower)) return "building_rm";
  if (/maintenance|pm\b/.test(lower)) return "maintenance";
  return null;
}

function field(text: string, labels: string[]): string | null {
  for (const label of labels) {
    const match = text.match(new RegExp(`${label}\\s*[:#\\-]?\\s*(.+)`, "i"));
    if (match?.[1]) {
      return match[1].split("\n")[0]?.trim() || null;
    }
  }
  return null;
}

function money(text: string | null): number | null {
  if (!text) return null;
  const match = text.replace(/,/g, "").match(/(\d+(?:\.\d{1,2})?)/);
  return match ? Number(match[1]) : null;
}

function phone(text: string | null): string | null {
  if (!text) return null;
  const match = text.match(/(\+?1?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/);
  return match?.[1] ?? null;
}

function splitSlash(description: string): {
  description: string;
  reporterName: string | null;
  reporterCell: string | null;
} {
  const parts = description.split(/\s*\/\s*/).map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) return { description, reporterName: null, reporterCell: null };
  const last = parts[parts.length - 1] ?? "";
  const maybePhone = phone(last);
  if (maybePhone) {
    const name = parts.length >= 3 ? parts[parts.length - 2] ?? null : null;
    return {
      description: parts.slice(0, name ? -2 : -1).join(" / ") || description,
      reporterName: name && !phone(name) ? name : null,
      reporterCell: maybePhone,
    };
  }
  return { description, reporterName: null, reporterCell: null };
}

export function parseIntakeText(raw: string, subject?: string | null): IntakeDraft {
  const text = raw.replace(/\r/g, "").trim();
  const combined = `${subject ?? ""}\n${text}`;
  const tracking =
    field(combined, ["Work Order #", "WO #", "WO Number", "Tracking #", "ServiceChannel", "SC WO"]) ??
    combined.match(/\b(36\d{7,9})\b/)?.[1] ??
    null;
  const storeCode =
    field(combined, ["Store ID", "Store #", "Store Code", "Location ID"]) ??
    combined.match(/\b(CC\s?\d{3,4}|DT[- ]?\d{3,4}|BBT[- ]?\d{3,4}|\d{4})\b/i)?.[1]?.replace(/\s+/g, "") ??
    null;
  const siteName = field(combined, ["Location", "Site", "Store Name"]);
  const address = field(combined, ["Address", "Store Address"]);
  const accountName = field(combined, ["Subscriber", "Client", "Account", "Customer"]);
  const nte = money(field(combined, ["NTE", "Not to Exceed", "NTE Amount"]));
  const poNumber = field(combined, ["PO #", "PO Number", "Purchase Order"]);
  const status = field(combined, ["Status", "Extended Status", "WO Status"]);
  let description =
    field(combined, ["Description", "Problem", "Issue", "Scope"]) ??
    text.split("\n").find((line) => line.trim().length > 12 && !/^(from|sent|to|subject):/i.test(line)) ??
    subject ??
    "Inbound work request";
  const split = splitSlash(description);
  description = split.description;
  const reporterName = field(combined, ["Caller", "Reporter", "Requested By", "Contact"]) ?? split.reporterName;
  const reporterCell = phone(field(combined, ["Caller Phone", "Reporter Phone", "Cell", "Phone"])) ?? split.reporterCell;

  return {
    source: tracking || /service\s*channel/i.test(combined) ? "service_channel" : "outlook_email",
    trackingNumber: tracking,
    storeCode,
    siteName,
    address,
    accountName,
    trade: pickTrade(combined),
    priority: pickPriority(combined),
    description,
    nte,
    poNumber,
    reporterName,
    reporterCell,
    clientExtendedStatus: status,
    category: pickCategory(combined),
    subject: subject ?? null,
  };
}

export function parseServiceChannelWorkOrder(raw: Record<string, unknown>): IntakeDraft {
  const status = (raw.Status ?? raw.status) as Record<string, unknown> | undefined;
  const location = (raw.Location ?? raw.location) as Record<string, unknown> | undefined;
  const caller = (raw.Caller ?? raw.caller ?? raw.Requestor) as Record<string, unknown> | undefined;
  const id = String(raw.Id ?? raw.id ?? raw.Number ?? raw.number ?? "").trim();
  const description = String(raw.Description ?? raw.description ?? "ServiceChannel work order");
  const split = splitSlash(description);
  const store = String(location?.StoreId ?? location?.storeId ?? location?.Id ?? "").trim() || null;
  return {
    source: "service_channel",
    trackingNumber: id || null,
    storeCode: store,
    siteName: String(location?.Name ?? location?.name ?? "").trim() || null,
    address: [location?.Address1 ?? location?.address, location?.City ?? location?.city, location?.State ?? location?.state]
      .filter(Boolean)
      .join(", ") || null,
    accountName: String(raw.SubscriberName ?? raw.subscriberName ?? "").trim() || null,
    trade: pickTrade(String(raw.Trade ?? raw.trade ?? description)),
    priority: pickPriority(String(raw.Priority ?? raw.priority ?? "")),
    description: split.description,
    nte: raw.Nte != null ? Number(raw.Nte) : raw.nte != null ? Number(raw.nte) : null,
    poNumber: String(raw.PurchaseNumber ?? raw.purchaseNumber ?? raw.PO ?? "").trim() || null,
    reporterName: String(caller?.Name ?? caller?.name ?? "").trim() || split.reporterName,
    reporterCell: phone(String(caller?.Phone ?? caller?.phone ?? "")) ?? split.reporterCell,
    clientExtendedStatus: String(status?.Extended ?? status?.extended ?? status?.Primary ?? "").trim() || null,
    category: pickCategory(String(raw.Category ?? raw.category ?? "")),
    subject: null,
  };
}

export function parseServiceChannelXml(xml: string): IntakeDraft {
  function tag(name: string): string | null {
    const match = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
    return match?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, "").trim() || null;
  }
  return parseIntakeText(
    [
      `Work Order #: ${tag("WorkOrderId") ?? tag("WONumber") ?? tag("Id") ?? ""}`,
      `Store ID: ${tag("StoreId") ?? tag("LocationId") ?? ""}`,
      `Location: ${tag("LocationName") ?? tag("StoreName") ?? ""}`,
      `Address: ${tag("Address") ?? tag("Address1") ?? ""}`,
      `Trade: ${tag("Trade") ?? ""}`,
      `Priority: ${tag("Priority") ?? ""}`,
      `NTE: ${tag("Nte") ?? tag("NTE") ?? ""}`,
      `Status: ${tag("Status") ?? tag("ExtendedStatus") ?? ""}`,
      `Description: ${tag("Description") ?? tag("Problem") ?? ""}`,
      `Caller: ${tag("Caller") ?? tag("CallerName") ?? ""}`,
      `Phone: ${tag("CallerPhone") ?? tag("Phone") ?? ""}`,
    ].join("\n")
  );
}
