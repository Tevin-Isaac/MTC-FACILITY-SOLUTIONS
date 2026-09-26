export type QuoteLine = {
  id: string;
  side: "repair" | "replace";
  description: string;
  kind: "incurred" | "proposed";
  laborHours: number | null;
  laborRate: number | null;
  materialsCost: number | null;
  markupPercent: number | null;
};

export type WorkOrderQuote = {
  id: string;
  workOrderId: string;
  optionType: "single" | "repair_vs_replace";
  status: "draft" | "submitted" | "approved" | "declined";
  approvedBy: string | null;
  approvedAt: string | null;
  lines: QuoteLine[];
};

export const DEFAULT_EXCLUSIONS =
  "This excludes any unseen issues and or damage beyond our control, and or permitting. Conditions discovered after work begins, and work outside the approved scope, require a separate proposal.";

export const DEFAULT_LEAD_TIME =
  "Once approved, work can be completed within 3–4 days. Materials are readily available.";

export const DEFAULT_INCURRED =
  "MTC technician arrived onsite and met with the location manager and troubleshot the issue.";

export const DEFAULT_RESOLUTION = [
  "Tech will check in with the location manager.",
  "Areas worked will be cleaned and all debris disposed as they cannot be disposed at the location.",
].join("\n");

const META_PREFIX = "§:";

export type QuotePacket = {
  incurredNotes: string;
  resolution: string;
  exclusions: string;
  leadTime: string;
  reviewers: string[];
  incurredTripHours: number;
  incurredLaborHours: number;
  proposedTripHours: number;
  proposedLaborHours: number;
  laborRate: number;
  tripRate: number;
  replaceLaborHours: number;
  replaceRate: number;
  materials: { description: string; cost: number; side: "repair" | "replace" }[];
};

export function isMetaLine(line: Pick<QuoteLine, "description">): boolean {
  return line.description.startsWith(META_PREFIX);
}

export function lineAmount(line: QuoteLine): number {
  if (isMetaLine(line)) return 0;
  const labor = (line.laborHours ?? 0) * (line.laborRate ?? 0);
  const materials = (line.materialsCost ?? 0) * (1 + (line.markupPercent ?? 0) / 100);
  return Math.round(labor + materials);
}

export function quoteTotals(quote: WorkOrderQuote | null) {
  const moneyLines = (quote?.lines ?? []).filter((line) => !isMetaLine(line));
  const repair = moneyLines
    .filter((line) => line.side === "repair")
    .reduce((sum, line) => sum + lineAmount(line), 0);
  const replace = moneyLines
    .filter((line) => line.side === "replace")
    .reduce((sum, line) => sum + lineAmount(line), 0);
  return { repair, replace, single: repair };
}

export function estimationReviewRequired(total: number): 0 | 1 | 2 | 3 {
  if (total > 50_000) return 3;
  if (total > 20_000) return 2;
  if (total > 10_000) return 1;
  return 0;
}

function meta(lines: QuoteLine[], key: string): string {
  const row = lines.find((line) => line.description.startsWith(`${META_PREFIX}${key}`));
  if (!row) return "";
  return row.description.slice(META_PREFIX.length + key.length).replace(/^\s*\|\s*/, "");
}

function hoursOf(lines: QuoteLine[], description: string, kind: QuoteLine["kind"]): number {
  return lines.find((line) => line.description === description && line.kind === kind)?.laborHours ?? 0;
}

function rateOf(lines: QuoteLine[], description: string, kind: QuoteLine["kind"]): number {
  return lines.find((line) => line.description === description && line.kind === kind)?.laborRate ?? 0;
}

export function parseQuotePacket(quote: WorkOrderQuote | null): QuotePacket {
  const lines = quote?.lines ?? [];
  const money = lines.filter((line) => !isMetaLine(line));
  const incurredTrip = money.find((l) => /incurred trip|trip charge/i.test(l.description) && l.kind === "incurred")
    ?? money.find((l) => l.description === "Trip charge");
  const incurredLabor = money.find((l) => /incurred labor/i.test(l.description) && l.kind === "incurred");
  const proposedTrip = money.find((l) => /proposed trip/i.test(l.description) && l.kind === "proposed")
    ?? money.find((l) => l.description === "Trip charge" && l.kind === "proposed");
  const proposedLabor = money.find((l) => /proposed labor|^Labor$/i.test(l.description) && l.kind === "proposed" && l.side === "repair");
  const replaceLabor = money.find((l) => l.side === "replace" && l.description === "Labor");
  const materials = money
    .filter((line) => {
      if (line.laborHours) return false;
      if (/trip|labor/i.test(line.description) && (line.laborHours || line.description.toLowerCase().includes("trip") || line.description.toLowerCase() === "labor")) {
        return !line.materialsCost ? false : !/trip|labor/i.test(line.description);
      }
      return (line.materialsCost ?? 0) > 0 && !/trip charge|incurred trip|proposed trip|incurred labor|proposed labor|^Labor$/i.test(line.description);
    })
    .map((line) => ({
      description: line.description,
      cost: line.materialsCost ?? 0,
      side: line.side,
    }));

  const tripRate =
    rateOf(money, "Incurred Trip", "incurred") ||
    rateOf(money, "Proposed Trip", "proposed") ||
    (incurredTrip?.materialsCost && !incurredTrip.laborHours ? 0 : incurredTrip?.laborRate) ||
    115;
  const laborRate = rateOf(money, "Incurred Labor", "incurred") || rateOf(money, "Proposed Labor", "proposed") || proposedLabor?.laborRate || 95;

  return {
    incurredNotes: meta(lines, "notes") || DEFAULT_INCURRED,
    resolution: meta(lines, "resolution") || DEFAULT_RESOLUTION,
    exclusions: meta(lines, "exclusions") || DEFAULT_EXCLUSIONS,
    leadTime: meta(lines, "lead") || DEFAULT_LEAD_TIME,
    reviewers: meta(lines, "review")
      .split("|")
      .map((name) => name.trim())
      .filter(Boolean),
    incurredTripHours:
      hoursOf(money, "Incurred Trip", "incurred") ||
      (incurredTrip?.laborHours ?? (incurredTrip?.materialsCost && tripRate ? incurredTrip.materialsCost / tripRate : 0)),
    incurredLaborHours: hoursOf(money, "Incurred Labor", "incurred") || (incurredLabor?.laborHours ?? 0),
    proposedTripHours: hoursOf(money, "Proposed Trip", "proposed") || (proposedTrip?.laborHours ?? 0),
    proposedLaborHours: hoursOf(money, "Proposed Labor", "proposed") || (proposedLabor?.laborHours ?? 0),
    laborRate,
    tripRate: tripRate || 115,
    replaceLaborHours: replaceLabor?.laborHours ?? 0,
    replaceRate: replaceLabor?.laborRate ?? laborRate,
    materials: materials.length ? materials : [{ description: "", cost: 0, side: "repair" }],
  };
}

export function metaLine(key: string, text: string): Omit<QuoteLine, "id"> {
  return {
    side: "repair",
    description: `${META_PREFIX}${key}|${text.trim()}`,
    kind: "proposed",
    laborHours: null,
    laborRate: null,
    materialsCost: null,
    markupPercent: null,
  };
}
