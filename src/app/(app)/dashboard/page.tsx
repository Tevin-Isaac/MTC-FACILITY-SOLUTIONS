import Link from "next/link";
import {
  ClipboardList,
  AlertTriangle,
  FileClock,
  ReceiptText,
  ArrowRight,
} from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { StatusBadge, PriorityBadge } from "@/components/Badge";
import { CategoryBarChart } from "@/components/charts/CategoryBarChart";
import { SlaDonut } from "@/components/charts/SlaDonut";
import {
  mockWorkOrders,
  accountForSite,
  siteById,
  bucketForStatus,
  slaRisk,
  STATUS_BUCKETS,
} from "@/lib/mock-data";
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

  const bucketCounts = STATUS_BUCKETS.map((bucket) => ({
    label: bucket,
    value: mockWorkOrders.filter((wo) => bucketForStatus(wo.status) === bucket)
      .length,
  }));

  const tradeCounts = Object.entries(
    mockWorkOrders.reduce<Record<string, number>>((acc, wo) => {
      const label = wo.trade.replace(/_/g, " ");
      acc[label] = (acc[label] ?? 0) + 1;
      return acc;
    }, {})
  )
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  const risks = openWorkOrders.map((wo) => ({ wo, risk: slaRisk(wo) }));
  const slaCounts = {
    onTrack: risks.filter((r) => r.risk === "on_track").length,
    atRisk: risks.filter((r) => r.risk === "at_risk").length,
    breached: risks.filter((r) => r.risk === "breached").length,
  };
  const needsAttention = risks
    .filter((r) => r.risk !== "on_track")
    .sort((a, b) => Number(b.risk === "breached") - Number(a.risk === "breached"));

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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface p-5 lg:col-span-1">
          <h2 className="text-sm font-semibold">SLA health</h2>
          <p className="mt-1 text-xs text-muted">Across all open work orders</p>
          <div className="mt-4">
            <SlaDonut counts={slaCounts} />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5 lg:col-span-1">
          <h2 className="text-sm font-semibold">Work orders by stage</h2>
          <p className="mt-1 text-xs text-muted">All work orders, current pipeline stage</p>
          <div className="mt-2">
            <CategoryBarChart data={bucketCounts} />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5 lg:col-span-1">
          <h2 className="text-sm font-semibold">Work orders by trade</h2>
          <p className="mt-1 text-xs text-muted">All work orders, by trade</p>
          <div className="mt-2">
            <CategoryBarChart data={tradeCounts} />
          </div>
        </div>
      </div>

      {needsAttention.length > 0 && (
        <div className="rounded-xl border border-status-critical/30 bg-surface">
          <div className="flex items-center gap-2 border-b border-border px-5 py-4">
            <AlertTriangle className="h-4 w-4 text-status-critical" />
            <h2 className="text-sm font-semibold">Needs attention</h2>
            <span className="ml-auto rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
              {needsAttention.length}
            </span>
          </div>
          <ul className="divide-y divide-border">
            {needsAttention.map(({ wo, risk }) => {
              const site = siteById(wo.siteId);
              return (
                <li
                  key={wo.id}
                  className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm"
                >
                  <span className="font-medium">{wo.woNumber}</span>
                  <span className="text-muted">{site?.name}</span>
                  <PriorityBadge priority={wo.priority} />
                  <span
                    className={`ml-auto rounded-full px-2.5 py-1 text-xs font-medium ${
                      risk === "breached"
                        ? "bg-red-50 text-red-700"
                        : "bg-amber-50 text-amber-800"
                    }`}
                  >
                    {risk === "breached" ? "SLA breached" : "SLA at risk"}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="rounded-xl border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">Recent work orders</h2>
          <Link
            href="/work-orders"
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-navy underline-offset-4 hover:underline"
          >
            View all
            <ArrowRight className="h-3.5 w-3.5" />
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
