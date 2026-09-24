"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { CheckCircle2, AlertTriangle, AlertOctagon } from "lucide-react";

export interface SlaCounts {
  onTrack: number;
  atRisk: number;
  breached: number;
}

const SEGMENTS = [
  {
    key: "onTrack" as const,
    label: "On track",
    color: "var(--status-good)",
    icon: CheckCircle2,
  },
  {
    key: "atRisk" as const,
    label: "At risk (< 4hr)",
    color: "var(--status-warning)",
    icon: AlertTriangle,
  },
  {
    key: "breached" as const,
    label: "Breached",
    color: "var(--status-critical)",
    icon: AlertOctagon,
  },
];

export function SlaDonut({ counts }: { counts: SlaCounts }) {
  const total = counts.onTrack + counts.atRisk + counts.breached;
  const data = SEGMENTS.map((s) => ({ ...s, value: counts[s.key] }));

  // A row of rounded blocks, one per open WO, colored by SLA segment — a
  // quick visual gut-check to sit alongside the donut's precise numbers.
  const blocks = data.flatMap((seg) =>
    Array.from({ length: seg.value }, () => seg.color)
  );

  return (
    <div className="flex flex-col gap-4">
      {blocks.length > 0 && (
        <div className="flex gap-1">
          {blocks.map((color, i) => (
            <span
              key={i}
              className="h-2.5 flex-1 rounded-full"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      )}
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <div className="relative h-40 w-40 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius={48}
              outerRadius={68}
              paddingAngle={2}
              stroke="var(--surface)"
              strokeWidth={2}
            >
              {data.map((seg) => (
                <Cell key={seg.key} fill={seg.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
                color: "var(--foreground)",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-semibold">{total}</span>
          <span className="text-[11px] text-muted">open WOs</span>
        </div>
      </div>

      <ul className="flex flex-1 flex-col gap-2">
        {data.map((seg) => (
          <li key={seg.key} className="flex items-center gap-2 text-sm">
            <seg.icon
              className="h-4 w-4 shrink-0"
              style={{ color: seg.color }}
            />
            <span className="flex-1 text-muted">{seg.label}</span>
            <span className="font-medium">{seg.value}</span>
          </li>
        ))}
      </ul>
      </div>
    </div>
  );
}
