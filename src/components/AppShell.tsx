"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard,
  ClipboardList,
  Building2,
  Wrench,
  Menu,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CommandPalette } from "@/components/CommandPalette";
import { NotificationBell } from "@/components/NotificationBell";
import { UserMenu } from "@/components/UserMenu";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/work-orders", label: "Work Orders", icon: ClipboardList },
  { href: "/clients", label: "Clients", icon: Building2 },
  { href: "/vendors", label: "Vendors", icon: Wrench },
];

function NavLinks({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={`relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active ? "text-brand-navy-dark" : "text-white/75 hover:bg-white/10 hover:text-white"
            }`}
          >
            {active && (
              <motion.span
                layoutId="nav-active-pill"
                className="absolute inset-0 rounded-lg bg-brand-gold"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
            <Icon className="relative z-10 h-4 w-4" />
            <span className="relative z-10">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function BrandMark({ size }: { size: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-lg bg-white p-1.5"
      style={{ height: size, width: size }}
    >
      <Image
        src="/mtc-logo.png"
        alt="MTC Facility Solutions"
        width={size}
        height={size}
        className="h-full w-full object-contain"
        priority
      />
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-brand-navy text-white md:flex">
        <div className="flex items-center gap-3 px-5 py-5">
          <BrandMark size={44} />
          <div className="leading-tight">
            <p className="text-sm font-semibold">MTC</p>
            <p className="text-[11px] text-white/60">Work Order Platform</p>
          </div>
        </div>

        <NavLinks pathname={pathname} />

        <div className="border-t border-white/10 px-5 py-4 text-[11px] text-white/50">
          MTC Facility Solutions LLC
        </div>
      </aside>

      <AnimatePresence>
        {mobileNavOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex md:hidden"
            onClick={() => setMobileNavOpen(false)}
          >
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
              className="flex h-full w-72 flex-col bg-brand-navy text-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-5">
                <div className="flex items-center gap-3">
                  <BrandMark size={40} />
                  <div className="leading-tight">
                    <p className="text-sm font-semibold">MTC</p>
                    <p className="text-[11px] text-white/60">Work Order Platform</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  className="rounded-full p-1.5 text-white/70 hover:bg-white/10"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <NavLinks pathname={pathname} onNavigate={() => setMobileNavOpen(false)} />

              <div className="border-t border-white/10 px-5 py-4 text-[11px] text-white/50">
                MTC Facility Solutions LLC
              </div>
            </motion.aside>
            <div className="absolute inset-0 -z-10 bg-black/40 backdrop-blur-sm" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-border bg-surface px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2 md:hidden">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="rounded-lg p-2 text-muted hover:bg-black/5"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white p-1">
              <Image
                src="/mtc-logo.png"
                alt="MTC Facility Solutions"
                width={32}
                height={32}
                className="h-full w-full object-contain"
              />
            </div>
            <span className="text-sm font-semibold">MTC</span>
          </div>
          <div className="hidden md:block">
            <CommandPalette />
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <NotificationBell />
            <UserMenu />
          </div>
        </header>

        <main className="flex-1 bg-background">{children}</main>
      </div>
    </div>
  );
}
