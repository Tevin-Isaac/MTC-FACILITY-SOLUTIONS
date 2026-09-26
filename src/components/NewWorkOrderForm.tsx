"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Building2, Home } from "lucide-react";
import type { Account, ClientType, Site } from "@/types/work-order";
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

export function NewWorkOrderForm({
  accounts,
  sites,
}: {
  accounts: Account[];
  sites: Site[];
}) {
  const router = useRouter();
  const { pending, submit } = useAction();
  const [jobKind, setJobKind] = useState<ClientType>("commercial");
  const [newHome, setNewHome] = useState(false);

  const grouped = useMemo(
    () =>
      accounts
        .filter((account) => account.type === jobKind)
        .map((account) => ({
          account,
          sites: sites.filter((s) => s.accountId === account.id),
        }))
        .filter((g) => g.sites.length > 0),
    [accounts, sites, jobKind]
  );

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    form.set("jobKind", jobKind);
    form.set("newHome", jobKind === "residential" && newHome ? "yes" : "no");
    submit(createWorkOrder, form, () => {
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
          Corporate stores and residential homes use the same board. Pick the job type first.
        </p>
      </div>

      <form onSubmit={onSubmit}>
        <Tile>
          <SectionHead title="Job type" sub="Residential homes sit next to corporate sites — same dispatch, different intake." />
          <div className="mt-5 grid grid-cols-2 gap-2">
            <KindButton
              active={jobKind === "commercial"}
              icon={Building2}
              title="Corporate"
              hint="Stores, portfolios, ServiceChannel"
              onClick={() => {
                setJobKind("commercial");
                setNewHome(false);
              }}
            />
            <KindButton
              active={jobKind === "residential"}
              icon={Home}
              title="Residential"
              hint="Homeowners, single addresses"
              onClick={() => setJobKind("residential")}
            />
          </div>
          <input type="hidden" name="jobKind" value={jobKind} />
          <input type="hidden" name="newHome" value={jobKind === "residential" && newHome ? "yes" : "no"} />
        </Tile>

        <Tile className="mt-4">
          <SectionHead title="Where and what" />
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {jobKind === "residential" && (
              <div className="sm:col-span-2 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setNewHome(false)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                    !newHome ? "bg-navy text-white" : "bg-tint text-ink-2"
                  }`}
                >
                  Existing home
                </button>
                <button
                  type="button"
                  onClick={() => setNewHome(true)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                    newHome ? "bg-navy text-white" : "bg-tint text-ink-2"
                  }`}
                >
                  New homeowner
                </button>
              </div>
            )}

            {jobKind === "residential" && newHome ? (
              <>
                <FormField label="Homeowner" htmlFor="homeownerName">
                  <input
                    id="homeownerName"
                    name="homeownerName"
                    required
                    placeholder="Jordan Hale"
                    className={inputClass}
                  />
                </FormField>
                <FormField label="Phone" htmlFor="homePhone">
                  <input id="homePhone" name="homePhone" placeholder="214-555-0144" className={inputClass} />
                </FormField>
                <div className="sm:col-span-2">
                  <FormField label="Home address" htmlFor="homeAddress">
                    <input
                      id="homeAddress"
                      name="homeAddress"
                      required
                      placeholder="412 Elm Street, Little Elm, TX"
                      className={inputClass}
                    />
                  </FormField>
                </div>
                <FormField label="Email" htmlFor="homeEmail">
                  <input id="homeEmail" name="homeEmail" type="email" placeholder="home@email.com" className={inputClass} />
                </FormField>
              </>
            ) : (
              <div className="sm:col-span-2">
                <FormField
                  label={jobKind === "residential" ? "Home" : "Site"}
                  htmlFor="siteId"
                  hint={
                    grouped.length === 0
                      ? jobKind === "residential"
                        ? "No homes on file yet — switch to New homeowner."
                        : "No corporate sites on file yet."
                      : undefined
                  }
                >
                  <select id="siteId" name="siteId" required={!newHome} className={inputClass} defaultValue="">
                    <option value="" disabled>
                      {jobKind === "residential" ? "Choose a home…" : "Choose a site…"}
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
            )}

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
                hint={
                  jobKind === "residential"
                    ? "What the homeowner reported."
                    : "What the store reported. Keep the vendor-facing scope in here."
                }
              >
                <textarea
                  id="description"
                  name="description"
                  required
                  rows={3}
                  placeholder={
                    jobKind === "residential"
                      ? "AC not cooling upstairs, thermostat blank"
                      : "RTU not cooling, high indoor temp on the sales floor"
                  }
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

            <FormField label={jobKind === "residential" ? "Homeowner PO / reference" : "Client PO number"} htmlFor="poNumber">
              <input id="poNumber" name="poNumber" placeholder={jobKind === "residential" ? "Optional" : "PO-55320"} className={inputClass} />
            </FormField>

            <FormField label="How it came in" htmlFor="source">
              <select
                id="source"
                name="source"
                className={inputClass}
                defaultValue={jobKind === "residential" ? "phone" : "service_channel"}
                key={jobKind}
              >
                {jobKind === "commercial" && <option value="service_channel">ServiceChannel</option>}
                <option value="outlook_email">Email (Outlook)</option>
                <option value="phone">Phone call</option>
                <option value="manual">Entered manually</option>
              </select>
            </FormField>

            <FormField
              label={jobKind === "residential" ? "Homeowner contact" : "Reported by"}
              htmlFor="reporterName"
              hint="Never shown to vendors."
            >
              <input id="reporterName" name="reporterName" placeholder="Alex Rivera" className={inputClass} />
            </FormField>

            <FormField label="Contact phone" htmlFor="reporterCell">
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

function KindButton({
  active,
  icon: Icon,
  title,
  hint,
  onClick,
}: {
  active: boolean;
  icon: typeof Home;
  title: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-card px-4 py-4 text-left transition-all ${
        active
          ? "bg-navy text-white shadow-soft"
          : "bg-sunken text-ink hover:bg-tint"
      }`}
    >
      <Icon className={`h-5 w-5 ${active ? "text-gold" : "text-ink-3"}`} />
      <p className="mt-2 text-sm font-semibold">{title}</p>
      <p className={`mt-0.5 text-xs ${active ? "text-white/70" : "text-ink-3"}`}>{hint}</p>
    </button>
  );
}
