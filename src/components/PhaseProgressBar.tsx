import { PHASE_FAMILIES, PHASE_COLOR, phaseForStatus } from "@/lib/mock-data";
import type { WorkOrderStatus } from "@/types/work-order";

export function PhaseProgressBar({ status }: { status: WorkOrderStatus }) {
  const currentPhase = phaseForStatus(status);
  const currentIndex = PHASE_FAMILIES.indexOf(currentPhase);

  return (
    <div className="flex items-center gap-1.5">
      {PHASE_FAMILIES.map((phase, i) => {
        const reached = i <= currentIndex;
        const color = reached ? PHASE_COLOR[phase] : "var(--border)";
        return (
          <div key={phase} className="flex flex-1 flex-col gap-1.5" title={phase}>
            <div
              className="h-1.5 rounded-full transition-colors"
              style={{ backgroundColor: color }}
            />
            <span
              className="hidden truncate text-[10px] font-medium sm:block"
              style={{ color: reached ? color : "var(--muted)" }}
            >
              {phase}
            </span>
          </div>
        );
      })}
    </div>
  );
}
