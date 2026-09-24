import Link from "next/link";
import {
  ClipboardList,
  AlertTriangle,
  FileClock,
  ReceiptText,
} from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { StatusBadge, PriorityBadge } from "@/components/Badge";
import { mockWorkOrders, accountForSite, siteById } from "@/lib/mock-data";
import { TERMINAL_STATUSES } from "@/types/work-order";

export default function DashboardPage() {
  const openWorkOrders = mockWorkOrders.filter(
    (wo) => !TERMINAL_STATUSES.includes(wo.status)
  );
  const emergencyOpen = openWorkOrders.filter((wo) =>
    wo.priority.startsWith("emergency")
  );
  const pendingQuotes = openWorkOrders.filter((wo) =>
    ["pending_quote", "quote_with_client"].includes(wo.status)
  );
  const readyToBillOrInvoice = mockWorkOrders.filter((wo) =>
    ["ready_to_bill", "ready_to_invoice"].includes(wo.status)
  );

  const recent = [...mockWorkOrders]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-8 p-6 md:p-8">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">
          Open work, SLA exposure, and what needs attention right now.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Open work orders" value={openWorkOrders.length} icon={ClipboardList} />
        <StatCard
          label="Emergency, open"
          value={emergencyOpen.length}
          icon={AlertTriangle}
          tone="danger"
        />
        <StatCard
          label="Pending quotes"
          value={pendingQuotes.length}
          icon={FileClock}
          tone="warning"
        />
        <StatCard
          label="Ready to bill / invoice"
          value={readyToBillOrInvoice.length}
          icon={ReceiptText}
        />
      </div>

      <div className="rounded-xl border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">Recent work orders</h2>
          <Link
            href="/work-orders"
            className="text-sm font-medium text-brand-navy underline-offset-4 hover:underline"
          >
            View all
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-180 text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                <th className="px-5 py-3 font-medium">WO #</th>
                <th className="px-5 py-3 font-medium">Site</th>
                <th className="px-5 py-3 font-medium">Trade</th>
                <th className="px-5 py-3 font-medium">Priority</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((wo) => {
                const site = siteById(wo.siteId);
                const account = accountForSite(wo.siteId);
                return (
                  <tr key={wo.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3 font-medium">{wo.woNumber}</td>
                    <td className="px-5 py-3">
                      <div>{site?.name}</div>
                      <div className="text-xs text-muted">{account?.name}</div>
                    </td>
                    <td className="px-5 py-3 capitalize">{wo.trade.replace(/_/g, " ")}</td>
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
