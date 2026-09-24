import { getWorkOrders } from "@/lib/data/queries";
import { WorkOrdersPageClient } from "@/components/WorkOrdersPageClient";

export default async function WorkOrdersPage() {
  const workOrders = await getWorkOrders();
  return <WorkOrdersPageClient initialWorkOrders={workOrders} />;
}
