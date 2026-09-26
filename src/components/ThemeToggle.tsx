"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

function readTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem("mtc-theme");
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: "light" | "dark") {
  document.documentElement.setAttribute("data-theme", theme);
  window.localStorage.setItem("mtc-theme", theme);
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const initial = readTheme();
    setTheme(initial);
    applyTheme(initial);
    setReady(true);
  }, []);

  function choose(next: "light" | "dark") {
    setTheme(next);
    applyTheme(next);
  }

  return (
    <div
      role="group"
      aria-label="Color theme"
      className={`relative inline-flex items-center rounded-full bg-tint p-1 shadow-soft ${
        compact ? "gap-0" : ""
      }`}
    >
      <span
        aria-hidden
        className={`pointer-events-none absolute top-1 bottom-1 w-[calc(50%-2px)] rounded-full bg-surface shadow-soft transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          theme === "dark" ? "translate-x-[calc(100%+4px)]" : "translate-x-0"
        }`}
      />
      <button
        type="button"
        onClick={() => choose("light")}
        aria-pressed={theme === "light"}
        className={`relative z-10 inline-flex items-center justify-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors ${
          theme === "light" ? "text-ink" : "text-ink-3 hover:text-ink"
        }`}
      >
        <Sun className="h-3.5 w-3.5" />
        {compact ? null : "Light"}
      </button>
      <button
        type="button"
        onClick={() => choose("dark")}
        aria-pressed={theme === "dark"}
        className={`relative z-10 inline-flex items-center justify-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors ${
          theme === "dark" ? "text-ink" : "text-ink-3 hover:text-ink"
        }`}
      >
        <Moon className="h-3.5 w-3.5" />
        {compact ? null : "Dark"}
      </button>
      {!ready && <span className="sr-only">Loading theme</span>}
    </div>
  );
}
