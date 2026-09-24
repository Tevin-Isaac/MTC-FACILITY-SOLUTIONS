import Link from "next/link";
import {
  ClipboardList,
  AlertTriangle,
  FileClock,
  ReceiptText,
  ArrowRight,
} from "lucide-react";
import { KpiCard } from "@/components/KpiCard";
import { DashboardHero } from "@/components/DashboardHero";
import { StatusBadge, PriorityBadge } from "@/components/Badge";
import { CategoryBarChart } from "@/components/charts/CategoryBarChart";
import { SlaDonut } from "@/components/charts/SlaDonut";
import {
  accountForSite as accountForSiteFn,
  siteById as siteByIdFn,
  phaseForStatus,
  slaRisk,
  slaCountdown,
  seededTrend,
  PHASE_FAMILIES,
} from "@/lib/domain";
import { getAppData } from "@/lib/data/queries";
import { TERMINAL_STATUSES } from "@/types/work-order";

export default async function DashboardPage() {
  const { accounts, sites, workOrders: allWorkOrders } = await getAppData();
  const siteById = (id: string) => siteByIdFn(sites, id);
  const accountForSite = (id: string) => accountForSiteFn(sites, accounts, id);

  const openWorkOrders = allWorkOrders.filter(
    (wo) => !TERMINAL_STATUSES.includes(wo.status)
  );
  const emergencyOpen = openWorkOrders.filter((wo) =>
    wo.priority.startsWith("emergency")
  );
  const pendingQuotes = openWorkOrders.filter((wo) =>
    ["pending_quote", "quote_with_client"].includes(wo.status)
  );
  const readyToBillOrInvoice = allWorkOrders.filter((wo) =>
    ["ready_to_bill", "ready_to_invoice"].includes(wo.status)
  );

  const phaseCounts = PHASE_FAMILIES.map((phase) => ({
    label: phase,
    value: allWorkOrders.filter((wo) => phaseForStatus(wo.status) === phase).length,
  }));

  const tradeCounts = Object.entries(
    allWorkOrders.reduce<Record<string, number>>((acc, wo) => {
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

  const overdueAr = readyToBillOrInvoice.reduce((sum, wo) => sum + (wo.nte ?? 0), 0);

  const myQueue = [...openWorkOrders].sort((a, b) => {
    const aCd = a.slaResolveBy ? new Date(a.slaResolveBy).getTime() : Infinity;
    const bCd = b.slaResolveBy ? new Date(b.slaResolveBy).getTime() : Infinity;
    return aCd - bCd;
  });

  const needsAttentionCount = slaCounts.breached + slaCounts.atRisk;
  const summary = `${needsAttentionCount} WO${needsAttentionCount === 1 ? "" : "s"} need${
    needsAttentionCount === 1 ? "s" : ""
  } attention (${slaCounts.atRisk} at risk, ${slaCounts.breached} breached), ${pendingQuotes.length} quote${
    pendingQuotes.length === 1 ? "" : "s"
  } awaiting client, $${overdueAr.toLocaleString()} ready to bill.`;

  return (
    <div className="flex flex-col gap-8 p-6 md:p-8">
      <DashboardHero greeting="Good afternoon, Tevin" summary={summary} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Open work orders"
          value={openWorkOrders.length}
          icon={<ClipboardList className="h-5 w-5" />}
          trend={seededTrend(11, openWorkOrders.length)}
          deltaGoodDirection="down"
        />
        <KpiCard
          label="Emergency, open"
          value={emergencyOpen.length}
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="danger"
          trend={seededTrend(23, emergencyOpen.length)}
          deltaGoodDirection="down"
        />
        <KpiCard
          label="Pending quotes"
          value={pendingQuotes.length}
          icon={<FileClock className="h-5 w-5" />}
          tone="warning"
          trend={seededTrend(37, pendingQuotes.length)}
          deltaGoodDirection="down"
        />
        <KpiCard
          label="Ready to bill / invoice"
          value={readyToBillOrInvoice.length}
          icon={<ReceiptText className="h-5 w-5" />}
          trend={seededTrend(53, readyToBillOrInvoice.length)}
          deltaGoodDirection="up"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl bg-surface shadow-sm ring-1 ring-black/5 p-5 lg:col-span-1 transition-shadow hover:shadow-md">
          <h2 className="text-sm font-semibold">SLA health</h2>
          <p className="mt-1 text-xs text-muted">Across all open work orders</p>
          <div className="mt-4">
            <SlaDonut counts={slaCounts} />
          </div>
        </div>

        <div className="rounded-2xl bg-surface shadow-sm ring-1 ring-black/5 p-5 lg:col-span-1 transition-shadow hover:shadow-md">
          <h2 className="text-sm font-semibold">Work orders by phase</h2>
          <p className="mt-1 text-xs text-muted">All work orders, current phase family</p>
          <div className="mt-2">
            <CategoryBarChart data={phaseCounts} />
          </div>
        </div>

        <div className="rounded-2xl bg-surface shadow-sm ring-1 ring-black/5 p-5 lg:col-span-1 transition-shadow hover:shadow-md">
          <h2 className="text-sm font-semibold">Work orders by trade</h2>
          <p className="mt-1 text-xs text-muted">All work orders, by trade</p>
          <div className="mt-2">
            <CategoryBarChart data={tradeCounts} />
          </div>
        </div>
      </div>

      {needsAttention.length > 0 && (
        <div className="rounded-2xl bg-surface shadow-sm ring-1 ring-status-critical/20">
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
                <li key={wo.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                  <Link href={`/work-orders/${wo.id}`} className="font-medium tabular-nums hover:underline">
                    {wo.woNumber}
                  </Link>
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

      <div className="rounded-2xl bg-surface shadow-sm ring-1 ring-black/5">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">My queue</h2>
          <Link
            href="/work-orders"
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-navy underline-offset-4 hover:underline"
          >
            View all
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-200 text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                <th className="px-5 py-3 font-medium">WO #</th>
                <th className="px-5 py-3 font-medium">Site</th>
                <th className="px-5 py-3 font-medium">Trade</th>
                <th className="px-5 py-3 font-medium">Priority</th>
                <th className="px-5 py-3 font-medium">SLA</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {myQueue.slice(0, 6).map((wo) => {
                const site = siteById(wo.siteId);
                const account = accountForSite(wo.siteId);
                const countdown = slaCountdown(wo);
                const risk = slaRisk(wo);
                return (
                  <tr key={wo.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3 font-medium tabular-nums">
                      <Link href={`/work-orders/${wo.id}`} className="hover:underline">
                        {wo.woNumber}
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <div>{site?.name}</div>
                      <div className="text-xs text-muted">{account?.name}</div>
                    </td>
                    <td className="px-5 py-3 capitalize">{wo.trade.replace(/_/g, " ")}</td>
                    <td className="px-5 py-3">
                      <PriorityBadge priority={wo.priority} />
                    </td>
                    <td className="px-5 py-3">
                      {countdown ? (
                        <span
                          className={
                            risk === "breached"
                              ? "font-medium text-status-critical"
                              : risk === "at_risk"
                                ? "font-medium text-status-warning"
                                : "text-muted"
                          }
                        >
                          {countdown}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
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
