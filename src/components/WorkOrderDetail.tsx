"use client";

import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  MapPin,
  Phone,
  Clock,
  ShieldX,
  Plus,
  Lock,
  Eye,
  ArrowRight,
  FileText,
  UserRoundCog,
  TrendingUp,
  MessageSquare,
  Paperclip,
  PenLine,
} from "lucide-react";
import type { CompletionRecord, Invoice, WorkOrder } from "@/types/work-order";
import {
  slaRisk,
  slaCountdown,
  nextStepLabel,
  nextStatusFor,
  phaseForStatus,
  vendorComplianceStatus,
  quoteLineItems,
  estimatedMargin,
  STATUS_LABEL,
} from "@/lib/domain";
import type { WorkOrderEvent, WorkOrderNote } from "@/lib/data/queries";
import { useAppData } from "@/components/AppDataProvider";
import { StatusBadge, PriorityBadge, ExceptionFlag } from "@/components/Badge";
import { PhaseProgressBar } from "@/components/PhaseProgressBar";
import { AssignVendorDrawer } from "@/components/AssignVendorDrawer";
import {
  changeStatus,
  addNote,
  raiseNte,
  recordQuoteDecision,
  recordSignOff,
} from "@/lib/actions/work-orders";
import { useAction } from "@/components/useAction";
import {
  Tile,
  SectionHead,
  Pill,
  Field,
  Money,
  Empty,
  buttonClass,
  inputClass,
  labelClass,
} from "@/components/ui";

const EVENT_ICON: Record<string, typeof Clock> = {
  created: Plus,
  status_changed: ArrowRight,
  vendor_assigned: UserRoundCog,
  vendor_changed: UserRoundCog,
  nte_increased: TrendingUp,
  quote_submitted: FileText,
  quote_decided: FileText,
  note_added: MessageSquare,
  attachment_added: Paperclip,
  sign_off_recorded: PenLine,
};

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function WorkOrderDetail({
  workOrder: wo,
  events,
  notes,
  invoices,
  completion,
}: {
  workOrder: WorkOrder;
  events: WorkOrderEvent[];
  notes: WorkOrderNote[];
  invoices: Invoice[];
  completion: CompletionRecord | null;
}) {
  const { siteById, accountForSite, vendorById } = useAppData();
  const { pending, submit, submitFields } = useAction();

  const site = siteById(wo.siteId);
  const account = accountForSite(wo.siteId);
  const vendor = vendorById(wo.vendorId);
  const risk = slaRisk(wo);
  const countdown = slaCountdown(wo);
  const phase = phaseForStatus(wo.status);

  const awaitingDecision = wo.status === "quote_with_client";
  const inQuotePhase = phase === "Quote";
  const vendorBlocked = vendor ? vendorComplianceStatus(vendor) === "expired" : false;
  const gates = {
    before: (completion?.beforePhotoUrls.length ?? 0) > 0,
    after: (completion?.afterPhotoUrls.length ?? 0) > 0,
    signOff: Boolean(completion?.signOffAt),
    po: Boolean(wo.poNumber),
  };
  const invoice = invoices[0];

  const nextStatus = nextStatusFor(wo.status);
  // New work orders need a vendor before they can be Assigned, so the primary
  // action becomes the dispatch drawer rather than a status button.
  const primaryIsDispatch = wo.status === "new" && !wo.vendorId;

  const repairTotal = wo.nte ?? 0;
  const repairLines = quoteLineItems(repairTotal);
  const replaceTotal = Math.round(repairTotal * 2.4);
  const replaceLines = quoteLineItems(replaceTotal);

  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <Link
        href="/work-orders"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-ink-2 transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        Work orders
      </Link>

      <Tile>
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <h1 className="text-2xl font-semibold tracking-[-0.02em] tabular-nums">
                {wo.woNumber}
              </h1>
              {wo.legacyWoNumber && (
                <span className="text-xs text-ink-3">Legacy {wo.legacyWoNumber}</span>
              )}
              {wo.poNumber && (
                <span className="text-xs tabular-nums text-ink-3">· PO {wo.poNumber}</span>
              )}
              {wo.externalTrackingNumber && (
                <span className="text-xs tabular-nums text-ink-3">
                  · SC {wo.externalTrackingNumber}
                </span>
              )}
            </div>

            <p className="mt-2 max-w-2xl text-sm text-ink-2">{wo.description}</p>

            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <PriorityBadge priority={wo.priority} />
              <StatusBadge status={wo.status} />
              <ExceptionFlag wo={wo} />
              {wo.clientExtendedStatus && (
                <Pill tone="neutral">Client: {wo.clientExtendedStatus}</Pill>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2.5">
            {countdown && (
              <span
                className={`inline-flex items-center gap-1.5 text-sm font-medium ${
                  risk === "breached"
                    ? "text-critical"
                    : risk === "at_risk"
                      ? "text-warning"
                      : "text-ink-2"
                }`}
              >
                <Clock className="h-4 w-4" />
                {countdown}
              </span>
            )}

            {primaryIsDispatch ? (
              <AssignVendorDrawer
                workOrderId={wo.id}
                trade={wo.trade}
                currentVendorId={wo.vendorId}
                variant="primary"
              />
            ) : awaitingDecision ? (
              <Pill tone="warning" dot>
                Awaiting client decision
              </Pill>
            ) : nextStatus ? (
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  submitFields(changeStatus, {
                    workOrderId: wo.id,
                    toStatus: nextStatus,
                  })
                }
                className={buttonClass("primary")}
              >
                {pending ? "Saving…" : nextStepLabel(wo.status)}
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <Pill tone="neutral">{STATUS_LABEL[wo.status]} — no further steps</Pill>
            )}
            {!["closed", "complete_no_charge", "cancelled"].includes(wo.status) && (
              <div className="flex gap-2">
                {wo.status !== "on_hold" && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      submitFields(changeStatus, { workOrderId: wo.id, toStatus: "on_hold" })
                    }
                    className={buttonClass("ghost", "text-xs")}
                  >
                    Put on hold
                  </button>
                )}
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    submitFields(changeStatus, { workOrderId: wo.id, toStatus: "cancelled" })
                  }
                  className={buttonClass("ghost", "text-xs text-critical")}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6">
          <PhaseProgressBar status={wo.status} />
        </div>
      </Tile>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          {awaitingDecision && (
            <Tile>
              <SectionHead
                title="Record the client's decision"
                sub="The quote is with the client. Log what they said and who said it."
              />
              <form
                className="mt-4 flex flex-col gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  // FormData() alone drops the clicked button's value, and the
                  // approve/decline choice lives on that button.
                  const submitter = (e.nativeEvent as SubmitEvent)
                    .submitter as HTMLButtonElement | null;
                  if (submitter?.value) formData.set("decision", submitter.value);
                  submit(recordQuoteDecision, formData);
                }}
              >
                <input type="hidden" name="workOrderId" value={wo.id} />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelClass} htmlFor="decidedBy">
                      Who gave the decision
                    </label>
                    <input
                      id="decidedBy"
                      name="decidedBy"
                      required
                      placeholder="Facilities manager name"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="decisionNote">
                      Note (optional)
                    </label>
                    <input
                      id="decisionNote"
                      name="note"
                      placeholder="Approved option B over the phone"
                      className={inputClass}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    name="decision"
                    value="approved"
                    disabled={pending}
                    className={buttonClass("primary")}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Client approved
                  </button>
                  <button
                    type="submit"
                    name="decision"
                    value="declined"
                    disabled={pending}
                    className={buttonClass("outline")}
                  >
                    Client declined
                  </button>
                </div>
              </form>
            </Tile>
          )}

          <Tile>
            <SectionHead
              title="Completion gates"
              sub="All four must be satisfied before this work order can move to billing"
              trailing={
                <Pill tone={gates.signOff && gates.po ? "good" : "warning"}>
                  {gates.signOff && gates.po ? "Ready for billing" : "Outstanding"}
                </Pill>
              }
            />
            <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {[
                { label: "Before photos", done: gates.before },
                { label: "After photos", done: gates.after },
                { label: "Manager sign-off", done: gates.signOff },
                { label: "Purchase order on file", done: gates.po },
              ].map((gate) => (
                <li
                  key={gate.label}
                  className="flex items-center gap-2.5 rounded-card bg-sunken px-3.5 py-2.5 text-sm"
                >
                  {gate.done ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-good" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-ink-3" />
                  )}
                  <span className={gate.done ? "" : "text-ink-2"}>{gate.label}</span>
                </li>
              ))}
            </ul>
            {!gates.signOff && (
              <form
                className="mt-4 flex flex-col gap-2 sm:flex-row"
                onSubmit={(e) => {
                  e.preventDefault();
                  submit(recordSignOff, new FormData(e.currentTarget));
                }}
              >
                <input type="hidden" name="workOrderId" value={wo.id} />
                <input
                  name="signOffName"
                  required
                  placeholder="Manager name"
                  className={`${inputClass} sm:flex-1`}
                />
                <button type="submit" disabled={pending} className={buttonClass("soft")}>
                  {pending ? "Saving…" : "Record sign-off"}
                </button>
              </form>
            )}
            {gates.signOff && (
              <p className="mt-3 text-xs text-good">
                Signed off by {completion?.signOffName}{" "}
                {completion?.signOffAt
                  ? `· ${formatWhen(completion.signOffAt)}`
                  : ""}
              </p>
            )}
          </Tile>

          {inQuotePhase && (
            <Tile>
              <SectionHead
                title="Quote"
                sub="Two-option quoting for major equipment, per MTC policy"
              />
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  { title: "Option A · Repair", total: repairTotal, lines: repairLines, materialsLabel: "Materials" },
                  { title: "Option B · Replace", total: replaceTotal, lines: replaceLines, materialsLabel: "Equipment" },
                ].map((opt) => (
                  <div key={opt.title} className="rounded-card bg-sunken p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">
                      {opt.title}
                    </p>
                    <p className="mt-2 text-2xl font-semibold tabular-nums">
                      <Money amount={opt.total} />
                    </p>
                    <dl className="mt-3 flex flex-col gap-0.5 text-xs text-ink-2">
                      <div className="flex justify-between">
                        <dt>Labor</dt>
                        <dd className="tabular-nums">
                          <Money amount={opt.lines.labor} />
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>{opt.materialsLabel}</dt>
                        <dd className="tabular-nums">
                          <Money amount={opt.lines.materials} />
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Trip charge</dt>
                        <dd className="tabular-nums">
                          <Money amount={opt.lines.tripCharge} />
                        </dd>
                      </div>
                    </dl>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-ink-3">
                Lines always sum to the option total. Sending the quote to the client
                writes a real estimate record; their decision is stored on it.
              </p>
            </Tile>
          )}

          <Tile>
            <SectionHead
              title="Notes"
              sub="Internal notes stay with the team; client-visible notes are safe to share"
              trailing={<Pill tone="neutral">{notes.length}</Pill>}
            />

            <form
              className="mt-4"
              onSubmit={(e) => {
                const form = e.currentTarget;
                e.preventDefault();
                submit(addNote, new FormData(form), () => form.reset());
              }}
            >
              <input type="hidden" name="workOrderId" value={wo.id} />
              <textarea
                name="body"
                required
                rows={2}
                placeholder="Called the store, tech is 20 minutes out…"
                className={`${inputClass} resize-y`}
              />
              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                <label className="inline-flex items-center gap-2 text-xs text-ink-2">
                  <select name="visibility" className={`${inputClass} w-auto py-1.5`} defaultValue="internal">
                    <option value="internal">Internal only</option>
                    <option value="client">Client visible</option>
                  </select>
                </label>
                <button type="submit" disabled={pending} className={buttonClass("soft")}>
                  {pending ? "Saving…" : "Add note"}
                </button>
              </div>
            </form>

            {notes.length === 0 ? (
              <Empty title="No notes yet" hint="The first note you add will appear here." />
            ) : (
              <ul className="mt-4 flex flex-col gap-2">
                {notes.map((note) => (
                  <li key={note.id} className="rounded-card bg-sunken p-3.5">
                    <div className="flex items-center gap-2">
                      {note.visibility === "client" ? (
                        <Pill tone="navy">
                          <Eye className="h-3 w-3" />
                          Client visible
                        </Pill>
                      ) : (
                        <Pill tone="neutral">
                          <Lock className="h-3 w-3" />
                          Internal
                        </Pill>
                      )}
                      <span className="ml-auto text-[11px] text-ink-3">
                        {note.authorName ?? "Unknown"} · {formatWhen(note.createdAt)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm whitespace-pre-wrap">{note.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </Tile>

          <Tile>
            <SectionHead
              title="Activity"
              sub="Every status change, dispatch and approval, as it happened"
            />
            {events.length === 0 ? (
              <ul className="mt-4">
                <li className="flex gap-3">
                  <span className="mt-1.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy-tint text-navy-ink">
                    <Plus className="h-3.5 w-3.5" />
                  </span>
                  <div className="pb-1">
                    <p className="text-sm">
                      Work order created
                      {wo.source === "service_channel" && " via ServiceChannel"}
                    </p>
                    <p className="text-xs text-ink-3">{formatWhen(wo.createdAt)}</p>
                  </div>
                </li>
                <li className="mt-3 rounded-card bg-sunken px-3.5 py-3 text-xs text-ink-3">
                  This work order predates the activity log, so only its creation time
                  is known. Everything from here on is recorded.
                </li>
              </ul>
            ) : (
              <ol className="mt-4 flex flex-col gap-3.5">
                {events.map((event) => {
                  const Icon = EVENT_ICON[event.kind] ?? Circle;
                  return (
                    <li key={event.id} className="flex gap-3">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy-tint text-navy-ink">
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm">{event.summary}</p>
                        <p className="text-xs text-ink-3">
                          {event.actorName ?? "Unknown"} · {formatWhen(event.createdAt)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </Tile>
        </div>

        <div className="flex flex-col gap-4">
          <Tile>
            <SectionHead title="Site" />
            <p className="mt-3 text-sm font-semibold">{site?.name}</p>
            <p className="text-xs text-ink-3">{account?.name}</p>

            <div className="mt-3 flex items-start gap-2 text-xs text-ink-2">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-3" />
              {site?.address}
            </div>
            {site?.contactName && (
              <div className="mt-2 flex items-center gap-2 text-xs text-ink-2">
                <Phone className="h-3.5 w-3.5 shrink-0 text-ink-3" />
                {site.contactName} · {site.contactPhone}
              </div>
            )}

            {wo.reporterName && (
              <div className="mt-4 rounded-card bg-sunken p-3">
                <p className="flex items-center gap-1.5 text-[11px] font-medium text-ink-2">
                  <Lock className="h-3 w-3" />
                  Reporter — never shown to vendors
                </p>
                <p className="mt-1 text-xs text-ink-2">
                  {wo.reporterName} · {wo.reporterCell}
                </p>
              </div>
            )}
          </Tile>

          <Tile>
            <SectionHead
              title="Vendor"
              trailing={
                <AssignVendorDrawer
                  workOrderId={wo.id}
                  trade={wo.trade}
                  currentVendorId={wo.vendorId}
                />
              }
            />
            {vendor ? (
              <>
                <p className="mt-3 text-sm font-semibold">{vendor.name}</p>
                <p className="text-xs capitalize text-ink-3">
                  {vendor.trades.map((t) => t.replace(/_/g, " ")).join(", ")}
                </p>
                {vendor.rateCardHourly != null && (
                  <p className="mt-1 text-xs tabular-nums text-ink-2">
                    ${vendor.rateCardHourly}/hr
                  </p>
                )}
                {vendorBlocked && (
                  <p className="mt-3 flex items-start gap-1.5 rounded-card bg-critical-tint px-3 py-2.5 text-xs font-medium text-critical">
                    <ShieldX className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    COI or license expired — this vendor should not remain dispatched.
                  </p>
                )}
              </>
            ) : (
              <p className="mt-3 text-sm text-ink-3">No vendor dispatched yet.</p>
            )}
          </Tile>

          <Tile>
            <SectionHead title="Money" sub="NTE caps the vendor; DNE caps the client" />
            <dl className="mt-3">
              <Field label="NTE (vendor)" mono>
                <Money amount={wo.nte} />
              </Field>
              <Field label="DNE (client)" mono>
                <Money amount={wo.dne} />
              </Field>
              {wo.nte != null && (
                <>
                  <Field label="Est. vendor cost" mono>
                    <span className="text-ink-2">
                      <Money amount={estimatedMargin(wo.nte).vendorCost} />
                    </span>
                  </Field>
                  <Field label="Est. margin at 18%" mono>
                    <span className="font-medium text-good">
                      <Money amount={estimatedMargin(wo.nte).margin} />
                    </span>
                  </Field>
                </>
              )}
            </dl>

            <form
              className="mt-4 border-t border-hairline pt-4"
              onSubmit={(e) => {
                const form = e.currentTarget;
                e.preventDefault();
                submit(raiseNte, new FormData(form), () => form.reset());
              }}
            >
              <input type="hidden" name="workOrderId" value={wo.id} />
              <p className="text-xs font-medium text-ink-2">Raise the NTE</p>
              <p className="mt-0.5 text-[11px] text-ink-3">
                Phone approvals happen before any formal proposal, so log them here.
              </p>
              <div className="mt-2.5 flex flex-col gap-2">
                <input
                  name="amount"
                  type="number"
                  min="1"
                  step="1"
                  required
                  placeholder="New limit, e.g. 1200"
                  className={inputClass}
                />
                <input
                  name="approvedBy"
                  required
                  placeholder="Approved by"
                  className={inputClass}
                />
                <select name="method" defaultValue="phone" className={inputClass}>
                  <option value="phone">By phone</option>
                  <option value="email">By email</option>
                  <option value="sms">By text</option>
                </select>
                <button type="submit" disabled={pending} className={buttonClass("soft")}>
                  <TrendingUp className="h-4 w-4" />
                  {pending ? "Saving…" : "Log increase"}
                </button>
              </div>
            </form>

            {invoice && (
              <div className="mt-4 rounded-card bg-sunken px-3.5 py-3">
                <p className="text-xs font-medium text-ink-2">Invoice {invoice.invoiceNumber}</p>
                <p className="mt-1 text-sm font-semibold tabular-nums">
                  <Money amount={invoice.amount} />
                  <span className="ml-2 text-xs font-medium capitalize text-ink-3">
                    {invoice.status}
                  </span>
                </p>
                {invoice.dueAt && (
                  <p className="mt-0.5 text-[11px] text-ink-3">
                    Due {new Date(invoice.dueAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}

            {wo.nteHistory.length > 0 && (
              <div className="mt-4 border-t border-hairline pt-4">
                <p className="text-xs font-medium text-ink-2">NTE history</p>
                <ul className="mt-2 flex flex-col gap-2">
                  {wo.nteHistory.map((inc, i) => (
                    <li key={i} className="text-xs">
                      <span className="font-semibold tabular-nums">
                        <Money amount={inc.amount} />
                      </span>{" "}
                      <span className="text-ink-3">
                        — {inc.approvedBy} via {inc.method}, {formatWhen(inc.approvedAt)}
                      </span>
                      {inc.note && <p className="mt-0.5 text-ink-3">{inc.note}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Tile>
        </div>
      </div>
    </div>
  );
}
