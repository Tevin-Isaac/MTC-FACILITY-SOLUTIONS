import { notFound } from "next/navigation";
import { readShareToken } from "@/lib/share-token";
import { loadPublicWorkOrder } from "@/lib/data/public-document";
import { Money } from "@/components/ui";
import { PublicDocumentFrame } from "@/components/PublicDocumentFrame";

export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const parsed = readShareToken(decodeURIComponent(token));
  if (!parsed || parsed.kind !== "i") notFound();

  let doc;
  try {
    doc = await loadPublicWorkOrder(parsed.workOrderId);
  } catch {
    return (
      <PublicDocumentFrame
        eyebrow="Invoice"
        title="Invoice unavailable"
        subtitle="This link cannot be opened right now."
      >
        <p className="text-sm text-ink-2">
          Ask your MTC coordinator to resend the invoice. Staff share links need the
          server key configured.
        </p>
      </PublicDocumentFrame>
    );
  }
  if (!doc || !doc.invoice) notFound();

  return (
    <PublicDocumentFrame
      eyebrow="Invoice"
      title={doc.invoice.invoiceNumber}
      subtitle={`${doc.workOrder.woNumber} · ${doc.account?.name ?? "Client"}`}
    >
      <p className="text-sm text-ink-2">{doc.workOrder.description}</p>
      {doc.site && (
        <p className="mt-1 text-xs text-ink-3">
          {doc.site.name} · {doc.site.address}
        </p>
      )}

      <div className="mt-5 rounded-card bg-sunken p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">Amount due</p>
        <p className="mt-2 text-3xl font-semibold tabular-nums">
          <Money amount={doc.invoice.amount} />
        </p>
        <p className="mt-2 text-xs capitalize text-ink-2">Status · {doc.invoice.status}</p>
        {doc.invoice.dueAt && (
          <p className="mt-1 text-xs text-ink-3">
            Due {new Date(doc.invoice.dueAt).toLocaleDateString()}
          </p>
        )}
      </div>

      <p className="mt-5 text-sm text-ink-2">
        Please remit payment to MTC Facility Solutions LLC. Contact your coordinator if
        you have questions about this invoice.
      </p>
    </PublicDocumentFrame>
  );
}
