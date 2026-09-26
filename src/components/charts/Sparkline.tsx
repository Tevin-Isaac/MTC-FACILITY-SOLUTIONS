"use client";

import { useId } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

// Minimal trend sparkline for a KPI card. No axes/gridlines/tooltip by
// design — it's a glance-level trend indicator, not a chart to read values
// off of (dataviz skill: a single series inside a stat tile needs no
// legend/axis chrome).
export function Sparkline({
  data,
  color = "var(--chart-sequential)",
  height = 36,
  fillOpacity = 0.35,
}: {
  data: number[];
  color?: string;
  height?: number;
  /** Raise for tiles where the area is a design element, not just a hint. */
  fillOpacity?: number;
}) {
  const points = data.map((value, i) => ({ i, value }));
  const gradientId = `spark-${useId().replace(/:/g, "")}`;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={points} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={fillOpacity} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          animationDuration={900}
          animationEasing="ease-out"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
