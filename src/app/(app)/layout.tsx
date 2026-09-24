import { AppShell } from "@/components/AppShell";
import { AppDataProvider } from "@/components/AppDataProvider";
import { getAppData } from "@/lib/data/queries";
import type { ReactNode } from "react";

export default async function AppGroupLayout({ children }: { children: ReactNode }) {
  const { accounts, sites, vendors, workOrders } = await getAppData();

  return (
    <AppDataProvider accounts={accounts} sites={sites} vendors={vendors} workOrders={workOrders}>
      <AppShell>{children}</AppShell>
    </AppDataProvider>
  );
}
