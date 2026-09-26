"use client";

import type { ReactNode } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Sparkline } from "@/components/charts/Sparkline";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { IconBadge, type Tone } from "@/components/ui";
import { EASE_OUT } from "@/components/motion";

const TONE_VAR: Record<string, string> = {
  navy: "var(--navy)",
  warning: "var(--warning)",
  critical: "var(--critical)",
  good: "var(--good)",
};

export function KpiCard({
  label,
  value,
  icon,
  trend,
  deltaGoodDirection = "down",
  tone = "navy",
  index = 0,
  suffix,
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
  tone?: Extract<Tone, "navy" | "warning" | "critical" | "good">;
  /** Stagger position within the KPI row. */
  index?: number;
  suffix?: string;
}) {
  const reduce = useReducedMotion();
  const first = trend[0] ?? 0;
  const last = trend[trend.length - 1] ?? 0;
  const delta = last - first;
  const isGood = deltaGoodDirection === "down" ? delta <= 0 : delta >= 0;
  const accent = TONE_VAR[tone];

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={reduce ? undefined : { y: -5 }}
      transition={{ duration: 0.5, delay: index * 0.07, ease: EASE_OUT }}
      className="group relative flex flex-col overflow-hidden rounded-tile bg-surface shadow-soft transition-shadow duration-300 hover:shadow-lift"
    >
      {/* Tone wash in the corner — gives each tile an identity without a border. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-40 blur-2xl transition-opacity duration-300 group-hover:opacity-90"
        style={{ background: accent }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/35 to-transparent transition-transform duration-700 group-hover:translate-x-full"
      />

      <div className="relative flex items-start justify-between gap-2 px-5 pt-5">
        <IconBadge tone={tone}>{icon}</IconBadge>
        {delta !== 0 && (
          <span
            className={`inline-flex items-center gap-0.5 rounded-full px-2 py-1 text-[11px] font-semibold ${
              isGood ? "bg-good-tint text-good" : "bg-critical-tint text-critical"
            }`}
          >
            {delta > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            {Math.abs(delta)}
          </span>
        )}
      </div>

      <div className="relative px-5 pt-5">
        <p className="flex items-baseline gap-1 text-[44px] font-semibold leading-none tracking-[-0.035em] tabular-nums">
          <AnimatedNumber value={value} />
          {suffix && <span className="text-xl font-medium text-ink-3">{suffix}</span>}
        </p>
        <p className="mt-2.5 text-[13px] font-medium text-ink-2">{label}</p>
      </div>

      {/* Full-bleed to the tile edges: the chart is part of the tile shape. */}
      <div className="relative mt-5">
        <Sparkline data={trend} color={accent} height={70} fillOpacity={0.22} />
      </div>
    </motion.div>
  );
}
