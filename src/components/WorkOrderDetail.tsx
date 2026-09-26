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
  ArrowRight,
  FileText,
  UserRoundCog,
  TrendingUp,
  MessageSquare,
  Paperclip,
  PenLine,
} from "lucide-react";
import type { CompletionRecord, Invoice, WorkOrder } from "@/types/work-order";
import type { WorkOrderQuote } from "@/lib/quote";
import {
  slaRisk,
  slaCountdown,
  nextStepLabel,
  nextStatusFor,
  vendorComplianceStatus,
  estimatedMargin,
  STATUS_LABEL,
} from "@/lib/domain";
import type { WorkOrderEvent, WorkOrderNote } from "@/lib/data/queries";
import { EstimatePanel } from "@/components/EstimatePanel";
import { WorkOrderThread } from "@/components/WorkOrderThread";
import { DeliveryPanel } from "@/components/DeliveryPanel";
import { WorkOrderSync } from "@/components/WorkOrderSync";
import { useAppData } from "@/components/AppDataProvider";
import { StatusBadge, PriorityBadge, ExceptionFlag, JobKindBadge } from "@/components/Badge";
import { PhaseProgressBar } from "@/components/PhaseProgressBar";
import { AssignVendorDrawer } from "@/components/AssignVendorDrawer";
import {
  changeStatus,
  raiseNte,
  recordQuoteDecision,
} from "@/lib/actions/work-orders";
import { useAction } from "@/components/useAction";
import {
  Tile,
  SectionHead,
  Pill,
  Field,
  Money,
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
  quote,
  estimateSharePath,
  invoiceSharePath,
  deliverySharePath,
}: {
  workOrder: WorkOrder;
  events: WorkOrderEvent[];
  notes: WorkOrderNote[];
  invoices: Invoice[];
  completion: CompletionRecord | null;
  quote: WorkOrderQuote | null;
  estimateSharePath: string | null;
  invoiceSharePath: string | null;
  deliverySharePath: string | null;
}) {
  const { siteById, accountForSite, vendorById } = useAppData();
  const { pending, submit, submitFields } = useAction();

  const site = siteById(wo.siteId);
  const account = accountForSite(wo.siteId);
  const vendor = vendorById(wo.vendorId);
  const risk = slaRisk(wo);
  const countdown = slaCountdown(wo);

  const awaitingDecision = wo.status === "quote_with_client";
  const vendorBlocked = vendor ? vendorComplianceStatus(vendor) === "expired" : false;
  const invoice = invoices[0];

  const nextStatus = nextStatusFor(wo.status);
  // New work orders need a vendor before they can be Assigned, so the primary
  // action becomes the dispatch drawer rather than a status button.
  const primaryIsDispatch = wo.status === "new" && !wo.vendorId;

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
              <JobKindBadge type={account?.type} />
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
                woNumber={wo.woNumber}
                description={wo.description}
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

          <DeliveryPanel
            workOrder={wo}
            completion={completion}
            contactEmail={site?.contactEmail ?? null}
            contactName={site?.contactName ?? null}
            initialSharePath={deliverySharePath}
          />

          <EstimatePanel
            workOrder={wo}
            quote={quote}
            contactEmail={site?.contactEmail ?? null}
            initialSharePath={estimateSharePath}
            initialInvoicePath={invoiceSharePath}
          />

          <WorkOrderThread
            workOrderId={wo.id}
            notes={notes}
            siteName={site?.name ?? null}
            sitePhone={site?.contactPhone ?? null}
            siteEmail={site?.contactEmail ?? null}
            vendorName={vendor?.name ?? null}
            vendorPhone={vendor?.phone ?? null}
            vendorEmail={vendor?.email ?? null}
            reporterName={wo.reporterName}
            reporterPhone={wo.reporterCell}
          />

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
          <WorkOrderSync
            workOrderId={wo.id}
            trackingNumber={wo.externalTrackingNumber}
            source={wo.source}
          />
          <Tile>
            <SectionHead title="Site" />
            <p className="mt-3 text-sm font-semibold">{site?.name}</p>
            <p className="text-xs text-ink-3">{account?.name}</p>
            <div className="mt-2">
              <JobKindBadge type={account?.type} />
            </div>

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
                  woNumber={wo.woNumber}
                  description={wo.description}
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
