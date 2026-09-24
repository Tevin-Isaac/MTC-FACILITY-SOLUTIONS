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
  Plus,
  Moon,
  Sun,
  Search,
} from "lucide-react";
import { useAppData } from "@/components/AppDataProvider";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { workOrders } = useAppData();

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
        className="hidden items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-muted hover:border-brand-gold md:flex"
      >
        <Search className="h-3.5 w-3.5" />
        Search
        <kbd className="ml-2 rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium">
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
            className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-24 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-raised shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Command label="Command palette">
              <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                <Search className="h-4 w-4 text-muted" />
                <Command.Input
                  autoFocus
                  placeholder="Search work orders, or jump to a page..."
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
                />
              </div>
              <Command.List className="max-h-80 overflow-y-auto p-2">
                <Command.Empty className="px-3 py-6 text-center text-sm text-muted">
                  No results found.
                </Command.Empty>

                <Command.Group heading="Navigate" className="text-xs font-medium text-muted [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
                  <PaletteItem icon={LayoutDashboard} label="Dashboard" onSelect={() => go("/dashboard")} />
                  <PaletteItem icon={ClipboardList} label="Work Orders" onSelect={() => go("/work-orders")} />
                  <PaletteItem icon={Building2} label="Clients" onSelect={() => go("/clients")} />
                  <PaletteItem icon={Wrench} label="Vendors" onSelect={() => go("/vendors")} />
                </Command.Group>

                <Command.Group heading="Actions" className="text-xs font-medium text-muted [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
                  <PaletteItem icon={Plus} label="New work order" onSelect={() => go("/work-orders")} />
                  <PaletteItem icon={Moon} label="Toggle dark mode" iconAlt={Sun} onSelect={toggleTheme} />
                </Command.Group>

                <Command.Group heading="Work orders" className="text-xs font-medium text-muted [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
                  {workOrders.map((wo) => (
                    <PaletteItem
                      key={wo.id}
                      icon={ClipboardList}
                      label={`${wo.woNumber} — ${wo.description}`}
                      onSelect={() => go(`/work-orders/${wo.id}`)}
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
  onSelect,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconAlt?: React.ComponentType<{ className?: string }>;
  label: string;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm data-[selected=true]:bg-black/5"
    >
      <Icon className="h-4 w-4 text-muted" />
      <span className="truncate">{label}</span>
    </Command.Item>
  );
}
