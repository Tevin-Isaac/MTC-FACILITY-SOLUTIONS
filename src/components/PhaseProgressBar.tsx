import { PHASE_FAMILIES, PHASE_COLOR, phaseForStatus } from "@/lib/domain";
import type { WorkOrderStatus } from "@/types/work-order";

/** Segmented lifecycle bar: one block per phase family, filled up to the
    work order's current phase. */
export function PhaseProgressBar({ status }: { status: WorkOrderStatus }) {
  const currentPhase = phaseForStatus(status);
  const currentIndex = PHASE_FAMILIES.indexOf(currentPhase);

  return (
    <ol className="flex items-end gap-1.5">
      {PHASE_FAMILIES.map((phase, i) => {
        const reached = i <= currentIndex;
        const current = i === currentIndex;
        return (
          <li key={phase} className="flex flex-1 flex-col gap-2" title={phase}>
            <span
              className="h-1.5 rounded-full transition-colors"
              style={{
                backgroundColor: reached ? PHASE_COLOR[phase] : "var(--surface-tint)",
              }}
            />
            <span
              className={`hidden truncate text-[10px] sm:block ${
                current ? "font-semibold" : "font-medium"
              }`}
              style={{ color: reached ? PHASE_COLOR[phase] : "var(--ink-3)" }}
            >
              {phase}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
