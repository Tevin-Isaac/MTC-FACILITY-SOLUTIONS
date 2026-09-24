"use client";

import { useState } from "react";
import type { WorkOrder } from "@/types/work-order";
import {
  STATUS_BUCKETS,
  BUCKET_DEFAULT_STATUS,
  bucketForStatus,
  accountForSite,
  siteById,
  vendorById,
  type StatusBucket,
} from "@/lib/mock-data";
import { PriorityBadge } from "@/components/Badge";
import { GripVertical } from "lucide-react";

const BUCKET_ACCENT: Record<StatusBucket, string> = {
  "New & Dispatch": "border-t-blue-400",
  "In Progress": "border-t-indigo-400",
  Quoting: "border-t-amber-400",
  "Quality Review": "border-t-purple-400",
  "Ready to Bill": "border-t-emerald-400",
  Closed: "border-t-zinc-300",
};

export function WorkOrderBoard({
  initialWorkOrders,
}: {
  initialWorkOrders: WorkOrder[];
}) {
  const [workOrders, setWorkOrders] = useState(initialWorkOrders);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverBucket, setDragOverBucket] = useState<StatusBucket | null>(
    null
  );

  function moveTo(id: string, bucket: StatusBucket) {
    setWorkOrders((prev) =>
      prev.map((wo) =>
        wo.id === id ? { ...wo, status: BUCKET_DEFAULT_STATUS[bucket] } : wo
      )
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {STATUS_BUCKETS.map((bucket) => {
        const items = workOrders.filter(
          (wo) => bucketForStatus(wo.status) === bucket
        );
        return (
          <div
            key={bucket}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverBucket(bucket);
            }}
            onDragLeave={() => setDragOverBucket((b) => (b === bucket ? null : b))}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("text/plain");
              if (id) moveTo(id, bucket);
              setDraggingId(null);
              setDragOverBucket(null);
            }}
            className={`flex w-72 shrink-0 flex-col rounded-xl border border-border bg-surface ${
              dragOverBucket === bucket ? "ring-2 ring-brand-gold" : ""
            }`}
          >
            <div
              className={`flex items-center justify-between border-t-4 ${BUCKET_ACCENT[bucket]} rounded-t-xl px-4 py-3`}
            >
              <h3 className="text-sm font-semibold">{bucket}</h3>
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
                    className={`cursor-grab rounded-lg border border-border bg-background p-3 shadow-sm transition-opacity active:cursor-grabbing ${
                      draggingId === wo.id ? "opacity-40" : "opacity-100"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold">{wo.woNumber}</span>
                      <GripVertical className="h-4 w-4 shrink-0 text-muted" />
                    </div>
                    <p className="mt-1 text-xs text-muted">{site?.name}</p>
                    <p className="text-[11px] text-muted">{account?.name}</p>
                    <p className="mt-2 text-xs capitalize">
                      {wo.trade.replace(/_/g, " ")} · {vendor?.name ?? "Unassigned"}
                    </p>
                    <div className="mt-2">
                      <PriorityBadge priority={wo.priority} />
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
