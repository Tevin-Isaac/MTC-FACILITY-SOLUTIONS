"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { EASE_OUT, SPRING } from "@/components/motion";

/**
 * Right-hand sheet. The page behind scales and blurs (iOS-style) so the
 * drawer feels like it owns the screen rather than just sliding over it.
 * Closes on backdrop click, Escape, or a rightward drag.
 */
export function Drawer({
  open,
  onClose,
  title,
  sub,
  children,
  footer,
  width = "max-w-md",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  sub?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.documentElement.setAttribute("data-drawer-open", "");
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.removeAttribute("data-drawer-open");
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: EASE_OUT }}
            onClick={onClose}
            className="absolute inset-0 bg-navy-deep/55 backdrop-blur-xl"
          />
          <motion.div
            aria-hidden
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: EASE_OUT }}
            className="pointer-events-none absolute -right-16 top-1/4 h-72 w-72 rounded-full bg-gold/20 blur-3xl"
          />

          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === "string" ? title : undefined}
            initial={reduce ? { opacity: 0 } : { x: "108%", scale: 0.94, rotate: 1.2 }}
            animate={reduce ? { opacity: 1 } : { x: 0, scale: 1, rotate: 0 }}
            exit={reduce ? { opacity: 0 } : { x: "108%", scale: 0.96, rotate: 0.8 }}
            transition={SPRING}
            drag={reduce ? false : "x"}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={{ left: 0, right: 0.55 }}
            dragMomentum={false}
            onDragEnd={(_, info) => {
              if (info.offset.x > 110 || info.velocity.x > 550) onClose();
            }}
            className={`absolute inset-y-2 right-2 flex w-[calc(100%-1rem)] flex-col overflow-hidden rounded-hero bg-surface shadow-hero sm:inset-y-3 sm:right-3 sm:w-[calc(100%-1.5rem)] ${width}`}
          >
            <span
              aria-hidden
              className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-gold via-navy to-gold"
            />
            <span
              aria-hidden
              className="absolute left-1.5 top-1/2 h-14 w-1.5 -translate-y-1/2 cursor-grab rounded-full bg-hairline-strong active:cursor-grabbing"
            />

            <header className="relative flex items-start justify-between gap-3 px-6 pb-4 pt-6">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-navy-tint/80 to-transparent"
              />
              <div className="relative min-w-0">
                <span
                  aria-hidden
                  className="mb-3 mx-auto block h-1 w-10 rounded-full bg-hairline-strong sm:hidden"
                />
                <h2 className="text-lg font-semibold tracking-[-0.02em]">{title}</h2>
                {sub && <p className="mt-0.5 text-xs text-ink-3">{sub}</p>}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="relative -mr-1 shrink-0 rounded-full p-2 text-ink-3 transition-colors hover:bg-tint hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-4 pb-5">{children}</div>

            {footer && (
              <div className="border-t border-hairline bg-sunken/80 px-6 py-4 backdrop-blur-sm">
                {footer}
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

/** Staggered list item for drawer content, so rows arrive after the panel. */
export function DrawerItem({
  children,
  index = 0,
  className,
}: {
  children: ReactNode;
  index?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, x: 22, y: 8 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.45, delay: 0.12 + index * 0.06, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}
