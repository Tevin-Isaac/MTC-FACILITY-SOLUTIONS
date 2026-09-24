"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, LayoutGrid, List } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge, PriorityBadge, ExceptionFlag } from "@/components/Badge";
import { WorkOrderBoard } from "@/components/WorkOrderBoard";
import { useAppData } from "@/components/AppDataProvider";
import { slaRisk } from "@/lib/domain";
import type { WorkOrder } from "@/types/work-order";
import { TERMINAL_STATUSES } from "@/types/work-order";

type SavedView = "all" | "breaching" | "needs_vendor" | "quote_with_client" | "ready_to_bill";

const SAVED_VIEWS: { key: SavedView; label: string }[] = [
  { key: "all", label: "All work orders" },
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

export function WorkOrdersPageClient({ initialWorkOrders }: { initialWorkOrders: WorkOrder[] }) {
  const [view, setView] = useState<"list" | "board">("board");
  const [savedView, setSavedView] = useState<SavedView>("all");
  const { siteById, accountForSite, vendorById } = useAppData();

  const all = [...initialWorkOrders].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const rows = all.filter((wo) => matchesView(wo, savedView));

  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Work Orders</h1>
          <p className="mt-1 text-sm text-muted">
            {rows.length} of {all.length} total, across all accounts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-border bg-surface p-1">
            <button
              type="button"
              onClick={() => setView("board")}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                view === "board"
                  ? "bg-brand-navy text-white"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Board
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                view === "list"
                  ? "bg-brand-navy text-white"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <List className="h-3.5 w-3.5" />
              List
            </button>
          </div>
          <button
            type="button"
            onClick={() =>
              toast.info("Not connected to a backend yet", {
                description: "Creating work orders will work once real data is wired up.",
              })
            }
            className="inline-flex items-center gap-2 rounded-lg bg-brand-navy px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-navy-dark"
          >
            <Plus className="h-4 w-4" />
            New Work Order
          </button>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-border">
        {SAVED_VIEWS.map((v) => (
          <button
            key={v.key}
            type="button"
            onClick={() => setSavedView(v.key)}
            className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
              savedView === v.key
                ? "border-brand-gold text-foreground"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {view === "board" ? (
        <WorkOrderBoard initialWorkOrders={rows} />
      ) : (
        <div className="overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-black/5">
          <div className="overflow-x-auto">
            <table className="w-full min-w-240 text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                  <th className="px-5 py-3 font-medium">WO #</th>
                  <th className="px-5 py-3 font-medium">Site</th>
                  <th className="px-5 py-3 font-medium">Trade</th>
                  <th className="px-5 py-3 font-medium">Vendor</th>
                  <th className="px-5 py-3 font-medium">NTE</th>
                  <th className="px-5 py-3 font-medium">Priority</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((wo) => {
                  const site = siteById(wo.siteId);
                  const account = accountForSite(wo.siteId);
                  const vendor = vendorById(wo.vendorId);
                  return (
                    <tr
                      key={wo.id}
                      className="border-b border-border last:border-0 hover:bg-black/2"
                    >
                      <td className="px-5 py-3 font-medium tabular-nums">
                        <Link href={`/work-orders/${wo.id}`} className="hover:underline">
                          {wo.woNumber}
                        </Link>
                      </td>
                      <td className="px-5 py-3">
                        <div>{site?.name}</div>
                        <div className="text-xs text-muted">{account?.name}</div>
                      </td>
                      <td className="px-5 py-3 capitalize">
                        {wo.trade.replace(/_/g, " ")}
                      </td>
                      <td className="px-5 py-3">{vendor?.name ?? "Unassigned"}</td>
                      <td className="px-5 py-3 tabular-nums">
                        {wo.nte != null ? `$${wo.nte.toLocaleString()}` : "—"}
                      </td>
                      <td className="px-5 py-3">
                        <PriorityBadge priority={wo.priority} />
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          <StatusBadge status={wo.status} />
                          <ExceptionFlag wo={wo} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
