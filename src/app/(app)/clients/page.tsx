import Link from "next/link";
import { Building2, MapPin, Phone } from "lucide-react";
import { getAppData } from "@/lib/data/queries";
import { TERMINAL_STATUSES } from "@/types/work-order";
import { Tile, Pill, Empty, Money } from "@/components/ui";

export default async function ClientsPage() {
  const { accounts, sites, workOrders } = await getAppData();

  // Counts per account and per site: the audit flagged that the card list
  // carried no volume or value at all.
  const openByS = new Map<string, number>();
  const valueByS = new Map<string, number>();
  for (const wo of workOrders) {
    if (TERMINAL_STATUSES.includes(wo.status)) continue;
    openByS.set(wo.siteId, (openByS.get(wo.siteId) ?? 0) + 1);
    valueByS.set(wo.siteId, (valueByS.get(wo.siteId) ?? 0) + (wo.nte ?? 0));
  }

  const rows = accounts.map((account) => {
    const accountSites = sites.filter((s) => s.accountId === account.id);
    const openCount = accountSites.reduce((n, s) => n + (openByS.get(s.id) ?? 0), 0);
    const openValue = accountSites.reduce((n, s) => n + (valueByS.get(s.id) ?? 0), 0);
    return { account, accountSites, openCount, openValue };
  });

  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Clients</h1>
        <p className="mt-1 text-sm text-ink-2">
          {accounts.length} parent accounts · {sites.length} sites
        </p>
      </div>

      {rows.length === 0 ? (
        <Tile>
          <Empty title="No accounts yet" />
        </Tile>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {rows.map(({ account, accountSites, openCount, openValue }) => (
            <Tile key={account.id}>
              <Link href={`/clients/${account.id}`} className="flex items-start gap-3.5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-card bg-navy-tint text-navy-ink">
                  <Building2 className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{account.name}</p>
                  <p className="text-xs capitalize text-ink-3">
                    {account.type} · {accountSites.length}{" "}
                    {accountSites.length === 1 ? "site" : "sites"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <Pill tone={openCount > 0 ? "navy" : "neutral"}>
                    {openCount} open
                  </Pill>
                  {openValue > 0 && (
                    <span className="text-xs font-medium tabular-nums text-ink-2">
                      <Money amount={openValue} /> authorised
                    </span>
                  )}
                </div>
              </Link>

              {accountSites.length === 0 ? (
                <Empty title="No sites on file" />
              ) : (
                <ul className="mt-4 flex flex-col gap-1.5">
                  {accountSites.map((site) => {
                    const open = openByS.get(site.id) ?? 0;
                    return (
                      <li
                        key={site.id}
                        className="flex items-start gap-3 rounded-card bg-sunken px-3.5 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {site.storeCode && (
                              <span className="mr-1.5 tabular-nums text-ink-3">
                                {site.storeCode}
                              </span>
                            )}
                            {site.name}
                          </p>
                          <p className="mt-0.5 flex items-start gap-1.5 text-xs text-ink-3">
                            <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                            <span className="truncate">{site.address}</span>
                          </p>
                          {site.contactName && (
                            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-3">
                              <Phone className="h-3 w-3 shrink-0" />
                              {site.contactName}
                              {site.contactPhone && ` · ${site.contactPhone}`}
                            </p>
                          )}
                        </div>
                        {open > 0 && (
                          <Link
                            href={`/work-orders?site=${site.id}`}
                            className="shrink-0"
                            aria-label={`${open} open work orders at ${site.name}`}
                          >
                            <Pill tone="navy">{open}</Pill>
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Tile>
          ))}
        </div>
      )}
    </div>
  );
}
