"use client";

import { useMemo, useState } from "react";
import { Copy, Check, Mail, Send, Save, Plus, Trash2 } from "lucide-react";
import type { WorkOrder } from "@/types/work-order";
import type { WorkOrderQuote } from "@/lib/quote";
import {
  DEFAULT_EXCLUSIONS,
  DEFAULT_INCURRED,
  DEFAULT_LEAD_TIME,
  DEFAULT_RESOLUTION,
  estimationReviewRequired,
  parseQuotePacket,
  quoteTotals,
} from "@/lib/quote";
import { saveEstimate, submitEstimateToClient, submitInvoiceToClient } from "@/lib/actions/estimates";
import { useAction } from "@/components/useAction";
import { QuoteDocument } from "@/components/QuoteDocument";
import { Tile, SectionHead, Pill, Money, FormField, inputClass, labelClass, buttonClass } from "@/components/ui";

type MaterialRow = { description: string; cost: string; side: "repair" | "replace" };

export function EstimatePanel({
  workOrder,
  quote,
  contactEmail,
  initialSharePath = null,
  initialInvoicePath = null,
}: {
  workOrder: WorkOrder;
  quote: WorkOrderQuote | null;
  contactEmail: string | null;
  initialSharePath?: string | null;
  initialInvoicePath?: string | null;
}) {
  const packet = parseQuotePacket(quote);
  const [optionType, setOptionType] = useState<"single" | "repair_vs_replace">(
    quote?.optionType ?? "single"
  );
  const [incurredNotes, setIncurredNotes] = useState(packet.incurredNotes || DEFAULT_INCURRED);
  const [incurredTripHours, setIncurredTripHours] = useState(String(packet.incurredTripHours || 1));
  const [incurredLaborHours, setIncurredLaborHours] = useState(String(packet.incurredLaborHours || 1));
  const [proposedTripHours, setProposedTripHours] = useState(String(packet.proposedTripHours || 2));
  const [proposedLaborHours, setProposedLaborHours] = useState(String(packet.proposedLaborHours || 2));
  const [tripRate, setTripRate] = useState(String(packet.tripRate || 115));
  const [laborRate, setLaborRate] = useState(String(packet.laborRate || 95));
  const [replaceHours, setReplaceHours] = useState(String(packet.replaceLaborHours || 4));
  const [replaceRate, setReplaceRate] = useState(String(packet.replaceRate || packet.laborRate || 95));
  const [resolution, setResolution] = useState(packet.resolution || DEFAULT_RESOLUTION);
  const [exclusions, setExclusions] = useState(packet.exclusions || DEFAULT_EXCLUSIONS);
  const [leadTime, setLeadTime] = useState(packet.leadTime || DEFAULT_LEAD_TIME);
  const [materials, setMaterials] = useState<MaterialRow[]>(
    packet.materials.map((row) => ({
      description: row.description,
      cost: row.cost ? String(row.cost) : "",
      side: row.side,
    }))
  );
  const [review1, setReview1] = useState(packet.reviewers[0] ?? "");
  const [review2, setReview2] = useState(packet.reviewers[1] ?? "");
  const [review3, setReview3] = useState(packet.reviewers[2] ?? "");
  const [sharePath, setSharePath] = useState<string | null>(initialSharePath);
  const [invoicePath, setInvoicePath] = useState<string | null>(initialInvoicePath);
  const [copied, setCopied] = useState(false);
  const { pending, submit } = useAction();

  const preview = useMemo(() => {
    const tr = Number(tripRate) || 0;
    const lr = Number(laborRate) || 0;
    const rr = Number(replaceRate) || lr;
    const incurred = (Number(incurredTripHours) || 0) * tr + (Number(incurredLaborHours) || 0) * lr;
    const proposed = (Number(proposedTripHours) || 0) * tr + (Number(proposedLaborHours) || 0) * lr;
    const replaceLabor = (Number(replaceHours) || 0) * rr;
    const repairMats = materials
      .filter((row) => row.side !== "replace")
      .reduce((sum, row) => sum + (Number(row.cost) || 0), 0);
    const replaceMats = materials
      .filter((row) => row.side === "replace")
      .reduce((sum, row) => sum + (Number(row.cost) || 0), 0);
    const repair = Math.round(incurred + proposed + repairMats);
    const replace = Math.round(incurred + (Number(proposedTripHours) || 0) * tr + replaceLabor + replaceMats);
    return { repair, replace, total: optionType === "repair_vs_replace" ? Math.max(repair, replace) : repair };
  }, [
    tripRate,
    laborRate,
    replaceRate,
    incurredTripHours,
    incurredLaborHours,
    proposedTripHours,
    proposedLaborHours,
    replaceHours,
    materials,
    optionType,
  ]);

  const reviewsNeeded = estimationReviewRequired(preview.total);

  function formData(): FormData {
    const form = new FormData();
    form.set("workOrderId", workOrder.id);
    form.set("optionType", optionType);
    form.set("incurredNotes", incurredNotes);
    form.set("incurredTripHours", incurredTripHours);
    form.set("incurredLaborHours", incurredLaborHours);
    form.set("proposedTripHours", proposedTripHours);
    form.set("proposedLaborHours", proposedLaborHours);
    form.set("tripRate", tripRate);
    form.set("laborRate", laborRate);
    form.set("replaceLaborHours", replaceHours);
    form.set("replaceLaborRate", replaceRate);
    form.set("resolution", resolution);
    form.set("exclusions", exclusions);
    form.set("leadTime", leadTime);
    form.set("review1", review1);
    form.set("review2", review2);
    form.set("review3", review3);
    for (const row of materials) {
      form.append("materialName", row.description);
      form.append("materialCost", row.cost);
      form.append("materialSide", row.side);
    }
    return form;
  }

  function absoluteShareUrl(path: string) {
    return `${window.location.origin}${path}`;
  }

  async function copy(path: string) {
    try {
      await navigator.clipboard.writeText(absoluteShareUrl(path));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  const savedTotals = quote ? quoteTotals(quote) : null;
  const closed = ["closed", "cancelled", "complete_no_charge"].includes(workOrder.status);

  return (
    <Tile>
      <SectionHead
        title="MTC quote"
        sub="Scope, incurred, resolution, materials, exclusions, lead time — the format that gets approved."
        trailing={
          quote ? (
            <Pill tone={quote.status === "approved" ? "good" : quote.status === "declined" ? "critical" : "navy"}>
              {quote.status}
            </Pill>
          ) : null
        }
      />

      <div className="mt-4 grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={() => setOptionType("single")}
          className={`rounded-card px-3 py-2.5 text-sm font-medium ${
            optionType === "single" ? "bg-navy text-white" : "bg-sunken text-ink-2"
          }`}
        >
          Single quote
        </button>
        <button
          type="button"
          onClick={() => setOptionType("repair_vs_replace")}
          className={`rounded-card px-3 py-2.5 text-sm font-medium ${
            optionType === "repair_vs_replace" ? "bg-navy text-white" : "bg-sunken text-ink-2"
          }`}
        >
          Repair vs replace
        </button>
      </div>

      <div className="mt-5 space-y-5">
        <section>
          <p className={labelClass}>1. Scope of work</p>
          <p className="rounded-card bg-sunken px-3.5 py-3 text-sm text-ink-2">{workOrder.description}</p>
          <p className="mt-1 text-[11px] text-ink-3">
            Copied from the client work order. Never change it.
          </p>
        </section>

        <section className="space-y-3">
          <p className={labelClass}>2. Incurred — what already happened</p>
          <textarea
            rows={3}
            value={incurredNotes}
            onChange={(event) => setIncurredNotes(event.target.value)}
            className={`${inputClass} resize-y`}
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <FormField label="Incurred trip hours" htmlFor="incurredTripHours">
              <input id="incurredTripHours" type="number" min="0" step="0.5" value={incurredTripHours} onChange={(e) => setIncurredTripHours(e.target.value)} className={inputClass} />
            </FormField>
            <FormField label="Incurred labor hours" htmlFor="incurredLaborHours">
              <input id="incurredLaborHours" type="number" min="0" step="0.5" value={incurredLaborHours} onChange={(e) => setIncurredLaborHours(e.target.value)} className={inputClass} />
            </FormField>
            <FormField label="Trip rate / hr" htmlFor="tripRate">
              <input id="tripRate" type="number" min="0" value={tripRate} onChange={(e) => setTripRate(e.target.value)} className={inputClass} />
            </FormField>
            <FormField label="Labor rate / hr / tech" htmlFor="laborRate">
              <input id="laborRate" type="number" min="0" value={laborRate} onChange={(e) => setLaborRate(e.target.value)} className={inputClass} />
            </FormField>
          </div>
        </section>

        <section className="space-y-3">
          <p className={labelClass}>3. Proposed resolution</p>
          <p className="text-[11px] text-ink-3">Numbered steps. The client should picture the work before they approve.</p>
          <textarea
            rows={6}
            value={resolution}
            onChange={(event) => setResolution(event.target.value)}
            className={`${inputClass} resize-y`}
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <FormField label="Proposed trip hours" htmlFor="proposedTripHours">
              <input id="proposedTripHours" type="number" min="0" step="0.5" value={proposedTripHours} onChange={(e) => setProposedTripHours(e.target.value)} className={inputClass} />
            </FormField>
            <FormField label="Proposed labor hours" htmlFor="proposedLaborHours">
              <input id="proposedLaborHours" type="number" min="0" step="0.5" value={proposedLaborHours} onChange={(e) => setProposedLaborHours(e.target.value)} className={inputClass} />
            </FormField>
            {optionType === "repair_vs_replace" && (
              <>
                <FormField label="Replace labor hours" htmlFor="replaceHours">
                  <input id="replaceHours" type="number" min="0" step="0.5" value={replaceHours} onChange={(e) => setReplaceHours(e.target.value)} className={inputClass} />
                </FormField>
                <FormField label="Replace labor rate" htmlFor="replaceRate">
                  <input id="replaceRate" type="number" min="0" value={replaceRate} onChange={(e) => setReplaceRate(e.target.value)} className={inputClass} />
                </FormField>
              </>
            )}
          </div>
        </section>

        <section className="space-y-3">
          <p className={labelClass}>4. Material breakdown</p>
          <p className="text-[11px] text-ink-3">
            Always break materials down. Do not bulk them together.
          </p>
          <div className="space-y-2">
            {materials.map((row, index) => (
              <div
                key={`${index}-${row.side}`}
                className={
                  optionType === "repair_vs_replace"
                    ? "grid grid-cols-[1fr_7rem_7rem_auto] gap-2"
                    : "grid grid-cols-[1fr_7rem_auto] gap-2"
                }
              >
                <input
                  value={row.description}
                  placeholder="300ft conduit"
                  onChange={(event) => {
                    const next = [...materials];
                    next[index] = { ...row, description: event.target.value };
                    setMaterials(next);
                  }}
                  className={inputClass}
                />
                {optionType === "repair_vs_replace" && (
                  <select
                    value={row.side}
                    onChange={(event) => {
                      const next = [...materials];
                      next[index] = { ...row, side: event.target.value === "replace" ? "replace" : "repair" };
                      setMaterials(next);
                    }}
                    className={inputClass}
                  >
                    <option value="repair">Repair</option>
                    <option value="replace">Replace</option>
                  </select>
                )}
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={row.cost}
                  placeholder="950"
                  onChange={(event) => {
                    const next = [...materials];
                    next[index] = { ...row, cost: event.target.value };
                    setMaterials(next);
                  }}
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => setMaterials(materials.filter((_, i) => i !== index))}
                  className="text-ink-3 hover:text-serious"
                  aria-label="Remove material"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setMaterials([...materials, { description: "", cost: "", side: "repair" }])}
            className={buttonClass("ghost", "text-xs")}
          >
            <Plus className="h-3.5 w-3.5" />
            Add material line
          </button>
        </section>

        <section>
          <p className={labelClass}>5. Exclusions</p>
          <textarea
            rows={3}
            value={exclusions}
            onChange={(event) => setExclusions(event.target.value)}
            className={`${inputClass} resize-y`}
          />
        </section>

        <section>
          <p className={labelClass}>6. Lead time</p>
          <textarea
            rows={2}
            value={leadTime}
            onChange={(event) => setLeadTime(event.target.value)}
            className={`${inputClass} resize-y`}
          />
        </section>

        <section className="rounded-card bg-gold-tint px-4 py-3">
          <p className={labelClass}>7. Rule of estimation</p>
          <p className="text-xs text-gold-deep">
            Over $10,000 — second opinion. Over $20,000 — second or third. Over $50,000 — three opinions. Required.
          </p>
          {reviewsNeeded > 0 && (
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <input value={review1} onChange={(e) => setReview1(e.target.value)} placeholder="Second opinion" className={inputClass} />
              {reviewsNeeded >= 2 && (
                <input value={review2} onChange={(e) => setReview2(e.target.value)} placeholder="Third opinion" className={inputClass} />
              )}
              {reviewsNeeded >= 3 && (
                <input value={review3} onChange={(e) => setReview3(e.target.value)} placeholder="Third opinion (required)" className={inputClass} />
              )}
            </div>
          )}
        </section>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <div className="rounded-card bg-sunken px-4 py-3">
          <p className="text-[11px] text-ink-3">{optionType === "repair_vs_replace" ? "Repair total" : "Quote total"}</p>
          <p className="text-2xl font-semibold tabular-nums">
            <Money amount={preview.repair} />
          </p>
        </div>
        {optionType === "repair_vs_replace" && (
          <div className="rounded-card bg-sunken px-4 py-3">
            <p className="text-[11px] text-ink-3">Replace total</p>
            <p className="text-2xl font-semibold tabular-nums">
              <Money amount={preview.replace} />
            </p>
          </div>
        )}
        {workOrder.dne != null && (
          <div className="rounded-card bg-gold-tint px-4 py-3">
            <p className="text-[11px] text-gold-deep">Client DNE</p>
            <p className="text-2xl font-semibold tabular-nums">
              <Money amount={workOrder.dne} />
            </p>
          </div>
        )}
      </div>

      {!closed && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" disabled={pending} onClick={() => submit(saveEstimate, formData())} className={buttonClass("soft")}>
            <Save className="h-4 w-4" />
            Save draft
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              submit(submitEstimateToClient, formData(), (result) => {
                if (result.sharePath) setSharePath(result.sharePath);
              })
            }
            className={buttonClass("primary")}
          >
            <Send className="h-4 w-4" />
            {pending ? "Sending…" : "Submit quote to client"}
          </button>
        </div>
      )}

      {sharePath && (
        <div className="mt-4 rounded-card bg-navy-tint px-4 py-3">
          <p className="text-sm font-medium text-navy-ink">Client quote link</p>
          <p className="mt-1 break-all text-xs text-ink-2">{sharePath}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => copy(sharePath)} className={buttonClass("soft", "text-xs")}>
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy link"}
            </button>
            {contactEmail && (
              <a
                href={`mailto:${contactEmail}?subject=${encodeURIComponent(
                  `Quote ${workOrder.woNumber} — MTC Facility Solutions`
                )}&body=${encodeURIComponent(
                  `Please review this quote and approve or decline:\n\n${absoluteShareUrl(sharePath)}`
                )}`}
                className={buttonClass("primary", "text-xs")}
              >
                <Mail className="h-3.5 w-3.5" />
                Email client
              </a>
            )}
          </div>
        </div>
      )}

      {quote && quote.lines.length > 0 && (
        <div className="mt-5 rounded-card border border-hairline px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">Client view</p>
          <div className="mt-3">
            <QuoteDocument scope={workOrder.description} quote={quote} optionLabel />
          </div>
        </div>
      )}

      <div className="mt-5 border-t border-hairline pt-4">
        <SectionHead title="Invoice" sub="After the work is approved or complete, send the invoice the same way." />
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              const form = new FormData();
              form.set("workOrderId", workOrder.id);
              form.set("amount", String(savedTotals?.repair || preview.repair || workOrder.dne || workOrder.nte || 0));
              submit(submitInvoiceToClient, form, (result) => {
                if (result.sharePath) setInvoicePath(result.sharePath);
              });
            }}
            className={buttonClass("gold")}
          >
            <Send className="h-4 w-4" />
            Create & submit invoice
          </button>
        </div>
        {invoicePath && (
          <div className="mt-3 rounded-card bg-gold-tint px-4 py-3">
            <p className="text-sm font-medium text-gold-deep">Client invoice link</p>
            <p className="mt-1 break-all text-xs text-ink-2">{invoicePath}</p>
            <button type="button" onClick={() => copy(invoicePath)} className={buttonClass("soft", "mt-2 text-xs")}>
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              Copy invoice link
            </button>
          </div>
        )}
      </div>
    </Tile>
  );
}
