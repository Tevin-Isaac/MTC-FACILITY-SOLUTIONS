import { headers } from "next/headers";
import Link from "next/link";
import {
  Building2,
  ClipboardList,
  ReceiptText,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { KpiCard } from "@/components/KpiCard";
import { DashboardHero } from "@/components/DashboardHero";
import { CategoryBarChart } from "@/components/charts/CategoryBarChart";
import { SlaDonut } from "@/components/charts/SlaDonut";
import { Reveal } from "@/components/motion";
import { Tile, SectionHead, Money, Pill } from "@/components/ui";
import {
  DashboardActionQueues,
  AnimatedPhaseBars,
} from "@/components/DashboardWidgets";
import { StaffAdmin } from "@/components/StaffAdmin";
import { AdminIntegrations } from "@/components/AdminIntegrations";
import { requireAdmin } from "@/lib/auth";
import { listStaff } from "@/lib/data/staff";
import { getAppData, getInvoices } from "@/lib/data/queries";
import {
  intakeWebhookSecret,
  outlookConfigured,
  serviceChannelConfigured,
} from "@/lib/integrations/config";
import {
  phaseForStatus,
  slaRisk,
  seededTrend,
  vendorComplianceStatus,
  PHASE_FAMILIES,
} from "@/lib/domain";
import { TERMINAL_STATUSES } from "@/types/work-order";

export default async function AdminPage() {
  const session = await requireAdmin();
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const proto = headerList.get("x-forwarded-proto") ?? "http";

  const [{ workOrders, vendors, accounts }, invoices, staff] = await Promise.all([
    getAppData(),
    getInvoices().catch(() => []),
    listStaff().catch(() => [
      {
        id: session.userId,
        email: session.email,
        name: session.name,
        role: session.role,
        lastSignInAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
    ]),
  ]);

  const open = workOrders.filter((wo) => !TERMINAL_STATUSES.includes(wo.status));
  const ready = workOrders.filter((wo) =>
    ["ready_to_bill", "ready_to_invoice"].includes(wo.status)
  );
  const readyValue = ready.reduce((sum, wo) => sum + (wo.dne ?? wo.nte ?? 0), 0);
  const openAr = invoices
    .filter((invoice) => invoice.status !== "paid")
    .reduce((sum, invoice) => sum + invoice.amount, 0);
  const expiredVendors = vendors.filter((vendor) => vendorComplianceStatus(vendor) === "expired");
  const risks = open.map((wo) => ({ wo, risk: slaRisk(wo) }));
  const slaCounts = {
    onTrack: risks.filter((item) => item.risk === "on_track").length,
    atRisk: risks.filter((item) => item.risk === "at_risk").length,
    breached: risks.filter((item) => item.risk === "breached").length,
  };

  const phaseCounts = PHASE_FAMILIES.map((phase) => ({
    phase,
    value: workOrders.filter((wo) => phaseForStatus(wo.status) === phase).length,
  }));
  const phaseTotal = phaseCounts.reduce((n, item) => n + item.value, 0);
  const phaseMax = Math.max(1, ...phaseCounts.map((item) => item.value));
  const tradeCounts = Object.entries(
    workOrders.reduce<Record<string, number>>((acc, wo) => {
      const label = wo.trade.replace(/_/g, " ");
      acc[label] = (acc[label] ?? 0) + 1;
      return acc;
    }, {})
  )
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-5 p-4 sm:p-6 lg:gap-6 lg:p-8">
      <DashboardHero
        eyebrow="Admin"
        greeting="Control plane"
        summary="Users, money, integrations, and vendor compliance. The floor dashboard stays for day-to-day dispatch."
        weather={null}
        primary={{ href: "/billing", label: "Open billing" }}
        secondary={{ href: "/dashboard", label: "Go to floor" }}
        stats={[
          { label: "Open work", value: String(open.length) },
          { label: "Open AR", value: `$${(openAr / 1000).toFixed(1)}k` },
          { label: "Blocked vendors", value: String(expiredVendors.length) },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Open work orders"
          value={open.length}
          icon={<ClipboardList className="h-5 w-5" />}
          trend={seededTrend(11, open.length)}
          deltaGoodDirection="down"
          index={0}
        />
        <KpiCard
          label="Ready to bill"
          value={ready.length}
          icon={<ReceiptText className="h-5 w-5" />}
          tone="good"
          trend={seededTrend(53, ready.length)}
          deltaGoodDirection="up"
          index={1}
        />
        <KpiCard
          label="Accounts"
          value={accounts.length}
          icon={<Building2 className="h-5 w-5" />}
          trend={seededTrend(17, accounts.length)}
          deltaGoodDirection="up"
          index={2}
        />
        <KpiCard
          label="Vendor compliance"
          value={expiredVendors.length}
          icon={expiredVendors.length ? <ShieldAlert className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
          tone={expiredVendors.length ? "critical" : "good"}
          trend={seededTrend(29, expiredVendors.length)}
          deltaGoodDirection="down"
          index={3}
        />
      </div>

      <Reveal delay={0.06}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Tile>
            <p className="text-xs font-medium text-ink-3">Ready to bill</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">
              <Money amount={readyValue} />
            </p>
            <Link href="/billing" className="mt-2 inline-block text-sm text-navy-ink hover:underline">
              Send invoices
            </Link>
          </Tile>
          <Tile>
            <p className="text-xs font-medium text-ink-3">Open AR</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">
              <Money amount={openAr} />
            </p>
            <p className="mt-2 text-sm text-ink-2">
              {invoices.filter((invoice) => invoice.status !== "paid").length} unpaid invoices
            </p>
          </Tile>
          <Tile>
            <p className="text-xs font-medium text-ink-3">SLA</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">{slaCounts.breached}</p>
            <p className="mt-2 text-sm text-ink-2">
              {slaCounts.atRisk} at risk · {slaCounts.onTrack} on track
            </p>
          </Tile>
        </div>
      </Reveal>

      <Reveal delay={0.08}>
        <DashboardActionQueues
          unassigned={open.filter((wo) => !wo.vendorId)}
          quotes={open.filter((wo) => ["pending_quote", "quote_with_client"].includes(wo.status))}
          readyToBill={ready}
          onHold={open.filter((wo) => wo.status === "on_hold")}
        />
      </Reveal>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Reveal delay={0.1}>
          <Tile className="h-full">
            <SectionHead title="Pipeline" sub="Every work order by phase" />
            <AnimatedPhaseBars phaseCounts={phaseCounts} phaseMax={phaseMax} phaseTotal={phaseTotal} />
          </Tile>
        </Reveal>
        <Reveal className="lg:col-span-2" delay={0.14}>
          <Tile className="h-full">
            <SectionHead title="Work by trade" sub="Volume across the book" />
            <div className="mt-4">
              <CategoryBarChart data={tradeCounts} />
            </div>
          </Tile>
        </Reveal>
      </div>

      <Reveal delay={0.16}>
        <Tile>
          <SectionHead title="SLA health" sub="Open work only" />
          <div className="mt-6 max-w-sm">
            <SlaDonut counts={slaCounts} />
          </div>
        </Tile>
      </Reveal>

      <Reveal delay={0.18}>
        <AdminIntegrations
          serviceChannel={serviceChannelConfigured()}
          outlook={outlookConfigured()}
          webhookSecret={intakeWebhookSecret()}
          origin={`${proto}://${host}`}
        />
      </Reveal>

      <Reveal delay={0.2}>
        <StaffAdmin staff={staff} currentUserId={session.userId} />
      </Reveal>

      <Reveal delay={0.22}>
        <Tile>
          <SectionHead title="Vendor compliance" sub="Expired COI or license blocks dispatch" />
          {expiredVendors.length === 0 ? (
            <p className="mt-4 text-sm text-ink-2">All trade partners are clear to dispatch.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {expiredVendors.map((vendor) => (
                <li key={vendor.id} className="flex items-center justify-between rounded-card bg-sunken px-4 py-3">
                  <span className="font-medium">{vendor.name}</span>
                  <Pill tone="critical">Blocked</Pill>
                </li>
              ))}
            </ul>
          )}
          <Link href="/vendors" className="mt-4 inline-block text-sm text-navy-ink hover:underline">
            Open vendor directory
          </Link>
        </Tile>
      </Reveal>
    </div>
  );
}
