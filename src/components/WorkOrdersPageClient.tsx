"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus, LayoutGrid, List, Search, Download, X, Eye } from "lucide-react";
import { WorkOrderQuickView } from "@/components/WorkOrderQuickView";
import { StatusBadge, PriorityBadge, ExceptionFlag } from "@/components/Badge";
import { WorkOrderBoard } from "@/components/WorkOrderBoard";
import { useAppData } from "@/components/AppDataProvider";
import { slaRisk, slaCountdown, STATUS_LABEL } from "@/lib/domain";
import type { Trade, WorkOrder } from "@/types/work-order";
import { TERMINAL_STATUSES } from "@/types/work-order";
import {
  Tile,
  Pill,
  Empty,
  Money,
  LinkButton,
  buttonClass,
  inputClass,
} from "@/components/ui";

type SavedView = "all" | "breaching" | "needs_vendor" | "quote_with_client" | "ready_to_bill";

const SAVED_VIEWS: { key: SavedView; label: string }[] = [
  { key: "all", label: "All" },
  { key: "breaching", label: "Breaching SLA" },
  { key: "needs_vendor", label: "Needs vendor" },
  { key: "quote_with_client", label: "Quote with client" },
  { key: "ready_to_bill", label: "Ready to bill" },
];

function matchesView(wo: WorkOrder, view: SavedView): boolean {
  switch (view) {
    case "breaching":
      return slaRisk(wo) !== "on_track";
    case "needs_vendor":
      return !wo.vendorId && !TERMINAL_STATUSES.includes(wo.status);
    case "quote_with_client":
      return wo.status === "quote_with_client";
    case "ready_to_bill":
      return wo.status === "ready_to_bill";
    default:
      return true;
  }
}

export function WorkOrdersPageClient({
  initialWorkOrders,
}: {
  initialWorkOrders: WorkOrder[];
}) {
  const [view, setView] = useState<"list" | "board">("board");
  const [savedView, setSavedView] = useState<SavedView>("all");
  const [query, setQuery] = useState("");
  const [trade, setTrade] = useState<Trade | "all">("all");
  const [peekId, setPeekId] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const siteFilter = searchParams.get("site");
  const { siteById, accountForSite, vendorById } = useAppData();

  const all = useMemo(
    () => [...initialWorkOrders].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [initialWorkOrders]
  );

  const trades = useMemo(
    () => Array.from(new Set(all.map((wo) => wo.trade))).sort(),
    [all]
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((wo) => {
      if (siteFilter && wo.siteId !== siteFilter) return false;
      if (!matchesView(wo, savedView)) return false;
      if (trade !== "all" && wo.trade !== trade) return false;
      if (!q) return true;
      const site = siteById(wo.siteId);
      const account = accountForSite(wo.siteId);
      const vendor = vendorById(wo.vendorId);
      // Search covers every number a coordinator might be handed over the
      // phone, not just the WO number.
      return [
        wo.woNumber,
        wo.legacyWoNumber,
        wo.poNumber,
        wo.externalTrackingNumber,
        wo.description,
        site?.name,
        site?.storeCode,
        account?.name,
        vendor?.name,
      ]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q));
    });
  }, [all, savedView, trade, query, siteFilter, siteById, accountForSite, vendorById]);

  function exportCsv() {
    const header = [
      "WO Number",
      "Legacy",
      "PO",
      "ServiceChannel",
      "Account",
      "Site",
      "Store code",
      "Trade",
      "Priority",
      "Status",
      "Vendor",
      "NTE",
      "DNE",
      "Created",
    ];
    const escape = (value: unknown) => {
      const s = value == null ? "" : String(value);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = rows.map((wo) => {
      const site = siteById(wo.siteId);
      const account = accountForSite(wo.siteId);
      const vendor = vendorById(wo.vendorId);
      return [
        wo.woNumber,
        wo.legacyWoNumber,
        wo.poNumber,
        wo.externalTrackingNumber,
        account?.name,
        site?.name,
        site?.storeCode,
        wo.trade.replace(/_/g, " "),
        wo.priority.replace(/_/g, " "),
        STATUS_LABEL[wo.status],
        vendor?.name ?? "Unassigned",
        wo.nte,
        wo.dne,
        wo.createdAt,
      ]
        .map(escape)
        .join(",");
    });
    const csv = [header.join(","), ...lines].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `mtc-work-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">Work orders</h1>
          <p className="mt-1 text-sm text-ink-2">
            {rows.length === all.length
              ? `${all.length} across all accounts`
              : `${rows.length} of ${all.length} shown`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-control bg-surface p-1 shadow-soft">
            <button
              type="button"
              onClick={() => setView("board")}
              className={`inline-flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-sm font-medium transition-colors ${
                view === "board" ? "bg-navy text-white" : "text-ink-2 hover:text-ink"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Board
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className={`inline-flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-sm font-medium transition-colors ${
                view === "list" ? "bg-navy text-white" : "text-ink-2 hover:text-ink"
              }`}
            >
              <List className="h-3.5 w-3.5" />
              List
            </button>
          </div>

          <button type="button" onClick={exportCsv} className={buttonClass("soft")}>
            <Download className="h-4 w-4" />
            Export
          </button>

          <LinkButton href="/work-orders/new">
            <Plus className="h-4 w-4" />
            New work order
          </LinkButton>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[15rem] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search WO, PO, ServiceChannel number, site or vendor"
            className={`${inputClass} bg-surface pl-10 shadow-soft`}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-ink-3 hover:text-ink"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <select
          value={trade}
          onChange={(e) => setTrade(e.target.value as Trade | "all")}
          className={`${inputClass} w-auto bg-surface capitalize shadow-soft`}
          aria-label="Filter by trade"
        >
          <option value="all">All trades</option>
          {trades.map((t) => (
            <option key={t} value={t} className="capitalize">
              {t.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {SAVED_VIEWS.map((v) => {
          const active = savedView === v.key;
          const count = all.filter((wo) => matchesView(wo, v.key)).length;
          return (
            <button
              key={v.key}
              type="button"
              onClick={() => setSavedView(v.key)}
              className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-navy text-white"
                  : "bg-surface text-ink-2 shadow-soft hover:text-ink"
              }`}
            >
              {v.label}
              <span
                className={`rounded-full px-1.5 text-[11px] tabular-nums ${
                  active ? "bg-white/20" : "bg-tint"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <Tile>
          <Empty
            title="Nothing matches these filters"
            hint="Try clearing the search, or switch back to the All view."
          />
        </Tile>
      ) : view === "board" ? (
        <WorkOrderBoard workOrders={rows} />
      ) : (
        <Tile padded={false} className="overflow-hidden">
          <div className="overflow-x-auto p-2 sm:p-3">
            <table className="w-full min-w-[60rem] border-separate border-spacing-y-1 text-left text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-ink-3">
                  <th className="px-3 pb-1 font-medium">WO #</th>
                  <th className="px-3 pb-1 font-medium">Site</th>
                  <th className="px-3 pb-1 font-medium">Trade</th>
                  <th className="px-3 pb-1 font-medium">Vendor</th>
                  <th className="px-3 pb-1 font-medium">SLA</th>
                  <th className="px-3 pb-1 font-medium">Priority</th>
                  <th className="px-3 pb-1 font-medium">Stage</th>
                  <th className="px-3 pb-1 text-right font-medium">NTE</th>
                  <th className="w-8 pb-1" />
                </tr>
              </thead>
              <tbody>
                {rows.map((wo) => {
                  const site = siteById(wo.siteId);
                  const account = accountForSite(wo.siteId);
                  const vendor = vendorById(wo.vendorId);
                  const risk = slaRisk(wo);
                  const countdown = slaCountdown(wo);
                  return (
                    <tr
                      key={wo.id}
                      className="group cursor-pointer"
                      onClick={() => setPeekId(wo.id)}
                    >
                      <td className="rounded-l-card bg-sunken px-3 py-3 font-semibold tabular-nums group-hover:bg-tint">
                        <Link
                          href={`/work-orders/${wo.id}`}
                          className="hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {wo.woNumber}
                        </Link>
                      </td>
                      <td className="max-w-[16rem] bg-sunken px-3 py-3 group-hover:bg-tint">
                        <div className="truncate font-medium">{site?.name}</div>
                        <div className="truncate text-xs text-ink-3">{account?.name}</div>
                      </td>
                      <td className="bg-sunken px-3 py-3 capitalize text-ink-2 group-hover:bg-tint">
                        {wo.trade.replace(/_/g, " ")}
                      </td>
                      <td className="bg-sunken px-3 py-3 group-hover:bg-tint">
                        {vendor ? (
                          <span className="text-ink-2">{vendor.name}</span>
                        ) : (
                          <Pill tone="warning">Unassigned</Pill>
                        )}
                      </td>
                      <td className="bg-sunken px-3 py-3 group-hover:bg-tint">
                        {countdown ? (
                          <span
                            className={
                              risk === "breached"
                                ? "font-medium text-critical"
                                : risk === "at_risk"
                                  ? "font-medium text-warning"
                                  : "text-ink-2"
                            }
                          >
                            {countdown}
                          </span>
                        ) : (
                          <span className="text-ink-3">—</span>
                        )}
                      </td>
                      <td className="bg-sunken px-3 py-3 group-hover:bg-tint">
                        <PriorityBadge priority={wo.priority} />
                      </td>
                      <td className="bg-sunken px-3 py-3 group-hover:bg-tint">
                        <div className="flex flex-wrap gap-1.5">
                          <StatusBadge status={wo.status} />
                          <ExceptionFlag wo={wo} />
                        </div>
                      </td>
                      <td className="bg-sunken px-3 py-3 text-right font-medium group-hover:bg-tint">
                        <Money amount={wo.nte} />
                      </td>
                      <td className="rounded-r-card bg-sunken px-2 py-3 group-hover:bg-tint">
                        <Eye className="h-3.5 w-3.5 text-ink-3 opacity-0 transition-opacity group-hover:opacity-100" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Tile>
      )}
      <WorkOrderQuickView
        workOrder={rows.find((wo) => wo.id === peekId) ?? null}
        onClose={() => setPeekId(null)}
      />
    </div>
  );
}
