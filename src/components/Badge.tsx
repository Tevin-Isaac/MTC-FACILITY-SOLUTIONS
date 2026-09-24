import type { Priority, WorkOrderStatus } from "@/types/work-order";
import { STATUS_LABEL } from "@/lib/mock-data";

const STATUS_STYLES: Partial<Record<WorkOrderStatus, string>> = {
  new: "bg-zinc-100 text-zinc-700",
  assigned: "bg-blue-50 text-blue-700",
  schedule_confirmed: "bg-blue-50 text-blue-700",
  tech_onsite: "bg-indigo-50 text-indigo-700",
  pending_quote: "bg-amber-50 text-amber-800",
  quote_with_client: "bg-amber-50 text-amber-800",
  quote_approved: "bg-emerald-50 text-emerald-700",
  quote_declined: "bg-red-50 text-red-700",
  work_completed: "bg-indigo-50 text-indigo-700",
  pending_documentation: "bg-amber-50 text-amber-800",
  in_quality_assurance: "bg-purple-50 text-purple-700",
  ready_to_bill: "bg-emerald-50 text-emerald-700",
  ready_to_invoice: "bg-emerald-50 text-emerald-700",
  invoiced: "bg-emerald-50 text-emerald-700",
  paid: "bg-emerald-100 text-emerald-800",
  closed: "bg-zinc-100 text-zinc-500",
  complete_no_charge: "bg-zinc-100 text-zinc-500",
  cancelled: "bg-zinc-100 text-zinc-400 line-through",
  on_hold: "bg-orange-50 text-orange-700",
};

export function StatusBadge({ status }: { status: WorkOrderStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
        STATUS_STYLES[status] ?? "bg-zinc-100 text-zinc-700"
      }`}
    >
      {STATUS_LABEL[status]}
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
