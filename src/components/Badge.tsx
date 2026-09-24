import type { Priority, WorkOrder, WorkOrderStatus } from "@/types/work-order";
import { STATUS_LABEL, phaseForStatus, isException, PHASE_COLOR } from "@/lib/mock-data";
import { AlertTriangle } from "lucide-react";

// Status chip: shows the specific stage name, colored by its phase family
// so the family reads at a glance across 18 granular statuses.
export function StatusBadge({ status }: { status: WorkOrderStatus }) {
  const color = PHASE_COLOR[phaseForStatus(status)];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`, color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {STATUS_LABEL[status]}
    </span>
  );
}

// Exception flag: layered on top of the status, not a separate stage.
export function ExceptionFlag({ wo }: { wo: WorkOrder }) {
  if (!isException(wo)) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-phase-exception/15 px-2 py-0.5 text-[11px] font-medium text-phase-exception">
      <AlertTriangle className="h-3 w-3" />
      On hold
    </span>
  );
}

const PRIORITY_STYLES: Record<Priority, { label: string; className: string }> = {
  emergency_same_day: { label: "Emergency · Same Day", className: "bg-red-600 text-white" },
  emergency_4_hour: { label: "Emergency · 4hr", className: "bg-red-100 text-red-700" },
  priority_24_hour: { label: "Priority · 24hr", className: "bg-amber-100 text-amber-800" },
  standard_48_hour: { label: "Standard · 48hr", className: "bg-blue-100 text-blue-700" },
  routine_scheduled: { label: "Routine", className: "bg-zinc-100 text-zinc-600" },
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  const { label, className } = PRIORITY_STYLES[priority];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
