"use client";

import { useState, type MouseEvent } from "react";
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { EASE_OUT, Orb } from "@/components/motion";
import { DashboardWeather } from "@/components/DashboardWeather";
import type { WeatherSnapshot } from "@/lib/weather-shared";

export interface HeroStat {
  label: string;
  value: string;
  /** Optional 0–1 fill for the meter under the number. */
  ratio?: number;
}

/**
 * The one saturated surface per screen. Mouse-follow spotlight, drifting
 * orbs, and live Little Elm weather so the board feels like it is running
 * in real time.
 */
export function DashboardHero({
  greeting,
  summary,
  stats,
  weather,
}: {
  greeting: string;
  summary: string;
  stats: HeroStat[];
  weather: WeatherSnapshot | null;
}) {
  const reduce = useReducedMotion();
  const [spot, setSpot] = useState({ x: 78, y: 22 });

  function onMove(e: MouseEvent<HTMLElement>) {
    if (reduce) return;
    const box = e.currentTarget.getBoundingClientRect();
    setSpot({
      x: ((e.clientX - box.left) / box.width) * 100,
      y: ((e.clientY - box.top) / box.height) * 100,
    });
  }

  return (
    <section
      onMouseMove={onMove}
      className="relative isolate overflow-hidden rounded-hero p-6 text-white shadow-hero sm:p-9"
    >
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(135deg, #0f2144 0%, #1b3868 48%, #2a4d8f 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 transition-[background] duration-300"
        style={{
          background: `radial-gradient(520px circle at ${spot.x}% ${spot.y}%, rgba(238,193,74,0.28), transparent 55%)`,
        }}
      />
      <Orb
        className="pointer-events-none absolute -right-24 -top-28 -z-10 h-80 w-80 rounded-full bg-gold/30 blur-3xl"
        duration={20}
      />
      <Orb
        className="pointer-events-none absolute -bottom-32 left-1/4 -z-10 h-72 w-72 rounded-full bg-sky-300/25 blur-3xl"
        duration={26}
        delay={2}
      />
      <Orb
        className="pointer-events-none absolute right-1/3 top-1/2 -z-10 h-40 w-40 rounded-full bg-white/10 blur-2xl"
        duration={16}
        delay={4}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.2]"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.7) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          maskImage: "radial-gradient(70% 80% at 80% 15%, black, transparent)",
          WebkitMaskImage: "radial-gradient(70% 80% at 80% 15%, black, transparent)",
        }}
      />

      <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
        <div className="max-w-lg">
          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE_OUT }}
            className="text-3xl font-semibold leading-[1.1] tracking-[-0.03em] sm:text-[42px]"
          >
            {greeting}
          </motion.h1>
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.08, ease: EASE_OUT }}
            className="mt-3 text-[15px] leading-relaxed text-white/75"
          >
            {summary}
          </motion.p>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.16, ease: EASE_OUT }}
            className="mt-7 flex flex-wrap items-center gap-2.5"
          >
            <Link
              href="/work-orders"
              className="group inline-flex items-center gap-2 rounded-full bg-gold px-5 py-3 text-sm font-semibold text-navy-deep shadow-[0_10px_30px_-12px_rgba(238,193,74,0.8)] transition-transform hover:scale-[1.03] hover:bg-white"
            >
              Open the board
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/work-orders/new"
              className="inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-3 text-sm font-semibold text-white ring-1 ring-inset ring-white/20 backdrop-blur-sm transition-colors hover:bg-white/20"
            >
              <Plus className="h-4 w-4" />
              New work order
            </Link>
          </motion.div>
        </div>

        {stats.length > 0 && (
          <dl className="grid shrink-0 grid-cols-3 gap-3 sm:gap-4 lg:min-w-[26rem]">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={reduce ? false : { opacity: 0, y: 18, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                whileHover={reduce ? undefined : { y: -4, scale: 1.02 }}
                transition={{ duration: 0.5, delay: 0.2 + i * 0.08, ease: EASE_OUT }}
                className="rounded-tile bg-white/10 px-4 py-4 ring-1 ring-inset ring-white/15 backdrop-blur-md sm:px-5 sm:py-5"
              >
                <dd className="text-[32px] font-semibold leading-none tracking-[-0.03em] tabular-nums sm:text-[38px]">
                  {s.value}
                </dd>
                <dt className="mt-2 text-[11px] font-medium leading-tight text-white/65">
                  {s.label}
                </dt>
                {s.ratio != null && (
                  <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/20">
                    <motion.div
                      initial={reduce ? false : { width: 0 }}
                      animate={{ width: `${Math.min(1, Math.max(0, s.ratio)) * 100}%` }}
                      transition={{ duration: 0.9, delay: 0.4 + i * 0.08, ease: EASE_OUT }}
                      className="h-full rounded-full bg-gold"
                    />
                  </div>
                )}
              </motion.div>
            ))}
          </dl>
        )}
      </div>

      <DashboardWeather weather={weather} />
    </section>
  );
}
