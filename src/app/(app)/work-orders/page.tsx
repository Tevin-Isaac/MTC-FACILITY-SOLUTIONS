import { Plus } from "lucide-react";
import { StatusBadge, PriorityBadge } from "@/components/Badge";
import {
  mockWorkOrders,
  accountForSite,
  siteById,
  vendorById,
} from "@/lib/mock-data";

export default function WorkOrdersPage() {
  const rows = [...mockWorkOrders].sort((a, b) =>
    a.createdAt < b.createdAt ? 1 : -1
  );

  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Work Orders</h1>
          <p className="mt-1 text-sm text-muted">
            {rows.length} total, across all accounts.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-navy px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-navy-dark"
        >
          <Plus className="h-4 w-4" />
          New Work Order
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
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
                    <td className="px-5 py-3 font-medium">{wo.woNumber}</td>
                    <td className="px-5 py-3">
                      <div>{site?.name}</div>
                      <div className="text-xs text-muted">{account?.name}</div>
                    </td>
                    <td className="px-5 py-3 capitalize">
                      {wo.trade.replace(/_/g, " ")}
                    </td>
                    <td className="px-5 py-3">{vendor?.name ?? "Unassigned"}</td>
                    <td className="px-5 py-3">
                      {wo.nte != null ? `$${wo.nte.toLocaleString()}` : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <PriorityBadge priority={wo.priority} />
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={wo.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
