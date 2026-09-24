import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: "default" | "warning" | "danger";
}) {
  const toneStyles = {
    default: "bg-brand-navy text-white",
    warning: "bg-brand-gold text-brand-navy-dark",
    danger: "bg-red-600 text-white",
  }[tone];

  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-surface p-5">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${toneStyles}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-semibold leading-none">{value}</p>
        <p className="mt-1 text-sm text-muted">{label}</p>
      </div>
    </div>
  );
}
