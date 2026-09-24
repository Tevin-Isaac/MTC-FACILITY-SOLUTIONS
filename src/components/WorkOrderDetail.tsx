"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  MapPin,
  Phone,
  Clock,
  ShieldX,
} from "lucide-react";
import type { WorkOrder } from "@/types/work-order";
import {
  slaRisk,
  slaCountdown,
  nextStepLabel,
  phaseForStatus,
  vendorComplianceStatus,
  quoteLineItems,
  estimatedMargin,
} from "@/lib/domain";
import { useAppData } from "@/components/AppDataProvider";
import { StatusBadge, PriorityBadge, ExceptionFlag } from "@/components/Badge";
import { PhaseProgressBar } from "@/components/PhaseProgressBar";
import { AssignVendorDrawer } from "@/components/AssignVendorDrawer";

export function WorkOrderDetail({ initialWorkOrder }: { initialWorkOrder: WorkOrder }) {
  const [wo, setWo] = useState(initialWorkOrder);
  const { siteById, accountForSite, vendorById } = useAppData();
  const site = siteById(wo.siteId);
  const account = accountForSite(wo.siteId);
  const vendor = vendorById(wo.vendorId);
  const risk = slaRisk(wo);
  const countdown = slaCountdown(wo);
  const phase = phaseForStatus(wo.status);

  const inQuotePhase = phase === "Quote";
  const gatesReached = ["Completion", "Billing", "Closed"].includes(phase);
  const vendorBlocked = vendor ? vendorComplianceStatus(vendor) === "expired" : false;

  const repairTotal = wo.nte ?? 0;
  const repairLines = quoteLineItems(repairTotal);
  const replaceTotal = Math.round(repairTotal * 2.4);
  const replaceLines = quoteLineItems(replaceTotal);

  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      <Link
        href="/work-orders"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Work Orders
      </Link>

      <div className="rounded-2xl bg-surface shadow-sm ring-1 ring-black/5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tabular-nums">{wo.woNumber}</h1>
              {wo.legacyWoNumber && (
                <span className="text-xs text-muted">Legacy {wo.legacyWoNumber}</span>
              )}
              {wo.poNumber && (
                <span className="text-xs text-muted tabular-nums">· PO {wo.poNumber}</span>
              )}
              {wo.externalTrackingNumber && (
                <span className="text-xs text-muted tabular-nums">
                  · SC {wo.externalTrackingNumber}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-muted">{wo.description}</p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <PriorityBadge priority={wo.priority} />
              <StatusBadge status={wo.status} />
              <ExceptionFlag wo={wo} />
              {wo.clientExtendedStatus && (
                <span className="text-xs text-muted">
                  Client status: {wo.clientExtendedStatus}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            {countdown && (
              <span
                className={`inline-flex items-center gap-1.5 text-sm font-medium ${
                  risk === "breached"
                    ? "text-status-critical"
                    : risk === "at_risk"
                      ? "text-status-warning"
                      : "text-muted"
                }`}
              >
                <Clock className="h-4 w-4" />
                {countdown}
              </span>
            )}
            <button
              type="button"
              onClick={() =>
                toast.info("Not connected to a backend yet", {
                  description: `"${nextStepLabel(wo.status)}" will update the work order once real data is wired up.`,
                })
              }
              className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:bg-brand-navy-dark"
            >
              {nextStepLabel(wo.status)}
            </button>
          </div>
        </div>

        <div className="mt-5 border-t border-border pt-4">
          <PhaseProgressBar status={wo.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <div className="rounded-2xl bg-surface shadow-sm ring-1 ring-black/5 p-5">
            <h2 className="text-sm font-semibold">Completion gates</h2>
            <p className="mt-1 text-xs text-muted">
              Required before this work order can move to billing.
            </p>
            <ul className="mt-3 flex flex-col gap-2">
              {[
                { label: "Before photos", done: gatesReached },
                { label: "After photos", done: gatesReached },
                { label: "Manager sign-off", done: gatesReached },
                { label: "Purchase order on file", done: Boolean(wo.poNumber) },
              ].map((gate) => (
                <li key={gate.label} className="flex items-center gap-2 text-sm">
                  {gate.done ? (
                    <CheckCircle2 className="h-4 w-4 text-status-good" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted" />
                  )}
                  <span className={gate.done ? "" : "text-muted"}>{gate.label}</span>
                </li>
              ))}
            </ul>
          </div>

          {inQuotePhase && (
            <div className="rounded-2xl bg-surface shadow-sm ring-1 ring-black/5 p-5">
              <h2 className="text-sm font-semibold">Quote</h2>
              <p className="mt-1 text-xs text-muted">
                Two-option quoting for major equipment, per MTC policy.
              </p>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-border p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Option A · Repair
                  </p>
                  <p className="mt-2 text-2xl font-semibold tabular-nums">
                    ${repairTotal.toLocaleString()}
                  </p>
                  <ul className="mt-3 flex flex-col gap-1 text-xs text-muted">
                    <li>Labor: {repairLines.labor.toLocaleString()}</li>
                    <li>Materials: {repairLines.materials.toLocaleString()}</li>
                    <li>Trip charge: {repairLines.tripCharge.toLocaleString()}</li>
                  </ul>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Option B · Replace
                  </p>
                  <p className="mt-2 text-2xl font-semibold tabular-nums">
                    ${replaceTotal.toLocaleString()}
                  </p>
                  <ul className="mt-3 flex flex-col gap-1 text-xs text-muted">
                    <li>Labor: {replaceLines.labor.toLocaleString()}</li>
                    <li>Equipment: {replaceLines.materials.toLocaleString()}</li>
                    <li>Trip charge: {replaceLines.tripCharge.toLocaleString()}</li>
                  </ul>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted">
                Illustrative figures from mock data — real quoting wires up once the
                backend is connected.
              </p>
            </div>
          )}

          <div className="rounded-2xl bg-surface shadow-sm ring-1 ring-black/5 p-5">
            <h2 className="text-sm font-semibold">Activity</h2>
            <ul className="mt-3 flex flex-col gap-3 text-sm">
              <li className="flex gap-3">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-gold" />
                <div>
                  <p>
                    Work order created
                    {wo.source === "service_channel" && " via ServiceChannel"}
                  </p>
                  <p className="text-xs text-muted">
                    {new Date(wo.createdAt).toLocaleString()}
                  </p>
                </div>
              </li>
              {wo.nteHistory.map((inc, i) => (
                <li key={i} className="flex gap-3">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-gold" />
                  <div>
                    <p>
                      NTE increased to ${inc.amount.toLocaleString()} by {inc.approvedBy}
                    </p>
                    <p className="text-xs text-muted">
                      {new Date(inc.approvedAt).toLocaleString()} · via {inc.method}
                    </p>
                  </div>
                </li>
              ))}
              {vendor && (
                <li className="flex gap-3">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-gold" />
                  <div>
                    <p>Dispatched to {vendor.name}, vendor accepted</p>
                    <p className="text-xs text-muted">
                      {new Date(
                        new Date(wo.createdAt).getTime() + 20 * 60_000
                      ).toLocaleString()}
                    </p>
                  </div>
                </li>
              )}
              <li className="flex gap-3">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-border" />
                <div>
                  <p className="text-muted">Current status: {phase}</p>
                  <p className="text-xs text-muted">as of now</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="rounded-2xl bg-surface shadow-sm ring-1 ring-black/5 p-5">
            <h2 className="text-sm font-semibold">Site</h2>
            <p className="mt-2 text-sm font-medium">{site?.name}</p>
            <p className="text-xs text-muted">{account?.name}</p>
            <div className="mt-3 flex items-start gap-2 text-xs text-muted">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {site?.address}
            </div>
            {site?.contactName && (
              <div className="mt-2 flex items-center gap-2 text-xs text-muted">
                <Phone className="h-3.5 w-3.5 shrink-0" />
                {site.contactName} · {site.contactPhone}
              </div>
            )}
            {wo.reporterName && (
              <div className="mt-3 border-t border-border pt-3">
                <p className="text-xs font-medium text-muted">
                  Reporter <span className="font-normal">(internal only — never shown to vendors)</span>
                </p>
                <p className="mt-1 text-xs text-muted">
                  {wo.reporterName} · {wo.reporterCell}
                </p>
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-surface shadow-sm ring-1 ring-black/5 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Vendor</h2>
              <AssignVendorDrawer
                trade={wo.trade}
                currentVendorId={wo.vendorId}
                onAssign={(vendorId) => setWo((w) => ({ ...w, vendorId }))}
              />
            </div>
            {vendor ? (
              <>
                <p className="mt-2 text-sm font-medium">{vendor.name}</p>
                <p className="text-xs capitalize text-muted">
                  {vendor.trades.map((t) => t.replace(/_/g, " ")).join(", ")}
                </p>
                <p className="mt-1 text-xs tabular-nums text-muted">
                  ${vendor.rateCardHourly}/hr
                </p>
                {vendorBlocked && (
                  <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-2 text-xs font-medium text-status-critical">
                    <ShieldX className="h-3.5 w-3.5 shrink-0" />
                    COI/license expired — this vendor should not remain dispatched.
                  </p>
                )}
              </>
            ) : (
              <p className="mt-2 text-sm text-muted">Unassigned</p>
            )}
          </div>

          <div className="rounded-2xl bg-surface shadow-sm ring-1 ring-black/5 p-5">
            <h2 className="text-sm font-semibold">Money</h2>
            <dl className="mt-3 flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">NTE (vendor)</dt>
                <dd className="tabular-nums">
                  {wo.nte != null ? `$${wo.nte.toLocaleString()}` : "—"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">DNE (client)</dt>
                <dd className="tabular-nums">
                  {wo.dne != null ? `$${wo.dne.toLocaleString()}` : "—"}
                </dd>
              </div>
              <div className="flex justify-between border-t border-border pt-2">
                <dt className="font-medium">Status</dt>
                <dd className="font-medium">
                  {wo.nte === wo.dne ? "Within authorization" : "Review required"}
                </dd>
              </div>
              {wo.nte != null && (
                <>
                  <div className="flex justify-between border-t border-border pt-2 text-xs">
                    <dt className="text-muted">Est. vendor cost (18% markup)</dt>
                    <dd className="tabular-nums text-muted">
                      ${estimatedMargin(wo.nte).vendorCost.toLocaleString()}
                    </dd>
                  </div>
                  <div className="flex justify-between text-xs">
                    <dt className="text-muted">Est. margin</dt>
                    <dd className="tabular-nums text-status-good">
                      ${estimatedMargin(wo.nte).margin.toLocaleString()}
                    </dd>
                  </div>
                </>
              )}
            </dl>
            {wo.nteHistory.length > 0 && (
              <div className="mt-3 border-t border-border pt-3">
                <p className="text-xs font-medium text-muted">NTE increases</p>
                <ul className="mt-2 flex flex-col gap-2">
                  {wo.nteHistory.map((inc, i) => (
                    <li key={i} className="text-xs">
                      <span className="font-medium tabular-nums">
                        ${inc.amount.toLocaleString()}
                      </span>{" "}
                      <span className="text-muted">
                        approved by {inc.approvedBy} via {inc.method},{" "}
                        {new Date(inc.approvedAt).toLocaleString()}
                      </span>
                      {inc.note && <p className="mt-0.5 text-muted">{inc.note}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
