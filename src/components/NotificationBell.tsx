"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, AlertTriangle, AlertOctagon } from "lucide-react";
import {
  mockWorkOrders,
  siteById,
  slaRisk,
  slaCountdown,
} from "@/lib/mock-data";
import { TERMINAL_STATUSES } from "@/types/work-order";

export function NotificationBell() {
  const [open, setOpen] = useState(false);

  const alerts = mockWorkOrders
    .filter((wo) => !TERMINAL_STATUSES.includes(wo.status))
    .map((wo) => ({ wo, risk: slaRisk(wo) }))
    .filter((a) => a.risk !== "on_track")
    .sort((a, b) => Number(b.risk === "breached") - Number(a.risk === "breached"));

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-full p-2 text-muted hover:bg-black/5"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {alerts.length > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-status-critical text-[10px] font-semibold text-white">
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
              className="fixed right-3 top-16 z-50 w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-border bg-raised shadow-xl sm:right-6"
            >
              <div className="border-b border-border px-4 py-3">
                <h3 className="text-sm font-semibold">SLA alerts</h3>
                <p className="text-xs text-muted">
                  {alerts.length} work order{alerts.length === 1 ? "" : "s"} need attention
                </p>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {alerts.length === 0 && (
                  <p className="px-4 py-6 text-center text-sm text-muted">
                    Nothing at risk right now.
                  </p>
                )}
                {alerts.map(({ wo, risk }) => {
                  const site = siteById(wo.siteId);
                  const countdown = slaCountdown(wo);
                  return (
                    <Link
                      key={wo.id}
                      href={`/work-orders/${wo.id}`}
                      onClick={() => setOpen(false)}
                      className="flex items-start gap-3 border-b border-border px-4 py-3 text-sm last:border-0 hover:bg-black/5"
                    >
                      {risk === "breached" ? (
                        <AlertOctagon className="mt-0.5 h-4 w-4 shrink-0 text-status-critical" />
                      ) : (
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-status-warning" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium tabular-nums">{wo.woNumber}</p>
                        <p className="truncate text-xs text-muted">{site?.name}</p>
                        {countdown && (
                          <p
                            className={`text-xs font-medium ${
                              risk === "breached" ? "text-status-critical" : "text-status-warning"
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
