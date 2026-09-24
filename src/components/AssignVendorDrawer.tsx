"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { X, ShieldCheck, ShieldAlert, ShieldX, Star, UserRoundCog } from "lucide-react";
import type { Trade } from "@/types/work-order";
import { vendorComplianceStatus } from "@/lib/domain";
import { useAppData } from "@/components/AppDataProvider";

export function AssignVendorDrawer({
  trade,
  currentVendorId,
  onAssign,
}: {
  trade: Trade;
  currentVendorId: string | null;
  onAssign: (vendorId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const { vendorsForTrade } = useAppData();
  const vendors = vendorsForTrade(trade);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-brand-navy hover:bg-black/5"
      >
        <UserRoundCog className="h-3.5 w-3.5" />
        {currentVendorId ? "Change vendor" : "Assign vendor"}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            className="flex h-full w-full max-w-sm flex-col bg-raised shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold">Assign vendor</h2>
                <p className="text-xs text-muted capitalize">{trade.replace(/_/g, " ")} trade match</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-1.5 text-muted hover:bg-black/5"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {vendors.map((vendor) => {
                const tradeMatch = vendor.trades.includes(trade);
                const compliance = vendorComplianceStatus(vendor);
                const isCurrent = vendor.id === currentVendorId;
                const blocked = compliance === "expired";
                return (
                  <div
                    key={vendor.id}
                    className={`mb-2 rounded-lg border p-3 ${
                      isCurrent ? "border-brand-gold bg-brand-gold/10" : "border-border"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">{vendor.name}</p>
                        <p className="text-xs capitalize text-muted">
                          {vendor.trades.map((t) => t.replace(/_/g, " ")).join(", ")}
                        </p>
                      </div>
                      {!tradeMatch && (
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500">
                          No trade match
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
                      <span className="tabular-nums">${vendor.rateCardHourly}/hr</span>
                      {compliance === "expired" ? (
                        <span className="inline-flex items-center gap-1 font-medium text-status-critical">
                          <ShieldX className="h-3.5 w-3.5" />
                          COI/license expired
                        </span>
                      ) : compliance === "expiring_soon" ? (
                        <span className="inline-flex items-center gap-1 text-amber-700">
                          <ShieldAlert className="h-3.5 w-3.5" />
                          COI expiring
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-status-good">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          COI valid
                        </span>
                      )}
                      {vendor.isLastResort && (
                        <span className="inline-flex items-center gap-1 text-zinc-500">
                          <Star className="h-3.5 w-3.5" />
                          Last resort
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={isCurrent || blocked}
                      onClick={() => {
                        onAssign(vendor.id);
                        setOpen(false);
                        toast.success(`${vendor.name} assigned`, {
                          description: "Dispatch link sent to the vendor.",
                        });
                      }}
                      className="mt-3 w-full rounded-lg bg-brand-navy px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-navy-dark disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isCurrent
                        ? "Currently assigned"
                        : blocked
                          ? "Dispatch blocked — compliance expired"
                          : "Send dispatch"}
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
