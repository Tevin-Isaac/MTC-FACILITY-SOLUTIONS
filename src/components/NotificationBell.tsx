"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, AlertTriangle, AlertOctagon } from "lucide-react";
import { slaRisk, slaCountdown } from "@/lib/domain";
import { useAppData } from "@/components/AppDataProvider";
import { TERMINAL_STATUSES } from "@/types/work-order";
import { Empty } from "@/components/ui";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { workOrders, siteById } = useAppData();

  const alerts = workOrders
    .filter((wo) => !TERMINAL_STATUSES.includes(wo.status))
    .map((wo) => ({ wo, risk: slaRisk(wo) }))
    .filter((a) => a.risk !== "on_track")
    .sort((a, b) => Number(b.risk === "breached") - Number(a.risk === "breached"));

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-control p-2 text-ink-3 transition-colors hover:bg-tint hover:text-ink"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {alerts.length > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-critical text-[10px] font-semibold text-white">
            {alerts.length}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="fixed right-3 top-16 z-50 w-[min(21rem,calc(100vw-1.5rem))] overflow-hidden rounded-tile bg-surface shadow-lift sm:right-6"
            >
              <div className="px-4 py-3.5">
                <h3 className="text-sm font-semibold">SLA alerts</h3>
                <p className="text-xs text-ink-3">
                  {alerts.length === 0
                    ? "Everything on track"
                    : `${alerts.length} work order${alerts.length === 1 ? "" : "s"} need attention`}
                </p>
              </div>
              <div className="max-h-80 overflow-y-auto px-2 pb-2">
                {alerts.length === 0 && (
                  <Empty title="Nothing at risk right now" />
                )}
                {alerts.map(({ wo, risk }) => {
                  const site = siteById(wo.siteId);
                  const countdown = slaCountdown(wo);
                  return (
                    <Link
                      key={wo.id}
                      href={`/work-orders/${wo.id}`}
                      onClick={() => setOpen(false)}
                      className="flex items-start gap-3 rounded-card px-2.5 py-2.5 text-sm transition-colors hover:bg-tint"
                    >
                      {risk === "breached" ? (
                        <AlertOctagon className="mt-0.5 h-4 w-4 shrink-0 text-critical" />
                      ) : (
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium tabular-nums">{wo.woNumber}</p>
                        <p className="truncate text-xs text-ink-3">{site?.name}</p>
                        {countdown && (
                          <p
                            className={`text-xs font-medium ${
                              risk === "breached" ? "text-critical" : "text-warning"
                            }`}
                          >
                            {countdown}
                          </p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
