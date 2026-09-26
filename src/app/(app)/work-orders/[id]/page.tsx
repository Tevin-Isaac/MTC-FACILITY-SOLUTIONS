import { notFound } from "next/navigation";
import {
  getCompletion,
  getInvoicesForWorkOrder,
  getWorkOrderById,
  getWorkOrderEvents,
  getWorkOrderNotes,
} from "@/lib/data/queries";
import { WorkOrderDetail } from "@/components/WorkOrderDetail";

export default async function WorkOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const wo = await getWorkOrderById(id);
  if (!wo) notFound();

  const [events, notes, invoices, completion] = await Promise.all([
    getWorkOrderEvents(id),
    getWorkOrderNotes(id),
    getInvoicesForWorkOrder(id),
    getCompletion(id),
  ]);

  return (
    <WorkOrderDetail
      workOrder={wo}
      events={events}
      notes={notes}
      invoices={invoices}
      completion={completion}
    />
  );
}
