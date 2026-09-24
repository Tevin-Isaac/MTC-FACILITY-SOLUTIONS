import { notFound } from "next/navigation";
import { getWorkOrderById } from "@/lib/data/queries";
import { WorkOrderDetail } from "@/components/WorkOrderDetail";

export default async function WorkOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const wo = await getWorkOrderById(id);
  if (!wo) notFound();

  return <WorkOrderDetail initialWorkOrder={wo} />;
}
