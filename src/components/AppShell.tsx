"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  ClipboardList,
  Building2,
  Wrench,
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

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen w-full">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-brand-navy text-white md:flex">
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white p-1.5">
            <Image
              src="/mtc-logo.png"
              alt="MTC Facility Solutions"
              width={40}
              height={40}
              className="h-full w-full object-contain"
              priority
            />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold">MTC</p>
            <p className="text-[11px] text-white/60">Work Order Platform</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
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

        <div className="border-t border-white/10 px-5 py-4 text-[11px] text-white/50">
          MTC Facility Solutions LLC
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-4">
          <div className="flex items-center gap-3 md:hidden">
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
          <div className="flex items-center gap-2">
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
