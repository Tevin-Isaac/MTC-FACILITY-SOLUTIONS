"use client";

import type { ReactNode } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { motion } from "framer-motion";
import { Sparkline } from "@/components/charts/Sparkline";
import { AnimatedNumber } from "@/components/AnimatedNumber";

export function KpiCard({
  label,
  value,
  icon,
  trend,
  deltaGoodDirection = "down",
  tone = "default",
}: {
  label: string;
  value: number;
  /** A rendered icon element, e.g. `<ClipboardList className="h-5 w-5" />` —
   * a component reference can't cross the server/client boundary as a prop. */
  icon: ReactNode;
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
    default: "bg-blue-500 text-white",
    warning: "bg-amber-500 text-white",
    danger: "bg-red-500 text-white",
  }[tone];

  const sparkColor = tone === "danger" ? "var(--status-critical)" : "var(--chart-sequential)";

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      className="flex flex-col gap-3 rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-black/5 hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${toneStyles}`}>
          {icon}
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
        <p className="text-2xl font-semibold leading-none">
          <AnimatedNumber value={value} />
        </p>
        <p className="mt-1 text-sm text-muted">{label}</p>
      </div>
      <Sparkline data={trend} color={sparkColor} />
    </motion.div>
  );
}
