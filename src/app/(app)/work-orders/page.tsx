import { Suspense } from "react";
import { getWorkOrders } from "@/lib/data/queries";
import { WorkOrdersPageClient } from "@/components/WorkOrdersPageClient";

export default async function WorkOrdersPage() {
  const workOrders = await getWorkOrders();
  return (
    <Suspense>
      <WorkOrdersPageClient initialWorkOrders={workOrders} />
    </Suspense>
  );
}
