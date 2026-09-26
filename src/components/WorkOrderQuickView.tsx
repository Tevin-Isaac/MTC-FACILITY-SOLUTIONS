"use client";

import Link from "next/link";
import { ArrowUpRight, Clock, MapPin, Wrench } from "lucide-react";
import type { WorkOrder } from "@/types/work-order";
import { nextStepLabel, slaCountdown, slaRisk } from "@/lib/domain";
import { useAppData } from "@/components/AppDataProvider";
import { PriorityBadge, StatusBadge, ExceptionFlag } from "@/components/Badge";
import { PhaseProgressBar } from "@/components/PhaseProgressBar";
import { Drawer, DrawerItem } from "@/components/Drawer";
import { Field, Money, Pill, buttonClass } from "@/components/ui";

/**
 * Read-only peek at a work order, so the board stays put while you check
 * details. Anything that writes lives on the full detail screen.
 */
export function WorkOrderQuickView({
  workOrder,
  onClose,
}: {
  workOrder: WorkOrder | null;
  onClose: () => void;
}) {
  const { siteById, accountForSite, vendorById } = useAppData();

  const site = workOrder ? siteById(workOrder.siteId) : undefined;
  const account = workOrder ? accountForSite(workOrder.siteId) : undefined;
  const vendor = workOrder ? vendorById(workOrder.vendorId) : undefined;
  const risk = workOrder ? slaRisk(workOrder) : "on_track";
  const countdown = workOrder ? slaCountdown(workOrder) : null;

  return (
    <Drawer
      open={workOrder != null}
      onClose={onClose}
      title={workOrder?.woNumber ?? ""}
      sub={site?.name}
      footer={
        workOrder && (
          <Link
            href={`/work-orders/${workOrder.id}`}
            className={buttonClass("primary", "w-full")}
          >
            Open full work order
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        )
      }
    >
      {workOrder && (
        <div className="flex flex-col gap-3 px-2">
          <DrawerItem index={0}>
            <div className="flex flex-wrap items-center gap-1.5">
              <StatusBadge status={workOrder.status} />
              <PriorityBadge priority={workOrder.priority} />
              <ExceptionFlag wo={workOrder} />
              {countdown && risk !== "on_track" && (
                <Pill tone={risk === "breached" ? "critical" : "warning"}>
                  <Clock className="h-3 w-3" />
                  {countdown}
                </Pill>
              )}
            </div>
          </DrawerItem>

          <DrawerItem index={1}>
            <div className="rounded-card bg-sunken p-4">
              <p className="text-sm leading-relaxed text-ink">{workOrder.description}</p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-ink-3">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {account?.name}
                </span>
                <span className="inline-flex items-center gap-1.5 capitalize">
                  <Wrench className="h-3.5 w-3.5" />
                  {workOrder.trade.replace(/_/g, " ")}
                </span>
              </div>
            </div>
          </DrawerItem>

          <DrawerItem index={2}>
            <div className="rounded-card bg-sunken p-4">
              <p className="mb-3 text-xs font-medium text-ink-2">Lifecycle</p>
              <PhaseProgressBar status={workOrder.status} />
              <p className="mt-3 text-xs text-ink-3">
                Next: {nextStepLabel(workOrder.status)}
              </p>
            </div>
          </DrawerItem>

          <DrawerItem index={3}>
            <dl className="rounded-card bg-sunken px-4 py-2">
              <Field label="Vendor">
                {vendor ? vendor.name : <span className="text-ink-3">Not dispatched</span>}
              </Field>
              <Field label="NTE (vendor cap)" mono>
                <Money amount={workOrder.nte} />
              </Field>
              <Field label="DNE (client cap)" mono>
                <Money amount={workOrder.dne} />
              </Field>
              <Field label="Respond by" mono>
                {workOrder.slaRespondBy
                  ? new Date(workOrder.slaRespondBy).toLocaleString()
                  : "—"}
              </Field>
              <Field label="Resolve by" mono>
                {workOrder.slaResolveBy
                  ? new Date(workOrder.slaResolveBy).toLocaleString()
                  : "—"}
              </Field>
            </dl>
          </DrawerItem>
        </div>
      )}
    </Drawer>
  );
}
