"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { AnimatePresence, motion } from "framer-motion";
import { Search, ClipboardList, MapPin, Wrench, Building2, Home } from "lucide-react";
import { useAppData } from "@/components/AppDataProvider";
import { STATUS_LABEL } from "@/lib/domain";

const GROUP_CLASS =
  "text-xs font-medium text-ink-3 [&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-1.5";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const { workOrders, sites, vendors, accounts, siteById, accountForSite } = useAppData();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  function go(path: string) {
    router.push(path);
    setOpen(false);
  }

  const q = query.trim().toLowerCase();
  const searching = q.length >= 1;

  const woHits = useMemo(() => {
    if (!searching) return [];
    return workOrders
      .filter((wo) => {
        const site = siteById(wo.siteId);
        const account = accountForSite(wo.siteId);
        return [
          wo.woNumber,
          wo.legacyWoNumber,
          wo.poNumber,
          wo.externalTrackingNumber,
          wo.description,
          site?.name,
          site?.storeCode,
          site?.address,
          account?.name,
          STATUS_LABEL[wo.status],
          wo.trade,
        ]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(q));
      })
      .slice(0, 8);
  }, [searching, q, workOrders, siteById, accountForSite]);

  const siteHits = useMemo(() => {
    if (!searching) return [];
    return sites
      .filter((site) =>
        [site.name, site.storeCode, site.address, site.contactName]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(q))
      )
      .slice(0, 6);
  }, [searching, q, sites]);

  const clientHits = useMemo(() => {
    if (!searching) return [];
    return accounts
      .filter((account) =>
        [account.name, account.type].some((field) => field.toLowerCase().includes(q))
      )
      .slice(0, 6);
  }, [searching, q, accounts]);

  const vendorHits = useMemo(() => {
    if (!searching) return [];
    return vendors
      .filter((vendor) =>
        [vendor.name, vendor.trades.join(" "), vendor.phone, vendor.email]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(q))
      )
      .slice(0, 6);
  }, [searching, q, vendors]);

  const totalHits = woHits.length + siteHits.length + clientHits.length + vendorHits.length;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden w-full max-w-xl items-center gap-2.5 rounded-full bg-surface/80 px-4 py-2.5 text-sm text-ink-3 shadow-soft ring-1 ring-inset ring-hairline transition-all hover:text-ink hover:shadow-lift md:flex"
      >
        <Search className="h-4 w-4" />
        Search work orders, sites, vendors
        <kbd className="ml-auto rounded-md bg-tint px-1.5 py-0.5 text-[10px] font-medium text-ink-2">
          ⌘K
        </kbd>
      </button>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full p-2 text-ink-3 shadow-soft ring-1 ring-inset ring-hairline hover:bg-tint hover:text-ink md:hidden"
        aria-label="Search"
      >
        <Search className="h-5 w-5" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="fixed inset-0 z-50 flex items-start justify-center bg-navy-deep/35 px-4 pt-[10vh] backdrop-blur-md"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -14, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-xl overflow-hidden rounded-hero bg-surface shadow-hero"
              onClick={(e) => e.stopPropagation()}
            >
              <Command label="Search" shouldFilter={false}>
                <div className="flex items-center gap-2.5 border-b border-hairline px-4 py-3.5">
                  <Search className="h-4 w-4 text-ink-3" />
                  <Command.Input
                    autoFocus
                    value={query}
                    onValueChange={setQuery}
                    placeholder="Search work orders, homes, stores, vendors…"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-ink-3"
                  />
                </div>
                <Command.List className="max-h-[22rem] overflow-y-auto p-2">
                  {!searching && (
                    <p className="px-3 py-10 text-center text-sm text-ink-3">
                      Type a work order, site, homeowner, or vendor.
                    </p>
                  )}

                  {searching && totalHits === 0 && (
                    <Command.Empty className="px-3 py-8 text-center text-sm text-ink-3">
                      No matches for “{query.trim()}”.
                    </Command.Empty>
                  )}

                  {woHits.length > 0 && (
                    <Command.Group heading="Work orders" className={GROUP_CLASS}>
                      {woHits.map((wo) => {
                        const site = siteById(wo.siteId);
                        const account = accountForSite(wo.siteId);
                        return (
                          <PaletteItem
                            key={wo.id}
                            icon={ClipboardList}
                            label={wo.woNumber}
                            hint={`${account?.name ?? site?.name ?? "Unknown"} · ${wo.description}`}
                            onSelect={() => go(`/work-orders/${wo.id}`)}
                          />
                        );
                      })}
                    </Command.Group>
                  )}

                  {clientHits.length > 0 && (
                    <Command.Group heading="Clients" className={GROUP_CLASS}>
                      {clientHits.map((account) => (
                        <PaletteItem
                          key={account.id}
                          icon={account.type === "residential" ? Home : Building2}
                          label={account.name}
                          hint={account.type === "residential" ? "Residential" : "Corporate"}
                          onSelect={() => go(`/clients/${account.id}`)}
                        />
                      ))}
                    </Command.Group>
                  )}

                  {siteHits.length > 0 && (
                    <Command.Group heading="Sites & homes" className={GROUP_CLASS}>
                      {siteHits.map((site) => {
                        const account = accounts.find((a) => a.id === site.accountId);
                        return (
                          <PaletteItem
                            key={site.id}
                            icon={account?.type === "residential" ? Home : MapPin}
                            label={site.name}
                            hint={site.address}
                            onSelect={() => go(`/clients/${site.accountId}`)}
                          />
                        );
                      })}
                    </Command.Group>
                  )}

                  {vendorHits.length > 0 && (
                    <Command.Group heading="Vendors" className={GROUP_CLASS}>
                      {vendorHits.map((vendor) => (
                        <PaletteItem
                          key={vendor.id}
                          icon={Wrench}
                          label={vendor.name}
                          hint={vendor.trades.map((t) => t.replace(/_/g, " ")).join(", ")}
                          onSelect={() => go("/vendors")}
                        />
                      ))}
                    </Command.Group>
                  )}
                </Command.List>
              </Command>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function PaletteItem({
  icon: Icon,
  label,
  hint,
  onSelect,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint?: string;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      value={`${label} ${hint ?? ""}`}
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-2.5 rounded-control px-2.5 py-2 text-sm data-[selected=true]:bg-tint"
    >
      <Icon className="h-4 w-4 shrink-0 text-ink-3" />
      <span className="shrink-0 font-medium tabular-nums">{label}</span>
      {hint && <span className="truncate text-xs text-ink-3">{hint}</span>}
    </Command.Item>
  );
}
