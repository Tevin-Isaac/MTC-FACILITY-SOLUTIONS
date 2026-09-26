import { ClipboardList, AlertTriangle, FileClock, Truck } from "lucide-react";
import { KpiCard } from "@/components/KpiCard";
import { DashboardHero } from "@/components/DashboardHero";
import { Reveal } from "@/components/motion";
import {
  DashboardAttention,
  DashboardQueue,
  DashboardActionQueues,
  DashboardJobMix,
} from "@/components/DashboardWidgets";
import { slaRisk, seededTrend } from "@/lib/domain";
import { getAppData } from "@/lib/data/queries";
import { getLittleElmWeather } from "@/lib/weather";
import { getSession } from "@/lib/auth";
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

function firstName(name: string | undefined): string {
  const part = name?.trim().split(/\s+/)[0];
  return part || "there";
}

export default async function DashboardPage() {
  const [session, { workOrders: allWorkOrders, accounts, sites }, weather] = await Promise.all([
    getSession(),
    getAppData(),
    getLittleElmWeather(),
  ]);
  const siteType = new Map(sites.map((site) => [site.id, accounts.find((a) => a.id === site.accountId)?.type]));

  const openWorkOrders = allWorkOrders.filter((wo) => !TERMINAL_STATUSES.includes(wo.status));
  const commercialOpen = openWorkOrders.filter((wo) => siteType.get(wo.siteId) !== "residential").length;
  const residentialOpen = openWorkOrders.filter((wo) => siteType.get(wo.siteId) === "residential").length;
  const emergencyOpen = openWorkOrders.filter((wo) => wo.priority.startsWith("emergency"));
  const needsDispatch = openWorkOrders.filter((wo) => !wo.vendorId && wo.status === "new");
  const needsQuote = openWorkOrders.filter((wo) => wo.status === "pending_quote");
  const pendingQuotes = openWorkOrders.filter((wo) =>
    ["pending_quote", "quote_with_client"].includes(wo.status)
  );

  const risks = openWorkOrders.map((wo) => ({ wo, risk: slaRisk(wo) }));
  const slaCounts = {
    atRisk: risks.filter((r) => r.risk === "at_risk").length,
    breached: risks.filter((r) => r.risk === "breached").length,
  };
  const needsAttention = risks
    .filter((r) => r.risk !== "on_track")
    .sort((a, b) => Number(b.risk === "breached") - Number(a.risk === "breached"));

  const myQueue = [...openWorkOrders].sort((a, b) => {
    const aCd = a.slaResolveBy ? new Date(a.slaResolveBy).getTime() : Infinity;
    const bCd = b.slaResolveBy ? new Date(b.slaResolveBy).getTime() : Infinity;
    return aCd - bCd;
  });

  const attentionCount = slaCounts.breached + slaCounts.atRisk;
  const summary =
    attentionCount === 0
      ? `${openWorkOrders.length} open jobs. ${needsDispatch.length} waiting on dispatch, ${needsQuote.length} need a quote.`
      : `${attentionCount} job${attentionCount === 1 ? "" : "s"} need attention — ${
          slaCounts.atRisk
        } at risk, ${slaCounts.breached} breached. Dispatch and quotes first.`;

  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-5 p-4 sm:p-6 lg:gap-6 lg:p-8">
      <DashboardHero
        greeting={`${greetingFor(new Date())}, ${firstName(session?.name)}`}
        summary={summary}
        weather={weather}
        stats={[
          {
            label: "Open jobs",
            value: String(openWorkOrders.length),
            ratio: allWorkOrders.length ? openWorkOrders.length / allWorkOrders.length : 0,
          },
          {
            label: "Need dispatch",
            value: String(needsDispatch.length),
            ratio: openWorkOrders.length ? needsDispatch.length / openWorkOrders.length : 0,
          },
          {
            label: "Quotes waiting",
            value: String(pendingQuotes.length),
          },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Open jobs"
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
          label="Need dispatch"
          value={needsDispatch.length}
          icon={<Truck className="h-5 w-5" />}
          tone="warning"
          trend={seededTrend(31, needsDispatch.length)}
          deltaGoodDirection="down"
          index={2}
        />
        <KpiCard
          label="Quotes to move"
          value={pendingQuotes.length}
          icon={<FileClock className="h-5 w-5" />}
          tone="warning"
          trend={seededTrend(37, pendingQuotes.length)}
          deltaGoodDirection="down"
          index={3}
        />
      </div>

      <Reveal delay={0.06}>
        <DashboardJobMix commercial={commercialOpen} residential={residentialOpen} />
      </Reveal>

      <Reveal delay={0.08}>
        <DashboardActionQueues
          unassigned={needsDispatch}
          quotes={openWorkOrders.filter((wo) => wo.status === "quote_with_client")}
          readyToBill={[]}
          needsQuote={needsQuote}
          onHold={openWorkOrders.filter((wo) => wo.status === "on_hold")}
          mode="ops"
        />
      </Reveal>

      <Reveal delay={0.1}>
        <DashboardAttention items={needsAttention.slice(0, 6)} />
      </Reveal>

      <Reveal delay={0.14}>
        <DashboardQueue items={myQueue.slice(0, 8)} />
      </Reveal>
    </div>
  );
}
