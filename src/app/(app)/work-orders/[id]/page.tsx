import { notFound } from "next/navigation";
import { workOrderById } from "@/lib/mock-data";
import { WorkOrderDetail } from "@/components/WorkOrderDetail";

export default async function WorkOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const wo = workOrderById(id);
  if (!wo) notFound();

  return <WorkOrderDetail initialWorkOrder={wo} />;
}
