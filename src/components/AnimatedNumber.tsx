"use client";

import { useEffect, useRef } from "react";
import { animate } from "framer-motion";

// Counts up from 0 to `value` on mount. Purely a polish touch — falls back
// to the plain number instantly if the browser prefers reduced motion.
export function AnimatedNumber({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion) {
      node.textContent = value.toLocaleString();
      return;
    }

    const controls = animate(0, value, {
      duration: 0.6,
      ease: "easeOut",
      onUpdate(latest) {
        node.textContent = Math.round(latest).toLocaleString();
      },
    });
    return () => controls.stop();
  }, [value]);

  return <span ref={ref} className="tabular-nums">0</span>;
}
