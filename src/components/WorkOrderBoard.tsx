"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { WorkOrder } from "@/types/work-order";
import {
  PHASE_FAMILIES,
  PHASE_DEFAULT_STATUS,
  PHASE_COLOR,
  phaseForStatus,
  accountForSite,
  siteById,
  vendorById,
  type PhaseFamily,
} from "@/lib/mock-data";
import { PriorityBadge, ExceptionFlag } from "@/components/Badge";
import { GripVertical } from "lucide-react";

export function WorkOrderBoard({
  initialWorkOrders,
}: {
  initialWorkOrders: WorkOrder[];
}) {
  const [workOrders, setWorkOrders] = useState(initialWorkOrders);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverPhase, setDragOverPhase] = useState<PhaseFamily | null>(null);

  function moveTo(id: string, phase: PhaseFamily) {
    let moved: WorkOrder | undefined;
    setWorkOrders((prev) =>
      prev.map((wo) => {
        if (wo.id !== id) return wo;
        if (phaseForStatus(wo.status) === phase) return wo;
        moved = wo;
        return { ...wo, status: PHASE_DEFAULT_STATUS[phase] };
      })
    );
    if (moved) {
      toast.success(`${moved.woNumber} moved to ${phase}`);
    }
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {PHASE_FAMILIES.map((phase) => {
        const items = workOrders.filter((wo) => phaseForStatus(wo.status) === phase);
        const color = PHASE_COLOR[phase];
        return (
          <div
            key={phase}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverPhase(phase);
            }}
            onDragLeave={() => setDragOverPhase((p) => (p === phase ? null : p))}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("text/plain");
              if (id) moveTo(id, phase);
              setDraggingId(null);
              setDragOverPhase(null);
            }}
            className={`flex w-72 shrink-0 flex-col rounded-xl border border-border bg-surface transition-shadow ${
              dragOverPhase === phase ? "ring-2 ring-brand-gold" : ""
            }`}
          >
            <div
              className="flex items-center justify-between rounded-t-xl border-t-4 px-4 py-3"
              style={{ borderTopColor: color }}
            >
              <h3 className="text-sm font-semibold">{phase}</h3>
              <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs font-medium text-muted">
                {items.length}
              </span>
            </div>

            <div className="flex flex-1 flex-col gap-2 p-3 pt-0">
              {items.length === 0 && (
                <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted">
                  No work orders
                </p>
              )}
              {items.map((wo) => {
                const site = siteById(wo.siteId);
                const account = accountForSite(wo.siteId);
                const vendor = vendorById(wo.vendorId);
                return (
                  <div
                    key={wo.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", wo.id);
                      setDraggingId(wo.id);
                    }}
                    onDragEnd={() => setDraggingId(null)}
                    className={`cursor-grab rounded-lg border border-border bg-background p-3 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing ${
                      draggingId === wo.id ? "opacity-40" : "opacity-100"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/work-orders/${wo.id}`}
                        className="text-sm font-semibold tabular-nums hover:underline"
                      >
                        {wo.woNumber}
                      </Link>
                      <GripVertical className="h-4 w-4 shrink-0 text-muted" />
                    </div>
                    <p className="mt-1 text-xs text-muted">{site?.name}</p>
                    <p className="text-[11px] text-muted">{account?.name}</p>
                    <p className="mt-2 text-xs capitalize">
                      {wo.trade.replace(/_/g, " ")} · {vendor?.name ?? "Unassigned"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <PriorityBadge priority={wo.priority} />
                      <ExceptionFlag wo={wo} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
