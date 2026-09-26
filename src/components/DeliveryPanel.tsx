"use client";

import { useState } from "react";
import { CheckCircle2, Circle, Copy, Check, Mail, Send } from "lucide-react";
import type { CompletionRecord, WorkOrder } from "@/types/work-order";
import { recordSignOff, setPurchaseOrder } from "@/lib/actions/work-orders";
import { sendDeliveryToClient } from "@/lib/actions/estimates";
import { saveRootCause } from "@/lib/actions/files";
import { CompletionPhotosForm } from "@/components/CompletionPhotosForm";
import { SignOffPad } from "@/components/SignOffPad";
import { useAction } from "@/components/useAction";
import { Tile, SectionHead, Pill, buttonClass, inputClass, labelClass } from "@/components/ui";

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function DeliveryPanel({
  workOrder,
  completion,
  contactEmail,
  contactName,
  initialSharePath,
}: {
  workOrder: WorkOrder;
  completion: CompletionRecord | null;
  contactEmail: string | null;
  contactName: string | null;
  initialSharePath: string | null;
}) {
  const { pending, submit } = useAction();
  const [sharePath, setSharePath] = useState<string | null>(initialSharePath);
  const [copied, setCopied] = useState(false);

  const gates = {
    before: (completion?.beforePhotoUrls.length ?? 0) > 0,
    after: (completion?.afterPhotoUrls.length ?? 0) > 0,
    signOff: Boolean(completion?.signOffAt),
    po: Boolean(workOrder.poNumber),
    root: Boolean(completion?.rootCause),
  };
  const ready = gates.before && gates.after && gates.signOff;

  function shareUrl(path: string) {
    return `${window.location.origin}${path}`;
  }

  const packet = [
    `Delivery · ${workOrder.woNumber}`,
    workOrder.description,
    gates.before ? `Before photos: ${completion?.beforePhotoUrls.length}` : "Before photos: missing",
    gates.after ? `After photos: ${completion?.afterPhotoUrls.length}` : "After photos: missing",
    completion?.rootCause ? `Root cause: ${completion.rootCause}` : null,
    gates.signOff
      ? `Signed off by ${completion?.signOffName}${completion?.signOffAt ? ` · ${formatWhen(completion.signOffAt)}` : ""}`
      : "Sign-off: outstanding",
    sharePath ? `Client receipt: ${sharePath}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <Tile>
      <SectionHead
        title="Delivery"
        sub="Photos from the job, sign-off, then a receipt the client can open."
        trailing={
          <Pill tone={ready ? "good" : "warning"}>{ready ? "Ready to send" : "Outstanding"}</Pill>
        }
      />

      <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {[
          { label: "Before photos", done: gates.before },
          { label: "After photos", done: gates.after },
          { label: "Manager sign-off", done: gates.signOff },
          { label: "Purchase order on file", done: gates.po },
        ].map((gate) => (
          <li key={gate.label} className="flex items-center gap-2.5 rounded-card bg-sunken px-3.5 py-2.5 text-sm">
            {gate.done ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-good" />
            ) : (
              <Circle className="h-4 w-4 shrink-0 text-ink-3" />
            )}
            <span className={gate.done ? "" : "text-ink-2"}>{gate.label}</span>
          </li>
        ))}
      </ul>

      <CompletionPhotosForm
        workOrderId={workOrder.id}
        beforeUrls={completion?.beforePhotoUrls ?? []}
        afterUrls={completion?.afterPhotoUrls ?? []}
        videoUrl={completion?.afterVideoUrl ?? null}
      />

      <form
        className="mt-4 space-y-2"
        onSubmit={(event) => {
          event.preventDefault();
          submit(saveRootCause, new FormData(event.currentTarget));
        }}
      >
        <label className={labelClass} htmlFor="rootCause">
          Root cause
        </label>
        <textarea
          id="rootCause"
          name="rootCause"
          rows={2}
          defaultValue={completion?.rootCause ?? ""}
          placeholder="What actually failed, in one sentence."
          className={`${inputClass} resize-y`}
        />
        <input type="hidden" name="workOrderId" value={workOrder.id} />
        <button type="submit" disabled={pending} className={buttonClass("soft")}>
          {pending ? "Saving…" : gates.root ? "Update root cause" : "Save root cause"}
        </button>
      </form>

      {!gates.po && (
        <form
          className="mt-4 flex flex-col gap-2 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            submit(setPurchaseOrder, new FormData(event.currentTarget));
          }}
        >
          <input type="hidden" name="workOrderId" value={workOrder.id} />
          <input
            name="poNumber"
            required
            placeholder="PO or client reference"
            className={`${inputClass} sm:flex-1`}
          />
          <button type="submit" disabled={pending} className={buttonClass("soft")}>
            {pending ? "Saving…" : "Save PO"}
          </button>
        </form>
      )}
      {gates.po && (
        <p className="mt-3 text-xs text-ink-2">
          PO on file · <span className="tabular-nums">{workOrder.poNumber}</span>
        </p>
      )}

      {!gates.signOff && (
        <SignOffPad
          workOrderId={workOrder.id}
          pending={pending}
          onSubmit={(form) => submit(recordSignOff, form)}
        />
      )}
      {gates.signOff && (
        <div className="mt-3 rounded-card bg-good-tint px-4 py-3">
          <p className="text-xs text-good">
            Signed off by {completion?.signOffName}
            {completion?.signOffAt ? ` · ${formatWhen(completion.signOffAt)}` : ""}
          </p>
          {completion?.signOffSignatureUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={completion.signOffSignatureUrl}
              alt="Sign-off signature"
              className="mt-2 h-16 w-auto rounded bg-white"
            />
          )}
        </div>
      )}

      <div className="mt-5 border-t border-hairline pt-4">
        <p className="text-xs font-medium text-ink-2">Send the delivery receipt</p>
        <p className="mt-0.5 text-[11px] text-ink-3">
          Client opens a public page with photos and sign-off. No login.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              const form = new FormData();
              form.set("workOrderId", workOrder.id);
              if (contactName) form.set("contactName", contactName);
              if (contactEmail) form.set("contactValue", contactEmail);
              submit(sendDeliveryToClient, form, (result) => {
                if (result.sharePath) setSharePath(result.sharePath);
              });
            }}
            className={buttonClass("primary")}
          >
            <Send className="h-4 w-4" />
            {pending ? "Sending…" : "Create delivery link"}
          </button>
        </div>
        {sharePath && (
          <div className="mt-3 rounded-card bg-navy-tint px-4 py-3">
            <p className="text-sm font-medium text-navy-ink">Client delivery receipt</p>
            <p className="mt-1 break-all text-xs text-ink-2">{sharePath}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(shareUrl(sharePath));
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 1600);
                  } catch {
                    setCopied(false);
                  }
                }}
                className={buttonClass("soft", "text-xs")}
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy link"}
              </button>
              {contactEmail && (
                <a
                  href={`mailto:${contactEmail}?subject=${encodeURIComponent(
                    `Work complete ${workOrder.woNumber} — MTC Facility Solutions`
                  )}&body=${encodeURIComponent(`${packet}\n\nOpen your receipt:\n${shareUrl(sharePath)}`)}`}
                  className={buttonClass("primary", "text-xs")}
                >
                  <Mail className="h-3.5 w-3.5" />
                  Email client
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </Tile>
  );
}
