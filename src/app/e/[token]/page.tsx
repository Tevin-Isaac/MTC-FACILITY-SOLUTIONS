import { notFound } from "next/navigation";
import { readShareToken } from "@/lib/share-token";
import { loadPublicWorkOrder } from "@/lib/data/public-document";
import { quoteTotals } from "@/lib/quote";
import { Money } from "@/components/ui";
import { PublicDocumentFrame } from "@/components/PublicDocumentFrame";
import { PublicEstimateDecision } from "@/components/PublicEstimateDecision";
import { QuoteDocument } from "@/components/QuoteDocument";

export default async function PublicEstimatePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const parsed = readShareToken(decodeURIComponent(token));
  if (!parsed || parsed.kind !== "e") notFound();

  let doc;
  try {
    doc = await loadPublicWorkOrder(parsed.workOrderId);
  } catch {
    return (
      <PublicDocumentFrame
        eyebrow="Estimate"
        title="Estimate unavailable"
        subtitle="This link cannot be opened right now."
      >
        <p className="text-sm text-ink-2">
          Ask your MTC coordinator to resend the estimate. Staff share links need the
          server key configured.
        </p>
      </PublicDocumentFrame>
    );
  }
  if (!doc || !doc.quote) notFound();

  const awaiting = doc.workOrder.status === "quote_with_client" && doc.quote.status === "submitted";
  const decided = doc.quote.status === "approved" || doc.quote.status === "declined";

  return (
    <PublicDocumentFrame
      eyebrow="Estimate"
      title={`${doc.workOrder.woNumber} · ${doc.account?.name ?? "Client"}`}
      subtitle={doc.site ? `${doc.site.name} · ${doc.site.address}` : "MTC Facility Solutions"}
    >
      <QuoteDocument scope={doc.workOrder.description} quote={doc.quote} optionLabel />

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-card bg-sunken p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">
            {doc.quote.optionType === "repair_vs_replace" ? "Option A · Repair" : "Quote total"}
          </p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">
            <Money amount={quoteTotals(doc.quote).repair} />
          </p>
        </div>
        {doc.quote.optionType === "repair_vs_replace" && (
          <div className="rounded-card bg-sunken p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">
              Option B · Replace
            </p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">
              <Money amount={quoteTotals(doc.quote).replace} />
            </p>
          </div>
        )}
      </div>

      {decided && (
        <p className="mt-5 rounded-card bg-navy-tint px-4 py-3 text-sm text-navy-ink">
          This estimate was {doc.quote.status}
          {doc.quote.approvedBy ? ` by ${doc.quote.approvedBy}` : ""}.
        </p>
      )}

      {awaiting && <PublicEstimateDecision token={token} />}
    </PublicDocumentFrame>
  );
}
