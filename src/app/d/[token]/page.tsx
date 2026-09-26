import { notFound } from "next/navigation";
import { readShareToken } from "@/lib/share-token";
import { loadPublicWorkOrder } from "@/lib/data/public-document";
import { PublicDocumentFrame } from "@/components/PublicDocumentFrame";

export default async function PublicDeliveryPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const parsed = readShareToken(decodeURIComponent(token));
  if (!parsed || parsed.kind !== "d") notFound();

  let doc;
  try {
    doc = await loadPublicWorkOrder(parsed.workOrderId);
  } catch {
    return (
      <PublicDocumentFrame
        eyebrow="Delivery"
        title="Receipt unavailable"
        subtitle="This link cannot be opened right now."
      >
        <p className="text-sm text-ink-2">
          Ask your MTC coordinator to resend the delivery receipt.
        </p>
      </PublicDocumentFrame>
    );
  }
  if (!doc) notFound();

  const before = doc.completion?.beforePhotoUrls ?? [];
  const after = doc.completion?.afterPhotoUrls ?? [];

  return (
    <PublicDocumentFrame
      eyebrow="Delivery receipt"
      title={`${doc.workOrder.woNumber} · ${doc.account?.name ?? "Client"}`}
      subtitle={doc.site ? `${doc.site.name} · ${doc.site.address}` : "MTC Facility Solutions"}
    >
      <p className="text-sm text-ink-2">{doc.workOrder.description}</p>
      <p className="mt-2 text-xs capitalize text-ink-3">
        Status · {doc.workOrder.status.replace(/_/g, " ")}
      </p>

      {doc.completion?.rootCause && (
        <p className="mt-4 text-sm text-ink-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">
            Root cause
          </span>
          <span className="mt-1 block">{doc.completion.rootCause}</span>
        </p>
      )}

      {doc.completion?.signOffName && (
        <div className="mt-4 rounded-card bg-good-tint px-4 py-3">
          <p className="text-sm text-good">
            Signed off by {doc.completion.signOffName}
            {doc.completion.signOffAt
              ? ` · ${new Date(doc.completion.signOffAt).toLocaleDateString()}`
              : ""}
          </p>
          {doc.completion.signOffSignatureUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={doc.completion.signOffSignatureUrl}
              alt="Signature"
              className="mt-2 h-14 w-auto rounded bg-white"
            />
          )}
        </div>
      )}

      {before.length > 0 && (
        <div className="mt-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">Before</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {before.map((url) => (
              <a key={url} href={url} target="_blank" rel="noreferrer" className="overflow-hidden rounded-card bg-sunken">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="Before" className="h-36 w-full object-cover" />
              </a>
            ))}
          </div>
        </div>
      )}

      {after.length > 0 && (
        <div className="mt-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">After</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {after.map((url) => (
              <a key={url} href={url} target="_blank" rel="noreferrer" className="overflow-hidden rounded-card bg-sunken">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="After" className="h-36 w-full object-cover" />
              </a>
            ))}
          </div>
        </div>
      )}

      {doc.completion?.afterVideoUrl && (
        <div className="mt-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">After video</p>
          <video
            src={doc.completion.afterVideoUrl}
            controls
            className="mt-2 w-full rounded-card bg-sunken"
          />
        </div>
      )}

      {before.length === 0 && after.length === 0 && (
        <p className="mt-5 text-sm text-ink-3">Photos will appear here once MTC attaches them.</p>
      )}
    </PublicDocumentFrame>
  );
}
