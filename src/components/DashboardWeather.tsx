"use client";

import { useEffect, useRef, useState } from "react";
import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Moon,
  Sun,
} from "lucide-react";
import type { WeatherSnapshot } from "@/lib/weather-shared";
import { weatherLabel } from "@/lib/weather-shared";

const TZ = "America/Chicago";

function WeatherIcon({
  code,
  isDay,
  className = "h-5 w-5",
}: {
  code: number;
  isDay: boolean;
  className?: string;
}) {
  if (code === 0) return isDay ? <Sun className={className} /> : <Moon className={className} />;
  if (code <= 3) return <CloudSun className={className} />;
  if (code === 45 || code === 48) return <CloudFog className={className} />;
  if (code >= 71 && code <= 86) return <CloudSnow className={className} />;
  if (code >= 95) return <CloudLightning className={className} />;
  if (code >= 51) return <CloudRain className={className} />;
  return <Cloud className={className} />;
}

function formatClock(now: Date): string {
  return now.toLocaleTimeString("en-US", {
    timeZone: TZ,
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDate(now: Date): string {
  return now.toLocaleDateString("en-US", {
    timeZone: TZ,
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function hourLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    timeZone: TZ,
    hour: "numeric",
  });
}

function hourIsDay(iso: string): boolean {
  const hour = Number(
    new Date(iso).toLocaleString("en-US", {
      timeZone: TZ,
      hour: "numeric",
      hour12: false,
    })
  );
  return hour >= 6 && hour < 20;
}

function isCurrentHour(iso: string, now: Date): boolean {
  const start = new Date(iso).getTime();
  const t = now.getTime();
  return t >= start && t < start + 60 * 60 * 1000;
}

export function DashboardWeather({ weather }: { weather: WeatherSnapshot | null }) {
  const [now, setNow] = useState(() => new Date());
  const hourRail = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const tick = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    const rail = hourRail.current;
    if (!rail || !weather) return;
    const active = rail.querySelector("[data-now='true']");
    if (active instanceof HTMLElement) {
      active.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
    }
  }, [weather, now.getHours()]);

  return (
    <div className="mt-8 border-t border-white/10 pt-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 text-[11px] font-medium text-white/65">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold" />
            {weather?.place ?? "Little Elm, TX"} · live
          </p>
          <p className="mt-1 text-sm text-white/80">
            {formatDate(now)}
            <span className="mx-2 text-white/35">·</span>
            <span className="tabular-nums tracking-tight">{formatClock(now)}</span>
          </p>
        </div>

        {weather && (
          <div className="flex items-center gap-3">
            <span className="text-white/80">
              <WeatherIcon
                code={weather.current.code}
                isDay={weather.current.isDay}
                className="h-8 w-8"
              />
            </span>
            <div>
              <p className="text-[34px] font-semibold leading-none tracking-[-0.04em] tabular-nums">
                {weather.current.tempF}°
              </p>
              <p className="mt-1 text-xs text-white/65">
                {weatherLabel(weather.current.code, weather.current.isDay)} · feels{" "}
                {weather.current.feelsF}° · {weather.current.windMph} mph
                {weather.days[0] && (
                  <>
                    {" "}
                    · {weather.days[0].highF}° / {weather.days[0].lowF}°
                  </>
                )}
              </p>
            </div>
          </div>
        )}
      </div>

      {weather && weather.hours.length > 0 && (
        <ul
          ref={hourRail}
          className="mt-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {weather.hours.map((hour) => {
            const current = isCurrentHour(hour.time, now);
            return (
              <li
                key={hour.time}
                data-now={current ? "true" : undefined}
                className={`flex w-[4.4rem] shrink-0 flex-col items-center rounded-card px-2 py-2.5 text-center ring-1 ring-inset transition-colors ${
                  current
                    ? "bg-gold text-navy-deep ring-gold"
                    : "bg-white/8 text-white ring-white/10"
                }`}
              >
                <span className={`text-[10px] font-medium ${current ? "text-navy-deep/70" : "text-white/55"}`}>
                  {current ? "Now" : hourLabel(hour.time)}
                </span>
                <WeatherIcon
                  code={hour.code}
                  isDay={hourIsDay(hour.time)}
                  className="mt-1.5 h-4 w-4"
                />
                <span className="mt-1.5 text-sm font-semibold tabular-nums">{hour.tempF}°</span>
                <span className={`mt-0.5 text-[10px] tabular-nums ${current ? "text-navy-deep/55" : "text-white/40"}`}>
                  {hour.precipChance}%
                </span>
              </li>
            );
          })}
        </ul>
      )}

    </div>
  );
}
