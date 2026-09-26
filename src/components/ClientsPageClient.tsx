"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Building2, Home, MapPin, Phone, Plus } from "lucide-react";
import type { Account, ClientType, Site, WorkOrder } from "@/types/work-order";
import { TERMINAL_STATUSES } from "@/types/work-order";
import { createAccount } from "@/lib/actions/work-orders";
import { useAction } from "@/components/useAction";
import { Tile, Pill, Empty, Money, buttonClass, inputClass, FormField } from "@/components/ui";
import { Drawer } from "@/components/Drawer";
import { JobKindBadge } from "@/components/Badge";

type Filter = "all" | ClientType;

export function ClientsPageClient({
  accounts,
  sites,
  workOrders,
}: {
  accounts: Account[];
  sites: Site[];
  workOrders: WorkOrder[];
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ClientType>("residential");
  const { pending, submit } = useAction();

  const openByS = new Map<string, number>();
  const valueByS = new Map<string, number>();
  for (const wo of workOrders) {
    if (TERMINAL_STATUSES.includes(wo.status)) continue;
    openByS.set(wo.siteId, (openByS.get(wo.siteId) ?? 0) + 1);
    valueByS.set(wo.siteId, (valueByS.get(wo.siteId) ?? 0) + (wo.nte ?? 0));
  }

  const rows = useMemo(() => {
    return accounts
      .filter((account) => filter === "all" || account.type === filter)
      .map((account) => {
        const accountSites = sites.filter((s) => s.accountId === account.id);
        const openCount = accountSites.reduce((n, s) => n + (openByS.get(s.id) ?? 0), 0);
        const openValue = accountSites.reduce((n, s) => n + (valueByS.get(s.id) ?? 0), 0);
        return { account, accountSites, openCount, openValue };
      });
  }, [accounts, sites, filter, workOrders]);

  const commercialCount = accounts.filter((a) => a.type === "commercial").length;
  const residentialCount = accounts.filter((a) => a.type === "residential").length;

  function onCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    form.set("type", type);
    submit(createAccount, form, () => setOpen(false));
  }

  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">Clients</h1>
          <p className="mt-1 text-sm text-ink-2">
            {commercialCount} corporate · {residentialCount} residential · {sites.length} locations
          </p>
        </div>
        <button type="button" onClick={() => setOpen(true)} className={buttonClass("primary")}>
          <Plus className="h-4 w-4" />
          Add client
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(
          [
            ["all", "All", accounts.length],
            ["commercial", "Corporate", commercialCount],
            ["residential", "Residential", residentialCount],
          ] as const
        ).map(([key, label, count]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium ${
              filter === key ? "bg-navy text-white" : "bg-surface text-ink-2 shadow-soft hover:text-ink"
            }`}
          >
            {label}
            <span className={`rounded-full px-1.5 text-[11px] tabular-nums ${filter === key ? "bg-white/20" : "bg-tint"}`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <Tile>
          <Empty
            title={filter === "residential" ? "No residential clients yet" : "No clients yet"}
            hint="Add a homeowner or a corporate account — both run on the same dispatch board."
          />
        </Tile>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {rows.map(({ account, accountSites, openCount, openValue }) => (
            <Tile key={account.id}>
              <Link href={`/clients/${account.id}`} className="flex items-start gap-3.5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-card bg-navy-tint text-navy-ink">
                  {account.type === "residential" ? (
                    <Home className="h-5 w-5" />
                  ) : (
                    <Building2 className="h-5 w-5" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{account.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <JobKindBadge type={account.type} />
                    <p className="text-xs text-ink-3">
                      {accountSites.length}{" "}
                      {account.type === "residential"
                        ? accountSites.length === 1
                          ? "home"
                          : "homes"
                        : accountSites.length === 1
                          ? "site"
                          : "sites"}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <Pill tone={openCount > 0 ? "navy" : "neutral"}>{openCount} open</Pill>
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
                    const openJobs = openByS.get(site.id) ?? 0;
                    return (
                      <li
                        key={site.id}
                        className="flex items-start gap-3 rounded-card bg-sunken px-3.5 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {site.storeCode && (
                              <span className="mr-1.5 tabular-nums text-ink-3">{site.storeCode}</span>
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
                        {openJobs > 0 && (
                          <Link
                            href={`/work-orders?site=${site.id}`}
                            className="shrink-0"
                            aria-label={`${openJobs} open work orders at ${site.name}`}
                          >
                            <Pill tone="navy">{openJobs}</Pill>
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

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Add a client"
        sub="Corporate accounts and residential homeowners both live here."
        footer={
          <button type="submit" form="add-client" disabled={pending} className={buttonClass("primary", "w-full")}>
            {pending ? "Saving…" : type === "residential" ? "Add homeowner" : "Add corporate client"}
          </button>
        }
      >
        <form id="add-client" onSubmit={onCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => setType("commercial")}
              className={`rounded-card px-3 py-3 text-sm font-medium ${
                type === "commercial" ? "bg-navy text-white" : "bg-sunken text-ink-2"
              }`}
            >
              Corporate
            </button>
            <button
              type="button"
              onClick={() => setType("residential")}
              className={`rounded-card px-3 py-3 text-sm font-medium ${
                type === "residential" ? "bg-navy text-white" : "bg-sunken text-ink-2"
              }`}
            >
              Residential
            </button>
          </div>
          <input type="hidden" name="type" value={type} />
          <FormField
            label={type === "residential" ? "Homeowner name" : "Account name"}
            htmlFor="name"
          >
            <input
              id="name"
              name="name"
              required
              className={inputClass}
              placeholder={type === "residential" ? "Jordan Hale" : "Crash Champions"}
            />
          </FormField>
          {type === "commercial" && (
            <>
              <FormField label="Site / store name" htmlFor="siteName">
                <input id="siteName" name="siteName" className={inputClass} placeholder="CC549 Little Elm" />
              </FormField>
              <FormField label="Store code" htmlFor="storeCode">
                <input id="storeCode" name="storeCode" className={inputClass} placeholder="CC549" />
              </FormField>
            </>
          )}
          <FormField label="Address" htmlFor="address">
            <input
              id="address"
              name="address"
              required
              className={inputClass}
              placeholder="412 Elm Street, Little Elm, TX"
            />
          </FormField>
          <FormField label="Contact name" htmlFor="contactName">
            <input id="contactName" name="contactName" className={inputClass} />
          </FormField>
          <FormField label="Phone" htmlFor="contactPhone">
            <input id="contactPhone" name="contactPhone" className={inputClass} />
          </FormField>
          <FormField label="Email" htmlFor="contactEmail">
            <input id="contactEmail" name="contactEmail" type="email" className={inputClass} />
          </FormField>
        </form>
      </Drawer>
    </div>
  );
}
