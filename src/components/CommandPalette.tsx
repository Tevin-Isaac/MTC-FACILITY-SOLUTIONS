"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  LayoutDashboard,
  ClipboardList,
  Building2,
  Wrench,
  ReceiptText,
  Plus,
  Moon,
  Search,
  MapPin,
} from "lucide-react";
import { useAppData } from "@/components/AppDataProvider";
import { STATUS_LABEL } from "@/lib/domain";

const GROUP_CLASS =
  "text-xs font-medium text-ink-3 [&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-1.5";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { workOrders, sites, vendors, siteById, accountForSite } = useAppData();

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

  function go(path: string) {
    router.push(path);
    setOpen(false);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    window.localStorage.setItem("mtc-theme", next);
    setOpen(false);
    toast.success(`Switched to ${next} mode`);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden w-full max-w-sm items-center gap-2.5 rounded-full bg-surface px-4 py-2.5 text-sm text-ink-3 shadow-soft transition-colors hover:text-ink md:flex"
      >
        <Search className="h-4 w-4" />
        Search work orders, sites, vendors
        <kbd className="ml-auto rounded-md bg-tint px-1.5 py-0.5 text-[10px] font-medium text-ink-2">
          ⌘K
        </kbd>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-start justify-center bg-navy-deep/40 px-4 pt-[12vh] backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="w-full max-w-xl overflow-hidden rounded-tile bg-surface shadow-lift"
              onClick={(e) => e.stopPropagation()}
            >
              <Command label="Command palette">
                <div className="flex items-center gap-2.5 border-b border-hairline px-4 py-3.5">
                  <Search className="h-4 w-4 text-ink-3" />
                  <Command.Input
                    autoFocus
                    placeholder="Search by WO number, PO, site, vendor…"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-ink-3"
                  />
                </div>
                <Command.List className="max-h-[22rem] overflow-y-auto p-2">
                  <Command.Empty className="px-3 py-8 text-center text-sm text-ink-3">
                    No matches.
                  </Command.Empty>

                  <Command.Group heading="Actions" className={GROUP_CLASS}>
                    <PaletteItem
                      icon={Plus}
                      label="New work order"
                      onSelect={() => go("/work-orders/new")}
                    />
                    <PaletteItem
                      icon={Moon}
                      label="Toggle dark mode"
                      onSelect={toggleTheme}
                    />
                  </Command.Group>

                  <Command.Group heading="Navigate" className={GROUP_CLASS}>
                    <PaletteItem icon={LayoutDashboard} label="Dashboard" onSelect={() => go("/dashboard")} />
                    <PaletteItem icon={ClipboardList} label="Work Orders" onSelect={() => go("/work-orders")} />
                    <PaletteItem icon={Building2} label="Clients" onSelect={() => go("/clients")} />
                    <PaletteItem icon={Wrench} label="Vendors" onSelect={() => go("/vendors")} />
                    <PaletteItem icon={ReceiptText} label="Billing" onSelect={() => go("/billing")} />
                  </Command.Group>

                  <Command.Group heading="Work orders" className={GROUP_CLASS}>
                    {workOrders.map((wo) => {
                      const site = siteById(wo.siteId);
                      const account = accountForSite(wo.siteId);
                      // Everything searchable goes in the value so cmdk can
                      // match on PO and external numbers, not just the label.
                      const value = [
                        wo.woNumber,
                        wo.legacyWoNumber,
                        wo.poNumber,
                        wo.externalTrackingNumber,
                        wo.description,
                        site?.name,
                        site?.storeCode,
                        account?.name,
                        STATUS_LABEL[wo.status],
                        wo.trade,
                      ]
                        .filter(Boolean)
                        .join(" ");
                      return (
                        <PaletteItem
                          key={wo.id}
                          icon={ClipboardList}
                          value={value}
                          label={wo.woNumber}
                          hint={`${site?.name ?? "Unknown site"} · ${wo.description}`}
                          onSelect={() => go(`/work-orders/${wo.id}`)}
                        />
                      );
                    })}
                  </Command.Group>

                  <Command.Group heading="Sites" className={GROUP_CLASS}>
                    {sites.map((site) => (
                      <PaletteItem
                        key={site.id}
                        icon={MapPin}
                        value={`${site.name} ${site.storeCode ?? ""} ${site.address}`}
                        label={site.name}
                        hint={site.address}
                        onSelect={() => go("/clients")}
                      />
                    ))}
                  </Command.Group>

                  <Command.Group heading="Vendors" className={GROUP_CLASS}>
                    {vendors.map((vendor) => (
                      <PaletteItem
                        key={vendor.id}
                        icon={Wrench}
                        value={`${vendor.name} ${vendor.trades.join(" ")}`}
                        label={vendor.name}
                        hint={vendor.trades.map((t) => t.replace(/_/g, " ")).join(", ")}
                        onSelect={() => go("/vendors")}
                      />
                    ))}
                  </Command.Group>
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
  value,
  onSelect,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint?: string;
  value?: string;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      value={value ?? label}
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-2.5 rounded-control px-2.5 py-2 text-sm data-[selected=true]:bg-tint"
    >
      <Icon className="h-4 w-4 shrink-0 text-ink-3" />
      <span className="shrink-0 font-medium tabular-nums">{label}</span>
      {hint && <span className="truncate text-xs text-ink-3">{hint}</span>}
    </Command.Item>
  );
}
