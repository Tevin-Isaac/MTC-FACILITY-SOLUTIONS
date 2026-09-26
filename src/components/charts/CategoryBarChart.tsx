"use client";

import { useId } from "react";
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, XAxis, YAxis } from "recharts";

export interface CategoryBarDatum {
  label: string;
  value: number;
}

// Single-measure magnitude-by-category bar chart. One hue is correct here:
// color isn't carrying series identity, only the axis label is, so no
// legend or categorical palette is needed (dataviz skill, marks-and-anatomy).
//
// Gridlines and the value axis are dropped in favour of a value label on each
// bar: at this size the exact number is easier to read than a tick lookup,
// and it keeps the panel soft rather than technical.
export function CategoryBarChart({
  data,
  height = 250,
}: {
  data: CategoryBarDatum[];
  height?: number;
}) {
  const gradientId = `bar-${useId().replace(/:/g, "")}`;
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        barCategoryGap="28%"
        margin={{ top: 4, right: 36, bottom: 0, left: 0 }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--navy)" />
            <stop offset="100%" stopColor="var(--chart-sequential)" />
          </linearGradient>
        </defs>
        <XAxis type="number" domain={[0, max]} hide />
        <YAxis
          type="category"
          dataKey="label"
          width={118}
          tick={{ fill: "var(--ink-2)", fontSize: 12.5 }}
          axisLine={false}
          tickLine={false}
          className="capitalize"
        />
        <Bar
          dataKey="value"
          radius={999}
          maxBarSize={22}
          background={{ fill: "var(--surface-tint)", radius: 999 }}
          animationDuration={850}
          animationEasing="ease-out"
        >
          {data.map((d) => (
            <Cell key={d.label} fill={`url(#${gradientId})`} />
          ))}
          <LabelList
            dataKey="value"
            position="right"
            offset={12}
            fill="var(--ink-2)"
            fontSize={12}
            fontWeight={600}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
