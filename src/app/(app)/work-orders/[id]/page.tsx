import { notFound } from "next/navigation";
import {
  getCompletion,
  getInvoicesForWorkOrder,
  getQuoteForWorkOrder,
  getWorkOrderById,
  getWorkOrderEvents,
  getWorkOrderNotes,
} from "@/lib/data/queries";
import { makeShareToken } from "@/lib/share-token";
import { WorkOrderDetail } from "@/components/WorkOrderDetail";

export default async function WorkOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const wo = await getWorkOrderById(id);
  if (!wo) notFound();

  const [events, notes, invoices, completion, quote] = await Promise.all([
    getWorkOrderEvents(id),
    getWorkOrderNotes(id),
    getInvoicesForWorkOrder(id),
    getCompletion(id),
    getQuoteForWorkOrder(id),
  ]);

  const estimateSharePath =
    quote && quote.status !== "draft" ? `/e/${makeShareToken("e", id)}` : null;
  const invoiceSharePath = invoices.some((invoice) => invoice.status !== "draft")
    ? `/i/${makeShareToken("i", id)}`
    : null;
  const deliverySharePath =
    completion &&
    (completion.beforePhotoUrls.length > 0 ||
      completion.afterPhotoUrls.length > 0 ||
      completion.signOffAt)
      ? `/d/${makeShareToken("d", id)}`
      : null;

  return (
    <WorkOrderDetail
      workOrder={wo}
      events={events}
      notes={notes}
      invoices={invoices}
      completion={completion}
      quote={quote}
      estimateSharePath={estimateSharePath}
      invoiceSharePath={invoiceSharePath}
      deliverySharePath={deliverySharePath}
    />
  );
}
