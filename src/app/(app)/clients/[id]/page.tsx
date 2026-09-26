import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Phone } from "lucide-react";
import { getAppData } from "@/lib/data/queries";
import { TERMINAL_STATUSES } from "@/types/work-order";
import { Tile, SectionHead, Pill, Money, Empty, LinkButton } from "@/components/ui";
import { StatusBadge, PriorityBadge } from "@/components/Badge";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { accounts, sites, workOrders } = await getAppData();
  const account = accounts.find((a) => a.id === id);
  if (!account) notFound();

  const accountSites = sites.filter((s) => s.accountId === account.id);
  const siteIds = new Set(accountSites.map((s) => s.id));
  const accountWos = workOrders.filter((wo) => siteIds.has(wo.siteId));
  const open = accountWos.filter((wo) => !TERMINAL_STATUSES.includes(wo.status));
  const openValue = open.reduce((sum, wo) => sum + (wo.nte ?? 0), 0);

  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <Link href="/clients" className="inline-flex w-fit items-center gap-1.5 text-sm text-ink-2 hover:text-ink">
        <ArrowLeft className="h-4 w-4" />
        Clients
      </Link>

      <Tile>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.02em]">{account.name}</h1>
            <p className="mt-1 text-sm capitalize text-ink-2">
              {account.type} · {accountSites.length} sites · {open.length} open work orders
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-ink-3">Open authorised</p>
            <p className="text-2xl font-semibold tabular-nums">
              <Money amount={openValue} />
            </p>
          </div>
        </div>
      </Tile>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Tile className="lg:col-span-1">
          <SectionHead title="Sites" />
          {accountSites.length === 0 ? (
            <Empty title="No sites" />
          ) : (
            <ul className="mt-4 flex flex-col gap-2">
              {accountSites.map((site) => {
                const count = open.filter((wo) => wo.siteId === site.id).length;
                return (
                  <li key={site.id} className="rounded-card bg-sunken px-3.5 py-3">
                    <p className="text-sm font-medium">
                      {site.storeCode && (
                        <span className="mr-1.5 tabular-nums text-ink-3">{site.storeCode}</span>
                      )}
                      {site.name}
                    </p>
                    <p className="mt-1 flex items-start gap-1.5 text-xs text-ink-3">
                      <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                      {site.address}
                    </p>
                    {site.contactName && (
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-3">
                        <Phone className="h-3 w-3" />
                        {site.contactName}
                        {site.contactPhone && ` · ${site.contactPhone}`}
                      </p>
                    )}
                    {count > 0 && (
                      <Link href={`/work-orders?site=${site.id}`} className="mt-2 inline-block">
                        <Pill tone="navy">{count} open</Pill>
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Tile>

        <Tile className="lg:col-span-2" padded={false}>
          <div className="flex items-center justify-between px-5 pt-5 sm:px-6">
            <SectionHead title="Work orders" sub="All work for this parent account" />
            <LinkButton href="/work-orders/new" variant="soft">
              New work order
            </LinkButton>
          </div>
          {accountWos.length === 0 ? (
            <Empty title="No work orders yet" />
          ) : (
            <ul className="mt-4 flex flex-col gap-1.5 px-3 pb-4">
              {accountWos.slice(0, 20).map((wo) => {
                const site = accountSites.find((s) => s.id === wo.siteId);
                return (
                  <li key={wo.id}>
                    <Link
                      href={`/work-orders/${wo.id}`}
                      className="flex flex-wrap items-center gap-3 rounded-card bg-sunken px-4 py-3 hover:bg-tint"
                    >
                      <span className="font-semibold tabular-nums">{wo.woNumber}</span>
                      <span className="min-w-0 flex-1 truncate text-sm text-ink-2">{site?.name}</span>
                      <PriorityBadge priority={wo.priority} />
                      <StatusBadge status={wo.status} />
                      <span className="text-sm font-semibold">
                        <Money amount={wo.nte} />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Tile>
      </div>
    </div>
  );
}
