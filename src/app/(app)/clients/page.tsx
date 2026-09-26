import { getAppData } from "@/lib/data/queries";
import { ClientsPageClient } from "@/components/ClientsPageClient";

export default async function ClientsPage() {
  const { accounts, sites, workOrders } = await getAppData();
  return <ClientsPageClient accounts={accounts} sites={sites} workOrders={workOrders} />;
}
