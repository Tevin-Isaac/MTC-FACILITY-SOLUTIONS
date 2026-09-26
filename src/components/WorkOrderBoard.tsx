"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { GripVertical, Clock, Eye } from "lucide-react";
import type { WorkOrder } from "@/types/work-order";
import {
  PHASE_FAMILIES,
  PHASE_COLOR,
  PHASE_TINT,
  phaseForStatus,
  statusForPhaseDrop,
  slaRisk,
  slaCountdown,
  STATUS_LABEL,
  type PhaseFamily,
} from "@/lib/domain";
import { useAppData } from "@/components/AppDataProvider";
import { PriorityBadge, ExceptionFlag } from "@/components/Badge";
import { changeStatus } from "@/lib/actions/work-orders";
import { useAction } from "@/components/useAction";
import { WorkOrderQuickView } from "@/components/WorkOrderQuickView";
import { Pill } from "@/components/ui";

export function WorkOrderBoard({ workOrders }: { workOrders: WorkOrder[] }) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverPhase, setDragOverPhase] = useState<PhaseFamily | null>(null);
  const [peekId, setPeekId] = useState<string | null>(null);
  const { siteById, accountForSite, vendorById } = useAppData();
  const { pending, submitFields } = useAction();

  /**
   * Drops persist. The server re-validates the transition, so an illegal
   * move is refused there too — this check just gives immediate feedback
   * instead of a round-trip that fails.
   */
  function handleDrop(id: string, phase: PhaseFamily) {
    const wo = workOrders.find((w) => w.id === id);
    if (!wo) return;
    if (phaseForStatus(wo.status) === phase) return;

    const toStatus = statusForPhaseDrop(wo.status, phase);
    if (!toStatus) {
      toast.error(
        `${wo.woNumber} can't move from ${STATUS_LABEL[wo.status]} to ${phase}.`
      );
      return;
    }
    submitFields(changeStatus, { workOrderId: id, toStatus });
  }

  return (
    <>
    <div className={`flex gap-4 overflow-x-auto pb-3 ${pending ? "opacity-70" : ""}`}>
      {PHASE_FAMILIES.map((phase) => {
        const items = workOrders.filter((wo) => phaseForStatus(wo.status) === phase);
        const color = PHASE_COLOR[phase];
        const isTarget = dragOverPhase === phase;
        return (
          <section
            key={phase}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverPhase(phase);
            }}
            onDragLeave={() => setDragOverPhase((p) => (p === phase ? null : p))}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("text/plain");
              if (id) handleDrop(id, phase);
              setDraggingId(null);
              setDragOverPhase(null);
            }}
            className="flex w-[19rem] shrink-0 flex-col rounded-tile bg-surface shadow-soft transition-colors"
            style={isTarget ? { background: PHASE_TINT[phase] } : undefined}
          >
            <header className="flex items-center gap-2.5 px-4 pt-4 pb-3">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
              <h3 className="text-sm font-semibold">{phase}</h3>
              <span
                className="ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums"
                style={{ background: PHASE_TINT[phase], color }}
              >
                {items.length}
              </span>
            </header>

            <div className="flex flex-1 flex-col gap-2 px-3 pb-3">
              {items.length === 0 && (
                <p className="rounded-card bg-sunken px-3 py-8 text-center text-xs text-ink-3">
                  Nothing here
                </p>
              )}
              {items.map((wo) => {
                const site = siteById(wo.siteId);
                const account = accountForSite(wo.siteId);
                const vendor = vendorById(wo.vendorId);
                const risk = slaRisk(wo);
                const countdown = slaCountdown(wo);
                return (
                  <article
                    key={wo.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", wo.id);
                      setDraggingId(wo.id);
                    }}
                    onDragEnd={() => setDraggingId(null)}
                    onClick={() => setPeekId(wo.id)}
                    className={`cursor-grab rounded-card bg-sunken p-3.5 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-soft active:cursor-grabbing ${
                      draggingId === wo.id ? "opacity-40" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/work-orders/${wo.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-sm font-semibold tabular-nums hover:underline"
                      >
                        {wo.woNumber}
                      </Link>
                      <span className="flex shrink-0 items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => setPeekId(wo.id)}
                          aria-label={`Preview ${wo.woNumber}`}
                          className="rounded-full p-1.5 text-ink-3 transition-colors hover:bg-tint hover:text-navy-ink"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <GripVertical className="h-4 w-4 text-ink-3" />
                      </span>
                    </div>

                    <p className="mt-1.5 truncate text-xs font-medium text-ink-2">{site?.name}</p>
                    <p className="truncate text-[11px] text-ink-3">{account?.name}</p>

                    <p className="mt-2.5 line-clamp-2 text-xs text-ink-2">{wo.description}</p>

                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <PriorityBadge priority={wo.priority} />
                      <ExceptionFlag wo={wo} />
                      {countdown && risk !== "on_track" && (
                        <Pill tone={risk === "breached" ? "critical" : "warning"}>
                          <Clock className="h-3 w-3" />
                          {countdown}
                        </Pill>
                      )}
                    </div>

                    <p className="mt-2.5 truncate text-[11px] text-ink-3">
                      {vendor ? vendor.name : "No vendor yet"}
                      {wo.nte != null && ` · NTE $${wo.nte.toLocaleString()}`}
                    </p>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
    <WorkOrderQuickView
      workOrder={workOrders.find((wo) => wo.id === peekId) ?? null}
      onClose={() => setPeekId(null)}
    />
    </>
  );
}
