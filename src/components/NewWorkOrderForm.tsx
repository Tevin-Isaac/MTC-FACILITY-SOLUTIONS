"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import type { Account, Site } from "@/types/work-order";
import { createWorkOrder } from "@/lib/actions/work-orders";
import { useAction } from "@/components/useAction";
import {
  Tile,
  SectionHead,
  FormField,
  inputClass,
  buttonClass,
} from "@/components/ui";

const TRADES = [
  "plumbing",
  "hvac",
  "electrical",
  "doors",
  "roofing",
  "general_construction",
  "flooring",
  "locksmith",
  "fire_life_safety",
  "handyman",
] as const;

const PRIORITIES = [
  { value: "emergency_same_day", label: "Emergency · same day (8hr resolve)" },
  { value: "emergency_4_hour", label: "Emergency · 4 hour" },
  { value: "priority_24_hour", label: "Priority · 24 hour" },
  { value: "standard_48_hour", label: "Standard · 48 hour" },
  { value: "routine_scheduled", label: "Routine · scheduled" },
] as const;

const SOURCES = [
  { value: "service_channel", label: "ServiceChannel" },
  { value: "outlook_email", label: "Email (Outlook)" },
  { value: "phone", label: "Phone call" },
  { value: "manual", label: "Entered manually" },
] as const;

export function NewWorkOrderForm({
  accounts,
  sites,
}: {
  accounts: Account[];
  sites: Site[];
}) {
  const router = useRouter();
  const { pending, submit } = useAction();

  // Sites are grouped by parent account, which is how coordinators think
  // about them — ~1,800 child sites under a handful of accounts.
  const grouped = accounts
    .map((account) => ({
      account,
      sites: sites.filter((s) => s.accountId === account.id),
    }))
    .filter((g) => g.sites.length > 0);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submit(createWorkOrder, new FormData(event.currentTarget), () => {
      router.push("/work-orders");
    });
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <div>
        <Link
          href="/work-orders"
          className="inline-flex items-center gap-1.5 text-sm text-ink-2 transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          Work orders
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-[-0.02em]">New work order</h1>
        <p className="mt-1 text-sm text-ink-2">
          The SLA clock starts as soon as this is saved, based on the priority you pick.
        </p>
      </div>

      <form onSubmit={onSubmit}>
        <Tile>
          <SectionHead title="Where and what" />
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FormField label="Site" htmlFor="siteId">
                <select id="siteId" name="siteId" required className={inputClass} defaultValue="">
                  <option value="" disabled>
                    Choose a site…
                  </option>
                  {grouped.map(({ account, sites: accountSites }) => (
                    <optgroup key={account.id} label={account.name}>
                      {accountSites.map((site) => (
                        <option key={site.id} value={site.id}>
                          {site.storeCode ? `${site.storeCode} — ` : ""}
                          {site.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </FormField>
            </div>

            <FormField label="Trade" htmlFor="trade">
              <select id="trade" name="trade" required className={`${inputClass} capitalize`} defaultValue="">
                <option value="" disabled>
                  Choose a trade…
                </option>
                {TRADES.map((trade) => (
                  <option key={trade} value={trade} className="capitalize">
                    {trade.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Priority" htmlFor="priority">
              <select
                id="priority"
                name="priority"
                required
                className={inputClass}
                defaultValue="standard_48_hour"
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </FormField>

            <div className="sm:col-span-2">
              <FormField
                label="Description"
                htmlFor="description"
                hint="What the store reported. Keep the vendor-facing scope in here."
              >
                <textarea
                  id="description"
                  name="description"
                  required
                  rows={3}
                  placeholder="RTU not cooling, high indoor temp on the sales floor"
                  className={`${inputClass} resize-y`}
                />
              </FormField>
            </div>
          </div>
        </Tile>

        <Tile className="mt-4">
          <SectionHead
            title="Money and references"
            sub="Optional at intake — the NTE can be raised later with an approval logged against it"
          />
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              label="NTE"
              htmlFor="nte"
              hint="Vendor cap. The client DNE is set 18% above this so margin is visible from day one."
            >
              <input
                id="nte"
                name="nte"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                placeholder="500"
                className={inputClass}
              />
            </FormField>

            <FormField label="Client PO number" htmlFor="poNumber">
              <input id="poNumber" name="poNumber" placeholder="PO-55320" className={inputClass} />
            </FormField>

            <FormField label="How it came in" htmlFor="source">
              <select id="source" name="source" className={inputClass} defaultValue="service_channel">
                {SOURCES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField
              label="Reported by"
              htmlFor="reporterName"
              hint="Store contact. Never shown to vendors."
            >
              <input id="reporterName" name="reporterName" placeholder="Alex Rivera" className={inputClass} />
            </FormField>

            <FormField label="Reporter phone" htmlFor="reporterCell">
              <input id="reporterCell" name="reporterCell" placeholder="214-555-0199" className={inputClass} />
            </FormField>
          </div>
        </Tile>

        <div className="mt-5 flex items-center justify-end gap-2">
          <Link href="/work-orders" className={buttonClass("ghost")}>
            Cancel
          </Link>
          <button type="submit" disabled={pending} className={buttonClass("primary")}>
            <Check className="h-4 w-4" />
            {pending ? "Creating…" : "Create work order"}
          </button>
        </div>
      </form>
    </div>
  );
}
