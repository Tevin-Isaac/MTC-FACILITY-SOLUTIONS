"use client";

import { useState } from "react";
import { ShieldCheck, ShieldAlert, ShieldX, Star, UserRoundCog } from "lucide-react";
import type { Trade } from "@/types/work-order";
import { vendorComplianceStatus } from "@/lib/domain";
import { useAppData } from "@/components/AppDataProvider";
import { assignVendor } from "@/lib/actions/work-orders";
import { useAction } from "@/components/useAction";
import { Drawer, DrawerItem } from "@/components/Drawer";
import { Pill, buttonClass } from "@/components/ui";

export function AssignVendorDrawer({
  workOrderId,
  trade,
  currentVendorId,
  variant = "soft",
}: {
  workOrderId: string;
  trade: Trade;
  currentVendorId: string | null;
  variant?: "soft" | "primary";
}) {
  const [open, setOpen] = useState(false);
  const { vendorsForTrade } = useAppData();
  const { pending, submitFields } = useAction();

  // Ranked by trade match then rate, so the sensible dispatch is at the top.
  const vendors = vendorsForTrade(trade);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={buttonClass(variant, "px-3 py-2 text-xs")}
      >
        <UserRoundCog className="h-3.5 w-3.5" />
        {currentVendorId ? "Change vendor" : "Assign vendor"}
      </button>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Dispatch a vendor"
        sub={`Ranked for ${trade.replace(/_/g, " ")} · ${vendors.length} available`}
      >
        {vendors.map((vendor, i) => {
          const tradeMatch = vendor.trades.includes(trade);
          const compliance = vendorComplianceStatus(vendor);
          const isCurrent = vendor.id === currentVendorId;
          const blocked = compliance === "expired";
          return (
            <DrawerItem key={vendor.id} index={i} className="mb-2.5">
              <div
                className={`rounded-card p-4 transition-colors ${
                  isCurrent ? "bg-gold-tint" : "bg-sunken hover:bg-tint"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold">{vendor.name}</p>
                    <p className="truncate text-xs capitalize text-ink-3">
                      {vendor.trades.map((t) => t.replace(/_/g, " ")).join(", ")}
                    </p>
                  </div>
                  {!tradeMatch && <Pill tone="neutral">No trade match</Pill>}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
                  {vendor.rateCardHourly != null && (
                    <span className="font-medium tabular-nums text-ink-2">
                      ${vendor.rateCardHourly}/hr
                    </span>
                  )}
                  {compliance === "expired" ? (
                    <span className="inline-flex items-center gap-1 font-medium text-critical">
                      <ShieldX className="h-3.5 w-3.5" />
                      COI/license expired
                    </span>
                  ) : compliance === "expiring_soon" ? (
                    <span className="inline-flex items-center gap-1 text-warning">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      COI expiring soon
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-good">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Compliance valid
                    </span>
                  )}
                  {vendor.isLastResort && (
                    <span className="inline-flex items-center gap-1 text-ink-3">
                      <Star className="h-3.5 w-3.5" />
                      Last resort
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  disabled={isCurrent || blocked || pending}
                  onClick={() =>
                    submitFields(assignVendor, { workOrderId, vendorId: vendor.id }, () =>
                      setOpen(false)
                    )
                  }
                  className={buttonClass("primary", "mt-3.5 w-full py-2.5 text-xs")}
                >
                  {isCurrent
                    ? "Currently assigned"
                    : blocked
                      ? "Dispatch blocked — compliance expired"
                      : pending
                        ? "Dispatching…"
                        : "Send dispatch"}
                </button>
              </div>
            </DrawerItem>
          );
        })}
      </Drawer>
    </>
  );
}
