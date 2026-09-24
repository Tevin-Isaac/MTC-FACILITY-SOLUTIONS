import type { LucideIcon } from "lucide-react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Sparkline } from "@/components/charts/Sparkline";

export function KpiCard({
  label,
  value,
  icon: Icon,
  trend,
  deltaGoodDirection = "down",
  tone = "default",
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  /** Recent trend points, oldest first, ending at the current value. */
  trend: number[];
  /** Whether a falling trend counts as good news (e.g. SLA breaches) or bad (e.g. revenue). */
  deltaGoodDirection?: "down" | "up";
  tone?: "default" | "warning" | "danger";
}) {
  const first = trend[0] ?? 0;
  const last = trend[trend.length - 1] ?? 0;
  const delta = last - first;
  const isGood = deltaGoodDirection === "down" ? delta <= 0 : delta >= 0;

  const toneStyles = {
    default: "bg-brand-navy text-white",
    warning: "bg-brand-gold text-brand-navy-dark",
    danger: "bg-red-600 text-white",
  }[tone];

  const sparkColor = tone === "danger" ? "var(--status-critical)" : "var(--chart-sequential)";

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${toneStyles}`}>
          <Icon className="h-5 w-5" />
        </div>
        {delta !== 0 && (
          <span
            className={`inline-flex items-center gap-0.5 text-xs font-medium ${
              isGood ? "text-status-good" : "text-status-critical"
            }`}
          >
            {delta > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            {Math.abs(delta)}
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-semibold leading-none tabular-nums">{value}</p>
        <p className="mt-1 text-sm text-muted">{label}</p>
      </div>
      <Sparkline data={trend} color={sparkColor} />
    </div>
  );
}
