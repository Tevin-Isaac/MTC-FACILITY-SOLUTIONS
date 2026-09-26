import type { Priority, WorkOrder, WorkOrderStatus } from "@/types/work-order";
import {
  STATUS_LABEL,
  phaseForStatus,
  isException,
  PHASE_COLOR,
  PHASE_TINT,
} from "@/lib/domain";
import { AlertTriangle } from "lucide-react";
import { Pill } from "@/components/ui";

// Status chip: shows the specific stage name, tinted by its phase family so
// the family reads at a glance across 18 granular statuses.
export function StatusBadge({ status }: { status: WorkOrderStatus }) {
  const phase = phaseForStatus(status);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap"
      style={{ backgroundColor: PHASE_TINT[phase], color: PHASE_COLOR[phase] }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: PHASE_COLOR[phase] }} />
      {STATUS_LABEL[status]}
    </span>
  );
}

// Exception flag: layered on top of the status, not a separate stage.
export function ExceptionFlag({ wo }: { wo: WorkOrder }) {
  if (!isException(wo)) return null;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{
        backgroundColor: "var(--phase-exception-tint)",
        color: "var(--phase-exception)",
      }}
    >
      <AlertTriangle className="h-3 w-3" />
      On hold
    </span>
  );
}

const PRIORITY_STYLES: Record<
  Priority,
  { label: string; tone: "critical" | "warning" | "navy" | "neutral"; solid?: boolean }
> = {
  emergency_same_day: { label: "Emergency · Same day", tone: "critical", solid: true },
  emergency_4_hour: { label: "Emergency · 4hr", tone: "critical" },
  priority_24_hour: { label: "Priority · 24hr", tone: "warning" },
  standard_48_hour: { label: "Standard · 48hr", tone: "navy" },
  routine_scheduled: { label: "Routine", tone: "neutral" },
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  const { label, tone, solid } = PRIORITY_STYLES[priority];
  return (
    <Pill tone={tone} solid={solid}>
      {label}
    </Pill>
  );
}
