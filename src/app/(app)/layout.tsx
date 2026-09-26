import { AppShell } from "@/components/AppShell";
import { AppDataProvider } from "@/components/AppDataProvider";
import { getAppData } from "@/lib/data/queries";
import { getSession } from "@/lib/auth";
import type { ReactNode } from "react";

export default async function AppGroupLayout({ children }: { children: ReactNode }) {
  const [{ accounts, sites, vendors, workOrders }, session] = await Promise.all([
    getAppData(),
    getSession(),
  ]);

  return (
    <AppDataProvider accounts={accounts} sites={sites} vendors={vendors} workOrders={workOrders}>
      <AppShell session={session}>{children}</AppShell>
    </AppDataProvider>
  );
}
