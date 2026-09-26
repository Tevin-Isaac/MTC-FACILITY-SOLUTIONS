"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { CheckCircle2, AlertTriangle, AlertOctagon } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { EASE_OUT } from "@/components/motion";

export interface SlaCounts {
  onTrack: number;
  atRisk: number;
  breached: number;
}

const SEGMENTS = [
  {
    key: "onTrack" as const,
    label: "On track",
    color: "var(--good)",
    tint: "var(--good-tint)",
    icon: CheckCircle2,
  },
  {
    key: "atRisk" as const,
    label: "At risk (under 4hr)",
    color: "var(--warning)",
    tint: "var(--warning-tint)",
    icon: AlertTriangle,
  },
  {
    key: "breached" as const,
    label: "Breached",
    color: "var(--critical)",
    tint: "var(--critical-tint)",
    icon: AlertOctagon,
  },
];

export function SlaDonut({ counts }: { counts: SlaCounts }) {
  const reduce = useReducedMotion();
  const total = counts.onTrack + counts.atRisk + counts.breached;
  const data = SEGMENTS.map((s) => ({ ...s, value: counts[s.key] }));

  // One rounded block per open work order, coloured by SLA segment — a quick
  // visual gut-check to sit alongside the donut's precise numbers.
  const blocks = data.flatMap((seg) => Array.from({ length: seg.value }, () => seg.color));

  return (
    <div className="flex flex-col gap-6">
      {blocks.length > 0 && (
        <div className="flex gap-1.5">
          {blocks.map((color, i) => (
            <motion.span
              key={i}
              initial={reduce ? false : { scaleY: 0.3, opacity: 0 }}
              animate={{ scaleY: 1, opacity: 1 }}
              transition={{ duration: 0.4, delay: i * 0.04, ease: EASE_OUT }}
              className="h-3 flex-1 rounded-full"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      )}

      <div className="flex flex-col items-center gap-6 sm:flex-row">
        <div className="relative h-[152px] w-[152px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="label"
                innerRadius={54}
                outerRadius={74}
                paddingAngle={4}
                cornerRadius={10}
                startAngle={90}
                endAngle={-270}
                stroke="none"
                animationDuration={1000}
                animationEasing="ease-out"
              >
                {data.map((seg) => (
                  <Cell key={seg.key} fill={seg.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[34px] font-semibold leading-none tracking-[-0.03em] tabular-nums">
              <AnimatedNumber value={total} />
            </span>
            <span className="mt-1.5 text-[11px] font-medium text-ink-3">open WOs</span>
          </div>
        </div>

        <ul className="flex w-full flex-1 flex-col gap-2">
          {data.map((seg, i) => (
            <motion.li
              key={seg.key}
              initial={reduce ? false : { opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.15 + i * 0.08, ease: EASE_OUT }}
              className="flex items-center gap-3 rounded-card px-3 py-2.5"
              style={{ background: seg.value > 0 ? seg.tint : "var(--surface-sunken)" }}
            >
              <seg.icon
                className="h-4 w-4 shrink-0"
                style={{ color: seg.value > 0 ? seg.color : "var(--ink-3)" }}
              />
              <span className="flex-1 text-[13px] font-medium text-ink-2">{seg.label}</span>
              <span className="text-base font-semibold tabular-nums">{seg.value}</span>
            </motion.li>
          ))}
        </ul>
      </div>
    </div>
  );
}
