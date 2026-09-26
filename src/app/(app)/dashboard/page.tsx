import {
  ClipboardList,
  AlertTriangle,
  FileClock,
  ReceiptText,
} from "lucide-react";
import { KpiCard } from "@/components/KpiCard";
import { DashboardHero } from "@/components/DashboardHero";
import { CategoryBarChart } from "@/components/charts/CategoryBarChart";
import { SlaDonut } from "@/components/charts/SlaDonut";
import { Reveal } from "@/components/motion";
import { Tile, SectionHead } from "@/components/ui";
import {
  DashboardAttention,
  DashboardQueue,
  DashboardActionQueues,
  AnimatedPhaseBars,
} from "@/components/DashboardWidgets";
import {
  phaseForStatus,
  slaRisk,
  seededTrend,
  PHASE_FAMILIES,
} from "@/lib/domain";
import { getAppData } from "@/lib/data/queries";
import { getLittleElmWeather } from "@/lib/weather";
import { TERMINAL_STATUSES } from "@/types/work-order";

function greetingFor(date: Date): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Chicago",
      hour: "numeric",
      hourCycle: "h23",
    }).format(date)
  );
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const [{ workOrders: allWorkOrders }, weather] = await Promise.all([
    getAppData(),
    getLittleElmWeather(),
  ]);

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
    phase,
    value: allWorkOrders.filter((wo) => phaseForStatus(wo.status) === phase).length,
  }));
  const phaseTotal = phaseCounts.reduce((n, p) => n + p.value, 0);
  const phaseMax = Math.max(1, ...phaseCounts.map((p) => p.value));

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

  const readyToBillValue = readyToBillOrInvoice.reduce(
    (sum, wo) => sum + (wo.nte ?? 0),
    0
  );

  const myQueue = [...openWorkOrders].sort((a, b) => {
    const aCd = a.slaResolveBy ? new Date(a.slaResolveBy).getTime() : Infinity;
    const bCd = b.slaResolveBy ? new Date(b.slaResolveBy).getTime() : Infinity;
    return aCd - bCd;
  });

  const attentionCount = slaCounts.breached + slaCounts.atRisk;
  const summary =
    attentionCount === 0
      ? `All ${openWorkOrders.length} open work orders are inside SLA. ${pendingQuotes.length} awaiting a client decision.`
      : `${attentionCount} work order${attentionCount === 1 ? "" : "s"} need attention — ${
          slaCounts.atRisk
        } at risk, ${slaCounts.breached} breached. ${pendingQuotes.length} quote${
          pendingQuotes.length === 1 ? "" : "s"
        } awaiting a client decision.`;

  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-5 p-4 sm:p-6 lg:gap-6 lg:p-8">
      <DashboardHero
        greeting={`${greetingFor(new Date())}, Tevin`}
        summary={summary}
        weather={weather}
        stats={[
          {
            label: "Open work orders",
            value: String(openWorkOrders.length),
            ratio: allWorkOrders.length ? openWorkOrders.length / allWorkOrders.length : 0,
          },
          {
            label: "Breaching SLA",
            value: String(slaCounts.breached),
            ratio: openWorkOrders.length ? slaCounts.breached / openWorkOrders.length : 0,
          },
          {
            label: "Ready to bill",
            value: `$${(readyToBillValue / 1000).toFixed(1)}k`,
          },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Open work orders"
          value={openWorkOrders.length}
          icon={<ClipboardList className="h-5 w-5" />}
          trend={seededTrend(11, openWorkOrders.length)}
          deltaGoodDirection="down"
          index={0}
        />
        <KpiCard
          label="Emergency, open"
          value={emergencyOpen.length}
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="critical"
          trend={seededTrend(23, emergencyOpen.length)}
          deltaGoodDirection="down"
          index={1}
        />
        <KpiCard
          label="Awaiting client decision"
          value={pendingQuotes.length}
          icon={<FileClock className="h-5 w-5" />}
          tone="warning"
          trend={seededTrend(37, pendingQuotes.length)}
          deltaGoodDirection="down"
          index={2}
        />
        <KpiCard
          label="Ready to bill"
          value={readyToBillOrInvoice.length}
          icon={<ReceiptText className="h-5 w-5" />}
          tone="good"
          trend={seededTrend(53, readyToBillOrInvoice.length)}
          deltaGoodDirection="up"
          index={3}
        />
      </div>

      <Reveal delay={0.08}>
        <DashboardActionQueues
          unassigned={openWorkOrders.filter((wo) => !wo.vendorId)}
          quotes={pendingQuotes}
          readyToBill={readyToBillOrInvoice}
          onHold={openWorkOrders.filter((wo) => wo.status === "on_hold")}
        />
      </Reveal>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Reveal className="lg:col-span-2" delay={0.1}>
          <DashboardAttention items={needsAttention.slice(0, 6)} />
        </Reveal>

        <Reveal delay={0.16}>
          <Tile className="h-full">
            <SectionHead title="SLA health" sub="Across all open work orders" />
            <div className="mt-6">
              <SlaDonut counts={slaCounts} />
            </div>
          </Tile>
        </Reveal>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Reveal delay={0.2}>
          <Tile className="h-full">
            <SectionHead title="Pipeline" sub="All work orders by phase family" />
            <AnimatedPhaseBars
              phaseCounts={phaseCounts}
              phaseMax={phaseMax}
              phaseTotal={phaseTotal}
            />
          </Tile>
        </Reveal>

        <Reveal className="lg:col-span-2" delay={0.26}>
          <Tile className="h-full">
            <SectionHead title="Work orders by trade" sub="All work orders, current volume" />
            <div className="mt-4">
              <CategoryBarChart data={tradeCounts} />
            </div>
          </Tile>
        </Reveal>
      </div>

      <Reveal delay={0.3}>
        <DashboardQueue items={myQueue.slice(0, 7)} />
      </Reveal>
    </div>
  );
}
