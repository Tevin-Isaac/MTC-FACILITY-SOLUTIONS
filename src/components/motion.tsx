"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

/* Shared entrance and hover motion. Kept in one place so timing and easing
   stay identical across screens — mismatched durations are what makes an
   interface feel cheap rather than calm. */

/** Soft deceleration curve. Fast to start, long settle. */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/** Weighted sheet — a little snap, then a long settle. */
export const SPRING = { type: "spring", stiffness: 380, damping: 32, mass: 0.82 } as const;

/**
 * Fade-and-rise on mount. `index` staggers siblings without needing a
 * container variant, which keeps grid/flex parents untouched.
 */
export function Reveal({
  children,
  index = 0,
  delay = 0,
  className,
  y = 16,
}: {
  children: ReactNode;
  index?: number;
  delay?: number;
  className?: string;
  y?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay: delay + index * 0.06, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}

/** Lifts on hover and presses on tap. Wraps a full tile. */
export function Lift({
  children,
  className,
  amount = 4,
}: {
  children: ReactNode;
  className?: string;
  amount?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      whileHover={reduce ? undefined : { y: -amount }}
      whileTap={reduce ? undefined : { scale: 0.995 }}
      transition={{ duration: 0.22, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Slow drifting glow. Used behind saturated panels so a large flat colour
 * field has some life in it without becoming a distraction.
 */
export function Orb({
  className,
  duration = 18,
  delay = 0,
}: {
  className?: string;
  duration?: number;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <span aria-hidden className={className} />;
  return (
    <motion.span
      aria-hidden
      className={className}
      animate={{
        x: [0, 26, -14, 0],
        y: [0, -20, 14, 0],
        scale: [1, 1.12, 0.95, 1],
      }}
      transition={{ duration, delay, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}
