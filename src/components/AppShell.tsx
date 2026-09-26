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
  ReceiptText,
  Menu,
  X,
} from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CommandPalette } from "@/components/CommandPalette";
import { NotificationBell } from "@/components/NotificationBell";
import { UserMenu } from "@/components/UserMenu";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/work-orders", label: "Work Orders", icon: ClipboardList },
  { href: "/clients", label: "Clients", icon: Building2 },
  { href: "/vendors", label: "Vendors", icon: Wrench },
  { href: "/billing", label: "Billing", icon: ReceiptText },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-control bg-white p-1 shadow-soft"
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
    </span>
  );
}

/** Slim icon rail. Labels appear on hover so the rail stays narrow without
    becoming a guessing game. */
function Rail({ pathname }: { pathname: string }) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-[72px] shrink-0 flex-col items-center gap-1 border-r border-hairline bg-surface py-4 md:flex">
      <Link href="/dashboard" className="mb-3" aria-label="MTC Dashboard">
        <BrandMark size={38} />
      </Link>

      <nav className="flex flex-col items-center gap-1.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className="group relative flex h-11 w-11 items-center justify-center rounded-card transition-colors"
            >
              {active && (
                <motion.span
                  layoutId="rail-active"
                  className="absolute inset-0 rounded-card bg-navy"
                  transition={{ type: "spring", stiffness: 480, damping: 34 }}
                />
              )}
              <Icon
                className={`relative z-10 h-[18px] w-[18px] transition-colors ${
                  active ? "text-white" : "text-ink-3 group-hover:text-ink"
                }`}
              />
              {!active && (
                <span className="absolute inset-0 -z-0 rounded-card opacity-0 transition-opacity group-hover:bg-tint group-hover:opacity-100" />
              )}
              <span className="pointer-events-none absolute left-[calc(100%+10px)] z-30 hidden whitespace-nowrap rounded-control bg-navy-deep px-2.5 py-1.5 text-xs font-medium text-white shadow-lift group-hover:block">
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

function MobileDrawer({
  pathname,
  onClose,
}: {
  pathname: string;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex md:hidden"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-navy-deep/40 backdrop-blur-sm" />
      <motion.aside
        initial={{ x: "-108%", scale: 0.96 }}
        animate={{ x: 0, scale: 1 }}
        exit={{ x: "-108%", scale: 0.96 }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
        className="relative m-2 flex h-[calc(100%-1rem)] w-72 flex-col overflow-hidden rounded-hero bg-surface p-4 shadow-hero"
        onClick={(e) => e.stopPropagation()}
      >
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-gold via-navy to-gold"
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BrandMark size={36} />
            <div className="leading-tight">
              <p className="text-sm font-semibold">MTC</p>
              <p className="text-[11px] text-ink-3">Work Order Platform</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-control p-2 text-ink-3 hover:bg-tint hover:text-ink"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-6 flex flex-col gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-card px-3 py-2.5 text-sm font-medium transition-colors ${
                  active ? "bg-navy text-white" : "text-ink-2 hover:bg-tint hover:text-ink"
                }`}
              >
                <Icon className="h-[18px] w-[18px]" />
                {label}
              </Link>
            );
          })}
        </nav>

        <p className="mt-auto text-[11px] text-ink-3">MTC Facility Solutions LLC</p>
      </motion.aside>
    </motion.div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="relative flex min-h-dvh w-full bg-canvas">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <span className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-navy/8 blur-3xl" />
        <span className="absolute right-0 top-0 h-80 w-80 rounded-full bg-gold/10 blur-3xl" />
        <span className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-navy/5 blur-3xl" />
      </div>
      <Rail pathname={pathname} />

      <AnimatePresence>
        {mobileNavOpen && (
          <MobileDrawer pathname={pathname} onClose={() => setMobileNavOpen(false)} />
        )}
      </AnimatePresence>

      <div className="app-frame relative flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-hairline bg-canvas/70 px-4 py-3 backdrop-blur-xl sm:px-6">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="rounded-control p-2 text-ink-2 hover:bg-tint md:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 md:hidden">
            <BrandMark size={30} />
          </div>

          <div className="hidden min-w-0 flex-1 md:block">
            <CommandPalette />
          </div>

          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <NotificationBell />
            <UserMenu />
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
