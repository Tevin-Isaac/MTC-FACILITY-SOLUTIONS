"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface CategoryBarDatum {
  label: string;
  value: number;
}

// Single-measure magnitude-by-category bar chart. One hue is correct here:
// color isn't carrying series identity, only the axis label is, so no
// legend or categorical palette is needed (dataviz skill, marks-and-anatomy).
export function CategoryBarChart({
  data,
  height = 240,
}: {
  data: CategoryBarDatum[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 24, bottom: 4, left: 4 }}
      >
        <CartesianGrid
          horizontal={false}
          stroke="var(--chart-grid)"
          strokeDasharray="0"
        />
        <XAxis
          type="number"
          allowDecimals={false}
          tick={{ fill: "var(--muted)", fontSize: 12 }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={140}
          tick={{ fill: "var(--foreground)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "var(--border)", opacity: 0.4 }}
          contentStyle={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
            color: "var(--foreground)",
          }}
        />
        <Bar
          dataKey="value"
          fill="var(--chart-sequential)"
          radius={[0, 4, 4, 0]}
          maxBarSize={22}
        >
          <LabelList
            dataKey="value"
            position="right"
            fill="var(--muted)"
            fontSize={12}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
