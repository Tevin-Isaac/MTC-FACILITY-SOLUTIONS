"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Account, Site, Vendor, WorkOrder, Trade } from "@/types/work-order";
import { siteById, accountForSite, vendorById, vendorsForTrade } from "@/lib/domain";

interface AppData {
  accounts: Account[];
  sites: Site[];
  vendors: Vendor[];
  workOrders: WorkOrder[];
  siteById: (siteId: string) => Site | undefined;
  accountForSite: (siteId: string) => Account | undefined;
  vendorById: (vendorId: string | null) => Vendor | undefined;
  vendorsForTrade: (trade: Trade) => Vendor[];
}

const AppDataContext = createContext<AppData | null>(null);

// Reference + transactional data is fetched once per request in the
// (app) layout server component and provided here so client components
// that are always mounted — the notification bell, the command palette —
// or that need ID lookups — the Kanban board, the assign-vendor drawer —
// can read it without each fetching or prop-drilling it themselves. Pages
// that render their own primary content still fetch their own copy of
// work orders server-side (so saved-view/board filtering can be computed
// there); this context is for chrome and cross-cutting lookups.
export function AppDataProvider({
  accounts,
  sites,
  vendors,
  workOrders,
  children,
}: {
  accounts: Account[];
  sites: Site[];
  vendors: Vendor[];
  workOrders: WorkOrder[];
  children: ReactNode;
}) {
  const value = useMemo<AppData>(
    () => ({
      accounts,
      sites,
      vendors,
      workOrders,
      siteById: (siteId: string) => siteById(sites, siteId),
      accountForSite: (siteId: string) => accountForSite(sites, accounts, siteId),
      vendorById: (vendorId: string | null) => vendorById(vendors, vendorId),
      vendorsForTrade: (trade: Trade) => vendorsForTrade(vendors, trade),
    }),
    [accounts, sites, vendors, workOrders]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppData {
  const ctx = useContext(AppDataContext);
  if (!ctx) {
    throw new Error("useAppData must be used within <AppDataProvider>");
  }
  return ctx;
}

// Some client components (e.g. WorkOrder[] lists) still need work orders
// available; those are passed as explicit props from the server component
// that fetched them, not through this context, since they change per page.
export type { WorkOrder };
