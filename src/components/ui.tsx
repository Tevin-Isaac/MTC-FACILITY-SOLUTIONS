import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";

/* Shared presentational primitives. Server-safe: no hooks, no client state,
   so both server and client components can use them. Every screen composes
   from these so the soft language stays consistent. */

export type Tone =
  | "neutral"
  | "good"
  | "warning"
  | "serious"
  | "critical"
  | "navy"
  | "gold";

const TONE_CHIP: Record<Tone, string> = {
  neutral: "bg-tint text-ink-2",
  good: "bg-good-tint text-good",
  warning: "bg-warning-tint text-warning",
  serious: "bg-serious-tint text-serious",
  critical: "bg-critical-tint text-critical",
  navy: "bg-navy-tint text-navy-ink",
  gold: "bg-gold-tint text-gold-deep",
};

const TONE_SOLID: Record<Tone, string> = {
  neutral: "bg-tint text-ink",
  good: "bg-good text-white",
  warning: "bg-warning text-white",
  serious: "bg-serious text-white",
  critical: "bg-critical text-white",
  navy: "bg-navy text-white",
  gold: "bg-gold text-navy-deep",
};

/** Soft surface container — the default building block for every panel. */
export function Tile({
  children,
  className = "",
  padded = true,
  style,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div
      style={style}
      className={`rounded-tile bg-surface shadow-soft ${padded ? "p-5 sm:p-6" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

/** Heading row inside a Tile: title, optional sub-label, optional trailing slot. */
export function SectionHead({
  title,
  sub,
  trailing,
}: {
  title: ReactNode;
  sub?: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold tracking-[-0.01em]">{title}</h2>
        {sub && <p className="mt-0.5 text-xs text-ink-3">{sub}</p>}
      </div>
      {trailing && <div className="shrink-0">{trailing}</div>}
    </div>
  );
}

/** Tinted chip. `dot` adds a leading status dot. */
export function Pill({
  children,
  tone = "neutral",
  dot = false,
  solid = false,
  className = "",
}: {
  children: ReactNode;
  tone?: Tone;
  dot?: boolean;
  solid?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${
        solid ? TONE_SOLID[tone] : TONE_CHIP[tone]
      } ${className}`}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  );
}

/** Rounded tinted icon holder, as on the reference KPI tiles. */
export function IconBadge({
  children,
  tone = "navy",
  size = "md",
}: {
  children: ReactNode;
  tone?: Tone;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "h-8 w-8 rounded-control" : "h-11 w-11 rounded-card";
  return (
    <span className={`flex shrink-0 items-center justify-center ${dim} ${TONE_CHIP[tone]}`}>
      {children}
    </span>
  );
}

/**
 * Segmented block bar — the "score blocks" pattern from the design
 * references. Reads as progress without a precise axis, which suits
 * lifecycle and health indicators.
 */
export function SegmentedBar({
  filled,
  total,
  color = "var(--navy)",
  height = 28,
}: {
  filled: number;
  total: number;
  color?: string;
  height?: number;
}) {
  return (
    <div className="flex gap-1" style={{ height }}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className="flex-1 rounded-md transition-colors"
          style={{
            background: i < filled ? color : "var(--surface-tint)",
            minWidth: 6,
          }}
        />
      ))}
    </div>
  );
}

/** Soft horizontal meter for a single 0–1 ratio. */
export function Meter({
  value,
  color = "var(--navy)",
  className = "",
}: {
  value: number;
  color?: string;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-tint ${className}`}>
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export function Money({
  amount,
  className = "",
}: {
  amount: number | null | undefined;
  className?: string;
}) {
  if (amount == null) return <span className="text-ink-3">—</span>;
  return (
    <span className={`tabular-nums ${className}`}>
      ${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}
    </span>
  );
}

/** Quiet empty state. Used instead of rendering a bare blank panel. */
export function Empty({
  title,
  hint,
  icon,
}: {
  title: string;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      {icon && <span className="text-ink-3">{icon}</span>}
      <p className="text-sm font-medium text-ink-2">{title}</p>
      {hint && <p className="max-w-sm text-xs text-ink-3">{hint}</p>}
    </div>
  );
}

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-control px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60";

const BUTTON_VARIANT = {
  primary: "bg-navy text-white hover:bg-navy-deep",
  gold: "bg-gold text-navy-deep hover:bg-gold/85",
  soft: "bg-tint text-ink hover:bg-hairline",
  ghost: "text-ink-2 hover:bg-tint hover:text-ink",
  outline: "border border-hairline-strong text-ink hover:bg-tint",
} as const;

export type ButtonVariant = keyof typeof BUTTON_VARIANT;

export function buttonClass(variant: ButtonVariant = "primary", extra = "") {
  return `${BUTTON_BASE} ${BUTTON_VARIANT[variant]} ${extra}`;
}

/** Link styled as a button. For real buttons use `buttonClass` directly. */
export function LinkButton({
  href,
  children,
  variant = "primary",
  className = "",
}: {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
  className?: string;
}) {
  return (
    <Link href={href} className={buttonClass(variant, className)}>
      {children}
    </Link>
  );
}

/* Form field styling, shared by the create form, the auth screens and the
   inline panels so inputs look identical everywhere. */
export const labelClass = "mb-1.5 block text-xs font-medium text-ink-2";

export const inputClass =
  "w-full rounded-control bg-sunken px-3.5 py-2.5 text-sm text-ink outline-none transition-shadow placeholder:text-ink-3 focus:ring-2 focus:ring-navy/25 disabled:opacity-60";

export function FormField({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className={labelClass} htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-ink-3">{hint}</p>}
    </div>
  );
}

/** Label/value row for the detail panels. */
export function Field({
  label,
  children,
  mono = false,
}: {
  label: string;
  children: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <dt className="shrink-0 text-xs text-ink-3">{label}</dt>
      <dd className={`min-w-0 text-right text-sm ${mono ? "tabular-nums" : ""}`}>{children}</dd>
    </div>
  );
}
